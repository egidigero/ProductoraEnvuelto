-- Updated database schema for multi-attendee system
CREATE TABLE IF NOT EXISTS ticket_purchases (
  id VARCHAR(255) PRIMARY KEY,
  -- Buyer information
  buyer_first_name VARCHAR(100) NOT NULL,
  buyer_last_name VARCHAR(100) NOT NULL,
  buyer_dni VARCHAR(8) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(20),
  -- Purchase details
  ticket_type VARCHAR(20) NOT NULL CHECK (ticket_type IN ('general', 'vip', 'early')),
  quantity INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  mercado_pago_id VARCHAR(255),
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New table for individual attendees
CREATE TABLE IF NOT EXISTS ticket_attendees (
  id SERIAL PRIMARY KEY,
  purchase_id VARCHAR(255) NOT NULL REFERENCES ticket_purchases(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dni VARCHAR(8) NOT NULL,
  email VARCHAR(255) NOT NULL,
  qr_code VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_buyer_dni ON ticket_purchases(buyer_dni);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_payment_status ON ticket_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_ticket_attendees_purchase_id ON ticket_attendees(purchase_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attendees_dni ON ticket_attendees(dni);
