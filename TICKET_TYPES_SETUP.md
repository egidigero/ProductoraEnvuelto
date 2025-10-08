# Sistema Dinámico de Ticket Types - Un Solo Evento

## 📋 Descripción

Este sistema permite manejar dinámicamente los tipos de entradas (experiencias) para un solo evento. Los tipos de entradas se cargan desde la base de datos con control de cupos en tiempo real.

## 🚀 Configuración Inicial

### 1. Crear la tabla `ticket_types` en Supabase

Ejecuta el script SQL en tu base de datos Supabase:

```bash
scripts/create_ticket_types_table.sql
```

Este script crea:
- Tabla `ticket_types` con control de capacidad
- Triggers automáticos para actualizar `sold_count`
- Vista `ticket_types_availability` para consultas
- Columna `ticket_type_id` en tabla `tickets`

### 2. Crear un evento en Supabase

Primero necesitas tener un evento creado en la tabla `events`. Puedes usar el dashboard de administración o insertar manualmente:

```sql
INSERT INTO events (name, description, venue, start_at, end_at, price, currency, status)
VALUES (
  'FIESTA X - Opening Night',
  'Una experiencia nocturna única con los mejores DJs internacionales',
  'El Club De Los Pescadores',
  '2025-03-15 22:00:00',
  '2025-03-16 06:00:00',
  15000,
  'ARS',
  'active'
)
RETURNING id;
```

**Guarda el ID del evento retornado.**

### 3. Configurar la variable de entorno

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edita `.env.local` y reemplaza el ID del evento:
   ```env
   NEXT_PUBLIC_EVENT_ID=aqui-va-el-id-del-evento-que-obtuviste
   ```

### 4. Crear tipos de entradas para tu evento

Puedes crear los tipos de entradas de dos formas:

#### Opción A: Manualmente en Supabase

```sql
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
-- General
(
  'tu-event-id-aqui',
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
-- VIP
(
  'tu-event-id-aqui',
  'VIP',
  'Experiencia premium exclusiva',
  25000,
  1250,
  50,
  'active',
  true,  -- Marcado como popular
  2,
  '["Acceso VIP exclusivo", "Barra premium ilimitada", "Mesa reservada", "Acceso hasta las 2 AM"]'::jsonb
),
-- Early Bird
(
  'tu-event-id-aqui',
  'Early Bird',
  'Oferta por tiempo limitado',
  10000,
  850,
  30,
  'active',
  false,
  3,
  '["Acceso general", "Acceso hasta 1 AM", "Entrada prioritaria"]'::jsonb
);
```

#### Opción B: Usando la API

```bash
curl -X POST http://localhost:3000/api/ticket-types \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "tu-event-id-aqui",
    "name": "General",
    "description": "Acceso completo al evento",
    "base_price": 15000,
    "service_fee": 850,
    "capacity": 200,
    "is_popular": false,
    "display_order": 1,
    "features": ["Acceso a todas las áreas", "Acceso hasta las 2 AM", "Guardarropa incluido"]
  }'
```

### 5. Reiniciar el servidor de desarrollo

```bash
pnpm dev
```

## 📊 Funcionalidades Implementadas

### ✅ Características Principales

1. **Carga Dinámica**: Los tipos de entradas se cargan automáticamente desde la base de datos
2. **Control de Cupos**: 
   - Muestra cantidad disponible en tiempo real
   - Marca automáticamente como "AGOTADO" cuando se alcanza la capacidad
   - Muestra alerta de "pocas entradas" cuando quedan menos de 10
3. **Actualización Automática**: El `sold_count` se actualiza automáticamente mediante triggers de base de datos
4. **Precios Calculados**: El `final_price` se calcula automáticamente (base_price + service_fee)
5. **Features Dinámicas**: Cada tipo de entrada puede tener sus propias características listadas
6. **Badge "Más Popular"**: Marca visualmente los tipos de entrada destacados
7. **Estados de Disponibilidad**: active, inactive, sold_out

### 🎨 UI Adaptativa

- **Loading State**: Muestra loader mientras carga los tipos de entrada
- **Empty State**: Mensaje cuando no hay tipos de entrada disponibles
- **Sold Out Badge**: Overlay visual para entradas agotadas
- **Low Stock Alert**: Badge de alerta cuando quedan pocas entradas
- **Contador en Tiempo Real**: Muestra X de Y entradas disponibles

## 🔧 APIs Disponibles

### GET `/api/ticket-types?event_id={uuid}`
Obtiene todos los tipos de entrada de un evento con información de disponibilidad.

**Respuesta:**
```json
{
  "ticket_types": [
    {
      "id": "uuid",
      "name": "General",
      "description": "Acceso completo",
      "base_price": 15000,
      "service_fee": 850,
      "final_price": 15850,
      "capacity": 200,
      "sold_count": 45,
      "available": 155,
      "status": "active",
      "is_popular": false,
      "features": ["Feature 1", "Feature 2"]
    }
  ]
}
```

### POST `/api/ticket-types`
Crea un nuevo tipo de entrada.

### PATCH `/api/ticket-types/[id]`
Actualiza un tipo de entrada existente.

### DELETE `/api/ticket-types/[id]`
Elimina un tipo de entrada (solo si no tiene ventas).

## 🎯 Próximos Pasos Recomendados

1. **Integrar el carrito con el flujo de compra**:
   - Actualizar `/api/orders/create` para usar `ticket_type_id`
   - Validar disponibilidad antes de confirmar compra
   
2. **Agregar componente de administración**:
   - Usar `components/ticket-types-manager.tsx` en el dashboard
   - Permitir crear/editar tipos de entrada desde la UI
   
3. **Notificaciones en tiempo real**:
   - Implementar WebSocket para actualizar disponibilidad en vivo
   - Mostrar notificación cuando quedan pocas entradas

4. **Sistema multi-evento** (futuro):
   - Cuando tengas múltiples eventos, puedes usar `app/landing/page.tsx`
   - Cada evento tendrá su propia URL: `/landing?event_id=xxx`

## 📝 Notas Importantes

- El ID del evento está configurado en `.env.local` como `NEXT_PUBLIC_EVENT_ID`
- Los triggers de base de datos actualizan `sold_count` automáticamente cuando se crean tickets
- El sistema previene ventas cuando se alcanza la capacidad
- Todos los precios se formatean usando la función `formatPrice()` para evitar errores de hidratación

## 🐛 Troubleshooting

### No se cargan los tipos de entrada
1. Verifica que `NEXT_PUBLIC_EVENT_ID` esté configurado correctamente en `.env.local`
2. Verifica que existan tipos de entrada para ese evento en la base de datos
3. Revisa la consola del navegador para ver errores de la API

### Error de hidratación con precios
- Usa la función `formatPrice()` de `lib/utils.ts` en lugar de `toLocaleString()`

### Sold count no se actualiza
- Verifica que el trigger `trigger_update_ticket_type_count` esté creado correctamente
- Asegúrate de que los tickets se creen con `ticket_type_id` válido
