--- Update tickets table to support multi-attendee system
-- Run this in your Supabase SQL Editor

-- 1. Drop event_id dependency from tickets
DO $$ 
BEGIN
    ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_event_id_fkey;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

DROP INDEX IF EXISTS idx_tickets_event_id;

DO $$ 
BEGIN
    ALTER TABLE tickets DROP COLUMN IF EXISTS event_id;
EXCEPTION
    WHEN undefined_column THEN NULL;
END $$;

-- 2. Add attendee information columns
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS attendee_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS attendee_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS attendee_dni VARCHAR(20),
ADD COLUMN IF NOT EXISTS ticket_type_id UUID,
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- 3. Rename token_hash to token (for consistency)
DO $$ 
BEGIN
    ALTER TABLE tickets RENAME COLUMN token_hash TO token;
EXCEPTION
    WHEN undefined_column THEN NULL;
END $$;

-- 4. Update status check to include 'pending'
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
  CHECK (status IN ('valid', 'used', 'revoked', 'expired', 'pending'));

-- 5. Add foreign key for ticket_type_id
DO $$ 
BEGIN
    ALTER TABLE tickets 
    ADD CONSTRAINT tickets_ticket_type_id_fkey 
    FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 6. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tickets_attendee_email ON tickets(attendee_email);
CREATE INDEX IF NOT EXISTS idx_tickets_attendee_dni ON tickets(attendee_dni);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_id ON tickets(ticket_type_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tickets'
ORDER BY ordinal_position;
