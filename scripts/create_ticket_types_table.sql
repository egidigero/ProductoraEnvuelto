-- ============================================
-- TABLA: ticket_types
-- Descripción: Tipos de entradas/experiencias para cada evento
-- ============================================

CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_price DECIMAL(10,2) GENERATED ALWAYS AS (base_price + service_fee) STORED,
  capacity INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_capacity CHECK (capacity >= 0),
  CONSTRAINT positive_sold CHECK (sold_count >= 0),
  CONSTRAINT sold_not_exceed_capacity CHECK (sold_count <= capacity),
  CONSTRAINT positive_prices CHECK (base_price >= 0 AND service_fee >= 0)
);

-- Índices para mejor performance
CREATE INDEX idx_ticket_types_event_id ON ticket_types(event_id);
CREATE INDEX idx_ticket_types_status ON ticket_types(status);
CREATE INDEX idx_ticket_types_display_order ON ticket_types(display_order);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_ticket_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ticket_types_updated_at
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_types_updated_at();

-- Función para auto-actualizar sold_count cuando se crean tickets
CREATE OR REPLACE FUNCTION update_ticket_type_sold_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar sold_count cuando se crea un ticket válido
  IF TG_OP = 'INSERT' AND NEW.status IN ('valid', 'used') THEN
    UPDATE ticket_types 
    SET sold_count = sold_count + 1
    WHERE id = NEW.ticket_type_id;
    
    -- Auto-marcar como sold_out si se alcanza capacidad
    UPDATE ticket_types 
    SET status = 'sold_out'
    WHERE id = NEW.ticket_type_id 
    AND sold_count >= capacity 
    AND status = 'active';
  END IF;
  
  -- Decrementar sold_count si se revoca un ticket
  IF TG_OP = 'UPDATE' AND OLD.status IN ('valid', 'used') AND NEW.status = 'revoked' THEN
    UPDATE ticket_types 
    SET sold_count = GREATEST(0, sold_count - 1)
    WHERE id = NEW.ticket_type_id;
    
    -- Reactivar si hay cupo disponible
    UPDATE ticket_types 
    SET status = 'active'
    WHERE id = NEW.ticket_type_id 
    AND sold_count < capacity 
    AND status = 'sold_out';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Necesitamos agregar ticket_type_id a la tabla tickets
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_id ON tickets(ticket_type_id);

-- Trigger en tickets para actualizar sold_count
CREATE TRIGGER trigger_update_ticket_type_count
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_type_sold_count();

-- ============================================
-- DATOS DE EJEMPLO: Tipos de entradas para "Evento de Prueba"
-- ============================================

-- Primero obtenemos el ID del evento de prueba
DO $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Buscar el evento de prueba
  SELECT id INTO v_event_id FROM events WHERE name = 'Evento de Prueba' LIMIT 1;
  
  IF v_event_id IS NOT NULL THEN
    -- Insertar tipos de entradas
    INSERT INTO ticket_types (
      event_id, 
      name, 
      description, 
      base_price, 
      service_fee,
      capacity, 
      status, 
      is_popular, 
      display_order,
      features
    ) VALUES
    (
      v_event_id,
      'General',
      'Acceso completo al evento',
      15000,
      850,
      200,
      'active',
      false,
      1,
      '["Acceso a todas las áreas", "Acceso hasta las 2 AM", "Guardarropa incluido"]'::jsonb
    ),
    (
      v_event_id,
      'VIP',
      'Experiencia premium exclusiva',
      25000,
      1250,
      50,
      'active',
      true,
      2,
      '["Acceso VIP exclusivo", "Barra premium ilimitada", "Mesa reservada", "Acceso hasta las 2 AM"]'::jsonb
    ),
    (
      v_event_id,
      'Early Bird',
      'Oferta por tiempo limitado',
      10000,
      850,
      30,
      'sold_out',
      false,
      3,
      '["Acceso general", "Acceso hasta 1 AM", "Entrada prioritaria"]'::jsonb
    );
    
    RAISE NOTICE 'Ticket types creados exitosamente para evento: %', v_event_id;
  ELSE
    RAISE NOTICE 'No se encontró el Evento de Prueba. Crea el evento primero.';
  END IF;
END $$;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista para ver disponibilidad de tickets por tipo
CREATE OR REPLACE VIEW ticket_types_availability AS
SELECT 
  tt.id,
  tt.event_id,
  e.name as event_name,
  tt.name as ticket_type_name,
  tt.base_price,
  tt.service_fee,
  tt.final_price,
  tt.capacity,
  tt.sold_count,
  tt.capacity - tt.sold_count as available,
  CASE 
    WHEN tt.capacity - tt.sold_count <= 0 THEN 'sold_out'
    WHEN tt.capacity - tt.sold_count <= 10 THEN 'low_stock'
    ELSE 'available'
  END as availability_status,
  ROUND((tt.sold_count::DECIMAL / NULLIF(tt.capacity, 0)) * 100, 2) as sold_percentage,
  tt.status,
  tt.is_popular
FROM ticket_types tt
JOIN events e ON e.id = tt.event_id
ORDER BY e.start_at DESC, tt.display_order ASC;

-- Comentarios para documentación
COMMENT ON TABLE ticket_types IS 'Tipos de entradas/experiencias disponibles para cada evento con control de cupos';
COMMENT ON COLUMN ticket_types.capacity IS 'Cantidad máxima de tickets de este tipo que se pueden vender';
COMMENT ON COLUMN ticket_types.sold_count IS 'Cantidad de tickets vendidos (actualizado automáticamente)';
COMMENT ON COLUMN ticket_types.service_fee IS 'Cargo por servicio que se suma al precio base';
COMMENT ON COLUMN ticket_types.final_price IS 'Precio final calculado automáticamente (base + servicio)';
COMMENT ON COLUMN ticket_types.features IS 'Array JSON con las características incluidas';
