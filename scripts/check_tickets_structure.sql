-- Check tickets table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
ORDER BY ordinal_position;

-- Check if we have token or token_hash
SELECT 
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'token') as has_token,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'token_hash') as has_token_hash;

-- Show sample data
SELECT id, token, token_hash, status, attendee_name
FROM tickets
LIMIT 5;
