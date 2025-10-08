-- Insert a default event for ticket sales
-- Run this in your Supabase SQL Editor

INSERT INTO events (name, description, start_at, end_at, venue, capacity, price, currency, status)
VALUES (
  'Evento General 2025',
  'Evento por defecto para sistema de tickets',
  '2025-12-31 20:00:00+00',  -- Fecha de inicio
  '2025-12-31 23:59:59+00',  -- Fecha de fin
  'Por definir',              -- Lugar
  10000,                      -- Capacidad
  0,                          -- Precio base (se usa el de ticket_types)
  'ARS',                      -- Moneda
  'active'                    -- Estado
)
ON CONFLICT DO NOTHING;

-- Verify the event was created
SELECT * FROM events;
