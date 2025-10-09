-- ============================================
-- ÍNDICES CRÍTICOS PARA PERFORMANCE CON 700+ TICKETS
-- ============================================
-- Ejecutar este script en Supabase SQL Editor

-- 0. Crear tabla validations si no existe
CREATE TABLE IF NOT EXISTS validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'already_used', 'invalid', 'revoked', 'expired')),
  device_id TEXT,
  operator_id UUID,
  remote_addr TEXT,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Índice único en token (crítico para validación rápida)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_token ON tickets(token);

-- 2. Índice en status para filtrado rápido
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- 3. Índice en order_id para joins rápidos
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets(order_id);

-- 4. Índice compuesto para validación (token + status)
CREATE INDEX IF NOT EXISTS idx_tickets_token_status ON tickets(token, status) 
WHERE status = 'valid';

-- 5. Índice en orders para dashboard
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 6. Índice en validations para logs
CREATE INDEX IF NOT EXISTS idx_validations_ticket_id ON validations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_validations_validated_at ON validations(validated_at DESC);

-- Verificar índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('tickets', 'orders', 'validations')
ORDER BY tablename, indexname;
