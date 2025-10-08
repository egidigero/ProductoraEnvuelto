-- Sistema profesional de tickets con QR y Mercado Pago
-- Basado en la especificación técnica proporcionada

-- Usuarios del panel
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','staff','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eventos (si manejan varios)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  venue TEXT,
  capacity INT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Órdenes internas (una por compra)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_dni TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  status TEXT NOT NULL CHECK (status IN ('pending','paid','refunded','canceled')),
  external_reference TEXT UNIQUE, -- lo mandamos a MP para correlacionar
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- Asistentes (información de cada persona que asiste)
CREATE TABLE attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT NOT NULL,
  email TEXT NOT NULL,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('general','vip','early_bird')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pagos (por si hay múltiples intentos)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  mp_payment_id TEXT UNIQUE, -- id de MP
  status TEXT NOT NULL,      -- approved, rejected, in_process
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tickets emitidos (1..n por orden)
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  attendee_id UUID NOT NULL REFERENCES attendees(id),
  event_id UUID REFERENCES events(id),
  token_hash TEXT NOT NULL UNIQUE, -- hash del token (no guardar token en claro)
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','used','revoked','expired')),
  used_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validaciones (auditoría de escaneos)
CREATE TABLE validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('success','already_used','invalid','revoked','expired')),
  device_id TEXT,
  operator_id UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  remote_addr INET
);

-- Webhook events (idempotencia)
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,  -- 'mp'
  event_id TEXT NOT NULL UNIQUE,
  payload JSONB,
  processed_at TIMESTAMPTZ
);

-- Email attempts (trazabilidad)
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','sent','failed')),
  provider TEXT NOT NULL DEFAULT 'smtp',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_orders_extref ON orders(external_reference);
CREATE INDEX idx_tickets_tokenhash ON tickets(token_hash);
CREATE INDEX idx_validations_ticket ON validations(ticket_id);
CREATE INDEX idx_attendees_order ON attendees(order_id);
CREATE INDEX idx_tickets_attendee ON tickets(attendee_id);

-- Insertar evento inicial
INSERT INTO events (name, description, start_at, venue, capacity) 
VALUES (
  'ON REPEAT - Premium Night Experience',
  'Una noche exclusiva en El Club De Los Pescadores',
  '2024-12-31 23:00:00-03:00',
  'El Club De Los Pescadores - Costanera Norte',
  500
);

-- Insertar usuario admin inicial
INSERT INTO users (email, name, role) 
VALUES ('admin@onrepeat.com', 'Admin ON REPEAT', 'admin');
