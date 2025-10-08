-- Remove event_id dependency from orders table
-- Run this in your Supabase SQL Editor

-- First, drop the foreign key constraint if it exists
DO $$ 
BEGIN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_event_id_fkey;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_orders_event_id;

-- Then, drop the event_id column if it exists
DO $$ 
BEGIN
    ALTER TABLE orders DROP COLUMN IF EXISTS event_id;
EXCEPTION
    WHEN undefined_column THEN NULL;
END $$;

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;
