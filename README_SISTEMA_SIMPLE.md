# 🎟️ Sistema de Tickets - Un Solo Evento

Sistema simplificado de venta de entradas para **un solo evento hardcodeado**. Sin necesidad de gestionar múltiples eventos, todo centrado en "FIESTA X - Opening Night".

## 🚀 Setup Rápido

### 1. Ejecuta el Script SQL

Conecta tu proyecto a Supabase y ejecuta:

```bash
scripts/create_ticket_types_simple.sql
```

Este script crea:
- ✅ Tabla `ticket_types` (sin dependencia de events)
- ✅ Triggers automáticos para `sold_count`
- ✅ 3 tipos de entradas de ejemplo (General, VIP, Early Bird)
- ✅ Vista `ticket_types_availability`

### 2. Datos Incluidos

El script crea automáticamente estos tipos de entrada:

| Tipo | Precio Base | Servicio | Total | Capacidad |
|------|-------------|----------|-------|-----------|
| General | $15,000 | $850 | $15,850 | 200 |
| VIP | $25,000 | $1,250 | $26,250 | 50 |
| Early Bird | $10,000 | $850 | $10,850 | 30 |

### 3. ¡Listo para Usar!

No necesitas configurar nada más:
- ❌ No hay variables de entorno para event_id
- ❌ No hay tabla de events
- ✅ Todo funciona con ticket_types directamente

```bash
pnpm dev
```

## 📊 Funcionalidades

### Landing Page (`/`)
- ✅ Carga dinámicamente tipos de tickets desde Supabase
- ✅ Muestra disponibilidad en tiempo real
- ✅ Badge "Más Popular" automático
- ✅ Alerta cuando quedan < 10 entradas
- ✅ Marca "AGOTADO" cuando capacity == sold_count
- ✅ Carrito de compras funcional

### Dashboard (`/dashboard`)
- ✅ Estadísticas en tiempo real:
  - Ingresos totales
  - Tickets vendidos/escaneados
  - Tipos de entrada con ocupación
- ✅ Gestión de ticket types (crear/editar/eliminar)
- ✅ Lista de compras y asistentes
- ✅ Generación de QR por asistente
- ✅ Tab "Experiencias" conectado a `ticket_types`

### Scanner (`/scan`)
- ✅ Escaneo de QR codes
- ✅ Validación de tickets
- ✅ Marca automática de entrada

## 🔧 APIs Disponibles

### `GET /api/ticket-types`
Obtiene todos los tipos de entrada (sin parámetros).

**Respuesta:**
```json
{
  "success": true,
  "ticket_types": [
    {
      "id": "uuid",
      "name": "General",
      "base_price": 15000,
      "service_fee": 850,
      "final_price": 15850,
      "capacity": 200,
      "sold_count": 45,
      "available": 155,
      "status": "active",
      "is_popular": false
    }
  ]
}
```

### `POST /api/ticket-types`
Crea un nuevo tipo de entrada.

**Body:**
```json
{
  "name": "Preventa",
  "description": "Entrada anticipada con descuento",
  "base_price": 12000,
  "service_fee": 850,
  "capacity": 100,
  "is_popular": false,
  "features": ["Acceso general", "Descuento 20%"]
}
```

### `PATCH /api/ticket-types/[id]`
Actualiza un tipo de entrada existente.

### `DELETE /api/ticket-types/[id]`
Elimina un tipo (solo si sold_count == 0).

### `POST /api/orders/create`
Crea una orden y genera tickets (sin `event_id`).

**Body:**
```json
{
  "ticket_type_id": "uuid-del-tipo",
  "buyer_email": "juan@email.com",
  "buyer_name": "Juan Pérez",
  "quantity": 2
}
```

### `GET /api/dashboard/stats-v2`
Estadísticas completas del dashboard.

**Respuesta:**
```json
{
  "success": true,
  "stats": {
    "totalSales": 25,
    "totalTickets": 50,
    "scannedTickets": 30,
    "revenue": 792500,
    "pendingTickets": 20,
    "revokedTickets": 0
  },
  "ticketTypes": [...],
  "purchases": [...]
}
```

