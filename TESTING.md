# Scripts de Testing - Productora Envuelto

Este archivo contiene ejemplos de requests HTTP para probar todos los endpoints.

## 1. Crear Evento

```bash
curl -X POST http://localhost:3000/api/admin/events \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fiesta de Verano 2025",
    "description": "La mejor fiesta del año",
    "start_at": "2025-12-15T22:00:00Z",
    "end_at": "2025-12-16T06:00:00Z",
    "venue": "Club Palermo",
    "capacity": 500,
    "price": 8000,
    "currency": "ARS",
    "status": "active"
  }'
```

## 2. Listar Eventos

```bash
curl http://localhost:3000/api/admin/events?status=active
```

## 3. Obtener Evento por ID

```bash
curl http://localhost:3000/api/admin/events/[EVENT_ID]
```

## 4. Crear Orden (Comprar Entradas)

```bash
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "[EVENT_ID]",
    "buyer_email": "test@example.com",
    "buyer_name": "Juan Test",
    "quantity": 2
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "order_id": "uuid-aqui",
  "external_reference": "ORD-1234567890-abc",
  "amount": 16000,
  "currency": "ARS",
  "status": "paid",
  "tickets_generated": 2,
  "message": "Order created and tickets sent to email"
}
```

## 5. Validar Ticket

```bash
curl -X POST http://localhost:3000/api/tickets/validate \
  -H "Content-Type: application/json" \
  -d '{
    "tkn": "[TOKEN_UUID]",
    "deviceId": "test-device-123"
  }'
```

**Primera validación (éxito):**
```json
{
  "success": true,
  "outcome": "success",
  "ticket_id": "uuid-aqui",
  "used_at": "2025-10-08T12:34:56.789Z",
  "message": "Ticket validated successfully"
}
```

**Segunda validación (fallo):**
```json
{
  "success": false,
  "outcome": "already_used",
  "ticket_id": "uuid-aqui",
  "used_at": "2025-10-08T12:34:56.789Z",
  "message": "Ticket already used at 8/10/2025 9:34:56"
}
```

## 6. Mostrar Ticket (QR)

```bash
curl "http://localhost:3000/api/tickets/show?tkn=[TOKEN_UUID]"
```

**Respuesta:**
```json
{
  "ticket_id": "uuid-aqui",
  "status": "valid",
  "qr_code": "data:image/png;base64,...",
  "event": {
    "name": "Fiesta de Verano 2025",
    "venue": "Club Palermo",
    "start_at": "2025-12-15T22:00:00Z"
  },
  "metadata": {
    "ticket_number": 1,
    "total_tickets": 2
  }
}
```

## 7. Revocar Ticket

```bash
curl -X POST http://localhost:3000/api/tickets/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "[TICKET_ID]"
  }'
```

## 8. Listar Órdenes

```bash
# Todas las órdenes
curl http://localhost:3000/api/admin/orders

# Filtrar por email
curl "http://localhost:3000/api/admin/orders?email=test@example.com"

# Filtrar por status
curl "http://localhost:3000/api/admin/orders?status=paid"

# Filtrar por evento
curl "http://localhost:3000/api/admin/orders?event_id=[EVENT_ID]"
```

## 9. Buscar Tickets

```bash
# Todos los tickets
curl http://localhost:3000/api/admin/tickets

# Por email
curl "http://localhost:3000/api/admin/tickets?email=test@example.com"

# Por evento
curl "http://localhost:3000/api/admin/tickets?event_id=[EVENT_ID]"

# Por status
curl "http://localhost:3000/api/admin/tickets?status=valid"
```

## 10. Dashboard Stats

```bash
curl http://localhost:3000/api/dashboard/stats
```

**Respuesta:**
```json
{
  "total_sold": 10,
  "total_used": 5,
  "total_pending": 2,
  "total_revenue": 80000,
  "recent_validations": [
    {
      "id": "uuid",
      "outcome": "success",
      "validated_at": "2025-10-08T12:34:56Z",
      "ticket_id": "uuid"
    }
  ],
  "sales_by_event": [
    {
      "event_name": "Fiesta de Verano 2025",
      "sold": 10,
      "used": 5
    }
  ]
}
```

## 11. Export CSV

```bash
# Abre en navegador o usa wget/curl con output
curl "http://localhost:3000/api/admin/events/[EVENT_ID]/export-csv" -o tickets.csv
```

## Testing con JavaScript (Browser Console)

