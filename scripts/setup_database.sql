-- ============================================
-- PRODUCTORA ENVUELTO - TICKET SYSTEM
-- Complete Database Schema for Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'staff', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  venue VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  price NUMERIC(10, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'ARS',
  status VARCHAR(20) CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_at ON events(start_at);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) DEFAULT 'ARS',
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  status VARCHAR(20) CHECK (status IN ('pending', 'paid', 'refunded', 'canceled')) DEFAULT 'pending',
  external_reference VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_buyer_email ON orders(buyer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_external_reference ON orders(external_reference);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  mp_payment_id VARCHAR(255) UNIQUE,
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')) DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_mp_payment_id ON payments(mp_payment_id);

-- ============================================
-- TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('valid', 'used', 'revoked', 'expired')) DEFAULT 'valid',
  used_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tickets_order_id ON tickets(order_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_token_hash ON tickets(token_hash);
CREATE INDEX idx_tickets_status ON tickets(status);

-- ============================================
-- VALIDATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  outcome VARCHAR(20) CHECK (outcome IN ('success', 'already_used', 'invalid', 'revoked', 'expired')) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  remote_addr VARCHAR(45),
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_validations_ticket_id ON validations(ticket_id);
CREATE INDEX idx_validations_device_id ON validations(device_id);
CREATE INDEX idx_validations_validated_at ON validations(validated_at DESC);
CREATE INDEX idx_validations_outcome ON validations(outcome);

-- ============================================
-- WEBHOOK_EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at);

-- ============================================
-- EMAIL_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('queued', 'sent', 'failed')) DEFAULT 'queued',
  provider VARCHAR(50) DEFAULT 'smtp',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_email_logs_order_id ON email_logs(order_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to automatically update paid_at when order status changes to 'paid'
CREATE OR REPLACE FUNCTION update_order_paid_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.paid_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_paid_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_paid_at();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- View for ticket statistics by event
CREATE OR REPLACE VIEW event_ticket_stats AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(t.id) as total_tickets,
  COUNT(CASE WHEN t.status = 'valid' THEN 1 END) as valid_tickets,
  COUNT(CASE WHEN t.status = 'used' THEN 1 END) as used_tickets,
  COUNT(CASE WHEN t.status = 'revoked' THEN 1 END) as revoked_tickets,
  SUM(CASE WHEN o.status = 'paid' THEN o.amount ELSE 0 END) as total_revenue,
  e.capacity,
  e.capacity - COUNT(t.id) as remaining_capacity
FROM events e
LEFT JOIN orders o ON e.id = o.event_id
LEFT JOIN tickets t ON o.id = t.order_id
WHERE e.status = 'active'
GROUP BY e.id, e.name, e.capacity;

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================

-- Insert default admin user (update email as needed)
INSERT INTO users (email, name, role) 
VALUES ('admin@productoraenvuelto.com', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample event for testing
INSERT INTO events (name, description, start_at, end_at, venue, capacity, price, status)
VALUES (
  'Evento de Prueba',
  'Este es un evento de prueba para validar el sistema',
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '30 days' + INTERVAL '6 hours',
  'Sala Principal',
  100,
  5000.00,
  'active'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Optional
-- ============================================

-- Enable RLS on all tables if using Supabase auth
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Add policies as needed for your auth setup
-- Example: Allow all authenticated users to read events
-- CREATE POLICY "Allow read events" ON events FOR SELECT USING (auth.role() = 'authenticated');
