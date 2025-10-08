-- ============================================
-- SISTEMA SIMPLIFICADO: UN SOLO EVENTO
-- Sin tabla events, todo hardcodeado
-- ============================================

-- ============================================
-- TABLA: ticket_types (sin dependencia de events)
-- ============================================

CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX IF NOT EXISTS idx_ticket_types_status ON ticket_types(status);
CREATE INDEX IF NOT EXISTS idx_ticket_types_display_order ON ticket_types(display_order);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_ticket_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ticket_types_updated_at ON ticket_types;
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

-- Agregar ticket_type_id a la tabla tickets (si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'ticket_type_id'
  ) THEN
    ALTER TABLE tickets ADD COLUMN ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL;
    CREATE INDEX idx_tickets_ticket_type_id ON tickets(ticket_type_id);
  END IF;
END $$;

-- Trigger en tickets para actualizar sold_count
DROP TRIGGER IF EXISTS trigger_update_ticket_type_count ON tickets;
CREATE TRIGGER trigger_update_ticket_type_count
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_type_sold_count();

-- ============================================
-- DATOS DE EJEMPLO: Tipos de entradas para FIESTA X
-- ============================================

-- Limpiar datos existentes (opcional, comentar si quieres mantener datos)
-- TRUNCATE ticket_types CASCADE;

-- Insertar tipos de entradas
INSERT INTO ticket_types (
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
  'Early Bird',
  'Oferta por tiempo limitado',
  10000,
  850,
  30,
  'active',
  false,
  3,
  '["Acceso general", "Acceso hasta 1 AM", "Entrada prioritaria"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista para ver disponibilidad de tickets por tipo
CREATE OR REPLACE VIEW ticket_types_availability AS
SELECT 
  tt.id,
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
  tt.is_popular,
  tt.display_order
FROM ticket_types tt
ORDER BY tt.display_order ASC;

-- Comentarios para documentación
COMMENT ON TABLE ticket_types IS 'Tipos de entradas/experiencias para el evento único con control de cupos';
COMMENT ON COLUMN ticket_types.capacity IS 'Cantidad máxima de tickets de este tipo que se pueden vender';
COMMENT ON COLUMN ticket_types.sold_count IS 'Cantidad de tickets vendidos (actualizado automáticamente)';
COMMENT ON COLUMN ticket_types.service_fee IS 'Cargo por servicio que se suma al precio base';
COMMENT ON COLUMN ticket_types.final_price IS 'Precio final calculado automáticamente (base + servicio)';
COMMENT ON COLUMN ticket_types.features IS 'Array JSON con las características incluidas';

-- Verificar que todo esté creado correctamente
SELECT 
  'Ticket Types creados exitosamente' as message,
  COUNT(*) as total_types,
  SUM(capacity) as total_capacity,
  SUM(sold_count) as total_sold
FROM ticket_types;