## 🎨 Estructura de Datos

### `ticket_types`
```sql
id                UUID PRIMARY KEY
name              VARCHAR(100)
description       TEXT
base_price        DECIMAL(10,2)
service_fee       DECIMAL(10,2)
final_price       DECIMAL(10,2) GENERATED (base + service)
capacity          INTEGER
sold_count        INTEGER (auto-actualizado por trigger)
status            VARCHAR(20) (active/inactive/sold_out)
is_popular        BOOLEAN
display_order     INTEGER
features          JSONB
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### `orders` (sin event_id)
```sql
id                    UUID PRIMARY KEY
buyer_email           VARCHAR
buyer_name            VARCHAR
amount                DECIMAL(10,2)
currency              VARCHAR
quantity              INTEGER
status                VARCHAR
external_reference    VARCHAR
created_at            TIMESTAMPTZ
```

### `tickets` (sin event_id, con ticket_type_id)
```sql
id                UUID PRIMARY KEY
order_id          UUID → orders(id)
ticket_type_id    UUID → ticket_types(id)
token_hash        TEXT
status            VARCHAR (valid/used/revoked)
scanned_at        TIMESTAMPTZ
metadata          JSONB
created_at        TIMESTAMPTZ
```

## 🔄 Control de Cupos Automático

El sistema actualiza `sold_count` automáticamente mediante triggers:

1. **Crear ticket** → Incrementa `sold_count`
2. **Alcanzar capacidad** → Cambia `status` a `sold_out`
3. **Revocar ticket** → Decrementa `sold_count`
4. **Liberar cupo** → Cambia `status` a `active`

## 🎯 Uso del Dashboard

### Gestionar Tipos de Entrada

1. Ve al Dashboard → Tab "Experiencias"
2. Click "Nueva Experiencia"
3. Completa el formulario:
   - Nombre (ej: "Super VIP")
   - Precio (se calcula automáticamente con service_fee)
   - Capacidad máxima
   - Status (active/inactive)
4. Los cambios aparecen inmediatamente en la landing page

### Ver Estadísticas

- **Resumen**: Ingresos, tickets vendidos, escaneados
- **Tickets**: Lista de todas las compras con detalles
- **Experiencias**: Ocupación de cada tipo de entrada

## 🐛 Troubleshooting

### No se cargan los tipos de entrada
```bash
# Verificar que la tabla existe
SELECT * FROM ticket_types;

# Verificar que el trigger está activo
SELECT tgname FROM pg_trigger WHERE tgrelid = 'ticket_types'::regclass;
```

### Sold count no se actualiza
```bash
# Verificar el trigger en tickets
SELECT * FROM pg_trigger WHERE tgrelid = 'tickets'::regclass;

# Ver estado actual
SELECT * FROM ticket_types_availability;
```

### Error en el dashboard
El dashboard usa `/api/dashboard/stats-v2`. Verifica que la API responda:

```bash
curl http://localhost:3000/api/dashboard/stats-v2
```

## 📝 Notas Importantes

- **Evento hardcodeado**: "FIESTA X - Opening Night" en `app/api/orders/create/route.ts` línea 190
- **Sin tabla events**: Toda la lógica funciona sin necesidad de gestionar eventos
- **Triggers automáticos**: El `sold_count` se actualiza sin intervención manual
- **Capacidad dinámica**: El sistema previene sobreventas automáticamente
- **QR únicos**: Cada ticket tiene su QR code único con token hasheado

## 🔮 Futuro: Sistema Multi-Evento

Si más adelante quieres agregar múltiples eventos:

1. Restaura la tabla `events`
2. Agrega `event_id` de vuelta a `ticket_types` y `orders`
3. Usa `app/landing/page.tsx` con `/landing?event_id=xxx`
4. Restaura las validaciones de evento en las APIs

Por ahora, mantén todo simple con un solo evento. 🎉
