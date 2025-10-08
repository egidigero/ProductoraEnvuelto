# Sistema de Ticket Types (Experiencias) - Guía Completa

## 📊 Estructura de la Base de Datos

### Tabla: `ticket_types`
Maneja los diferentes tipos de entradas para cada evento con control de cupos.

```sql
CREATE TABLE ticket_types (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  name VARCHAR(100),              -- "General", "VIP", "Early Bird"
  description TEXT,
  base_price DECIMAL(10,2),       -- Precio base
  service_fee DECIMAL(10,2),      -- Cargo por servicio
  final_price DECIMAL(10,2),      -- Calculado automáticamente (base + servicio)
  capacity INTEGER,               -- Cupo máximo
  sold_count INTEGER DEFAULT 0,   -- Vendidos (actualizado automáticamente)
  status VARCHAR(20),             -- 'active', 'inactive', 'sold_out'
  is_popular BOOLEAN,             -- Destacar como "MÁS ELEGIDA"
  display_order INTEGER,          -- Orden de visualización
  features JSONB,                 -- ["Feature 1", "Feature 2"]
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Campos Calculados Automáticos

- **final_price**: Se calcula automáticamente como `base_price + service_fee`
- **sold_count**: Se actualiza automáticamente cuando se crean/revocan tickets
- **status**: Se cambia a `sold_out` automáticamente cuando `sold_count >= capacity`

### Tabla: `tickets` (Modificada)
Se agregó el campo `ticket_type_id` para vincular cada ticket con su tipo.

```sql
ALTER TABLE tickets 
ADD COLUMN ticket_type_id UUID REFERENCES ticket_types(id);
```

## 🔧 APIs Disponibles

### 1. GET /api/ticket-types?event_id={uuid}
Obtiene todos los tipos de ticket para un evento.

**Response:**
```json
{
  "success": true,
  "ticket_types": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "name": "General",
      "description": "Acceso completo al evento",
      "base_price": 15000,
      "service_fee": 850,
      "final_price": 15850,
      "capacity": 200,
      "sold_count": 45,
      "available": 155,
      "availability_status": "available",
      "sold_percentage": 23,
      "status": "active",
      "is_popular": false,
      "display_order": 1,
      "features": [
        "Acceso a todas las áreas",
        "Acceso hasta las 2 AM",
        "Guardarropa incluido"
      ]
    }
  ]
}
```

### 2. POST /api/ticket-types
Crea un nuevo tipo de ticket.

**Request:**
```json
{
  "event_id": "uuid",
  "name": "VIP Gold",
  "description": "Experiencia premium",
  "base_price": 30000,
  "service_fee": 1500,
  "capacity": 30,
  "status": "active",
  "is_popular": true,
  "display_order": 1,
  "features": [
    "Acceso VIP",
    "Barra premium",
    "Mesa reservada"
  ]
}
```

### 3. PATCH /api/ticket-types/[id]
Actualiza un tipo de ticket existente.

**Campos permitidos:**
- name
- description
- base_price
- service_fee
- capacity (debe ser >= sold_count)
- status
- is_popular
- display_order
- features

**Validaciones:**
- No se puede reducir capacidad por debajo de los tickets ya vendidos
- Precios deben ser no negativos

### 4. DELETE /api/ticket-types/[id]
Elimina un tipo de ticket.

**Restricciones:**
- Solo se pueden eliminar tipos sin tickets vendidos
- Si tiene tickets vendidos, usar PATCH para cambiar status a 'inactive'

### 5. POST /api/orders/create (Modificado)
Ahora requiere `ticket_type_id`.

**Request:**
```json
{
  "event_id": "uuid",
  "ticket_type_id": "uuid",
  "buyer_email": "juan@email.com",
  "buyer_name": "Juan Pérez",
  "quantity": 2
}
```

**Validaciones automáticas:**
- Verifica que el ticket_type pertenezca al evento
- Verifica status del ticket_type (active/sold_out/inactive)
- Valida disponibilidad: `capacity - sold_count >= quantity`
- Calcula precio usando `final_price * quantity`
- Actualiza `sold_count` automáticamente via trigger

## 🎨 Landing Page Dinámica

### URL: `/landing?event_id={uuid}`

**Características:**
- Carga evento y ticket types dinámicamente desde Supabase
- Muestra badges de "MÁS ELEGIDA" para tipos populares
- Indica stock disponible y "¡Solo quedan X!" cuando es bajo
- Marca como "AGOTADO" los tipos sin cupo
- Formulario de compra con validación de cantidad disponible
- Muestra features de cada tipo con iconos
- Diseño responsive con gradientes y animaciones

## 📧 Email de Confirmación (Actualizado)

Ahora incluye el nombre del tipo de ticket:

```
Tu compra para FIESTA X - Opening Night ha sido confirmada.
Tipo de entrada: VIP
Cantidad: 2 entradas.
```

## 🚀 Flujo Completo de Compra

1. **Usuario visita**: `/landing?event_id=xxx`
2. **Sistema carga**: Evento + Ticket Types desde Supabase
3. **Usuario selecciona**: Tipo de ticket (ej: "VIP")
4. **Usuario completa**: Formulario con nombre, email, cantidad
5. **Sistema valida**: 
   - Ticket type está activo
   - Hay disponibilidad: `capacity - sold_count >= quantity`
6. **Sistema crea**: Orden + Payment + N Tickets con QR
7. **Trigger actualiza**: `sold_count` en `ticket_types`
8. **Trigger verifica**: Si `sold_count >= capacity` → status = 'sold_out'
9. **Sistema envía**: Email con QR y tipo de entrada
10. **Usuario recibe**: Confirmación por email

## 🔐 Control de Cupos Automático

### Triggers de Base de Datos

**1. Auto-actualizar sold_count**
```sql
-- Cuando se crea un ticket válido
UPDATE ticket_types 
SET sold_count = sold_count + 1
WHERE id = NEW.ticket_type_id;
```

**2. Auto-marcar como sold_out**
```sql
-- Cuando se alcanza la capacidad
UPDATE ticket_types 
SET status = 'sold_out'
WHERE sold_count >= capacity;
```

**3. Auto-reactivar si hay cupos**
```sql
-- Cuando se revoca un ticket
UPDATE ticket_types 
SET status = 'active'
WHERE sold_count < capacity 
AND status = 'sold_out';
```

## 📝 Datos de Ejemplo

El script SQL incluye 3 tipos de ticket de ejemplo para "Evento de Prueba":

1. **General** - $15,850 (200 cupos)
2. **VIP** - $26,250 (50 cupos, marcado como popular)
3. **Early Bird** - $10,850 (30 cupos, agotado)

## 🎯 Uso en el Dashboard

Actualizar la página de dashboard para:

1. **Crear tipos de ticket** cuando se crea un evento
2. **Ver disponibilidad** en tiempo real
3. **Editar precios** y capacidades
4. **Activar/desactivar** tipos de ticket
5. **Ver estadísticas** de ventas por tipo

## ⚡ Próximos Pasos

1. **Ejecutar SQL**: Correr `scripts/create_ticket_types_table.sql` en Supabase
2. **Probar API**: Crear ticket types para un evento
3. **Probar Landing**: Visitar `/landing?event_id={uuid}`
4. **Hacer compra**: Probar flujo completo con diferentes tipos
5. **Verificar email**: Confirmar que llega con el tipo correcto
6. **Ver cupos**: Verificar que sold_count se actualiza automáticamente

## 🐛 Troubleshooting

**Error: "ticket_type_id is required"**
- Actualizar llamadas a `/api/orders/create` para incluir `ticket_type_id`

**Error: "Only X tickets available"**
- El sistema está funcionando correctamente, no hay cupo suficiente
- Verificar `sold_count` vs `capacity` en la tabla

**Trigger no actualiza sold_count**
- Verificar que el trigger está creado: `\df update_ticket_type_sold_count`
- Verificar que los tickets se crean con `ticket_type_id` válido