```javascript
// 1. Crear orden
const createOrder = async () => {
  const response = await fetch('/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: 'EVENT_ID_AQUI',
      buyer_email: 'test@example.com',
      buyer_name: 'Test User',
      quantity: 1
    })
  });
  const data = await response.json();
  console.log('Order created:', data);
  return data;
};

// 2. Validar ticket
const validateTicket = async (token) => {
  const response = await fetch('/api/tickets/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tkn: token,
      deviceId: 'test-browser-123'
    })
  });
  const data = await response.json();
  console.log('Validation result:', data);
  return data;
};

// 3. Obtener stats
const getStats = async () => {
  const response = await fetch('/api/dashboard/stats');
  const data = await response.json();
  console.log('Stats:', data);
  return data;
};

// Ejecutar
createOrder().then(order => {
  console.log('Order ID:', order.order_id);
});
```

## Test de Doble Escaneo (Node.js)

Crea archivo `test-double-scan.js`:

```javascript
const token = 'TU-TOKEN-AQUI';
const deviceId1 = 'device-1';
const deviceId2 = 'device-2';

const validate = async (deviceId) => {
  const response = await fetch('http://localhost:3000/api/tickets/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tkn: token, deviceId })
  });
  return response.json();
};

// Escaneos simultáneos
Promise.all([
  validate(deviceId1),
  validate(deviceId2)
]).then(([result1, result2]) => {
  console.log('Device 1:', result1);
  console.log('Device 2:', result2);
  console.log('One success, one failure:', 
    result1.success !== result2.success);
});
```

Ejecutar:
```bash
node test-double-scan.js
```

**Resultado esperado:**
- Uno devuelve `success: true`
- Otro devuelve `success: false, outcome: "already_used"`

## Verificar Database (Supabase SQL Editor)

```sql
-- Ver todos los eventos
SELECT * FROM events ORDER BY created_at DESC;

-- Ver órdenes con detalles
SELECT 
  o.*,
  e.name as event_name,
  COUNT(t.id) as ticket_count
FROM orders o
LEFT JOIN events e ON o.event_id = e.id
LEFT JOIN tickets t ON o.id = t.order_id
GROUP BY o.id, e.name
ORDER BY o.created_at DESC;

-- Ver validaciones por ticket
SELECT 
  v.*,
  t.status as ticket_status,
  o.buyer_email
FROM validations v
LEFT JOIN tickets t ON v.ticket_id = t.id
LEFT JOIN orders o ON t.order_id = o.id
ORDER BY v.validated_at DESC
LIMIT 20;

-- Estadísticas por evento
SELECT 
  e.name,
  e.capacity,
  COUNT(t.id) as sold,
  COUNT(CASE WHEN t.status = 'used' THEN 1 END) as used,
  COUNT(CASE WHEN t.status = 'valid' THEN 1 END) as available,
  SUM(o.amount) as revenue
FROM events e
LEFT JOIN orders o ON e.id = o.event_id AND o.status = 'paid'
LEFT JOIN tickets t ON o.id = t.order_id
GROUP BY e.id, e.name, e.capacity
ORDER BY e.created_at DESC;

-- Logs de email
SELECT 
  el.*,
  o.buyer_email,
  o.external_reference
FROM email_logs el
LEFT JOIN orders o ON el.order_id = o.id
ORDER BY el.created_at DESC
LIMIT 20;
```

## Limpiar Base de Datos (Reset para Testing)

**⚠️ CUIDADO: Esto elimina TODOS los datos**

```sql
-- Eliminar en orden por foreign keys
DELETE FROM validations;
DELETE FROM email_logs;
DELETE FROM tickets;
DELETE FROM payments;
DELETE FROM orders;
DELETE FROM events WHERE name LIKE '%Test%';
DELETE FROM webhook_events;

-- O truncate (más rápido, pero resetea IDs)
TRUNCATE validations, email_logs, tickets, payments, orders, webhook_events RESTART IDENTITY CASCADE;
```

## Troubleshooting

### Ver últimos logs
```bash
# Ver logs del servidor (terminal donde corre pnpm dev)
# Busca líneas como:
# - "Order created successfully"
# - "Ticket validated"
# - "Email sent successfully"
# - Errores en rojo
```

### Verificar tokens
```javascript
// En browser console en /t/show?tkn=...
const url = new URL(window.location.href);
const token = url.searchParams.get('tkn');
console.log('Token:', token);
console.log('Token length:', token?.length); // Debe ser 36 (UUID)
```

### Debug email
```sql
-- Ver por qué falló un email
SELECT * FROM email_logs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5;
```
