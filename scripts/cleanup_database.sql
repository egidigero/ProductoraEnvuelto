-- ============================================
-- LIMPIEZA COMPLETA - SISTEMA DE UN SOLO EVENTO
-- Elimina tablas innecesarias y columnas event_id
-- ============================================

-- PASO 1: Hacer backup de datos importantes (ejecutar primero)
-- Copia esto y guárdalo antes de continuar:
/*
SELECT jsonb_agg(to_jsonb(t.*)) FROM orders t; -- Guarda esto
SELECT jsonb_agg(to_jsonb(t.*)) FROM tickets t; -- Guarda esto
*/

-- ============================================
-- PASO 2: ELIMINAR REFERENCIAS A event_id
-- ============================================

-- Eliminar columna event_id de orders (si existe)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE orders DROP COLUMN event_id CASCADE;
    RAISE NOTICE 'Columna event_id eliminada de orders';
  END IF;
END $$;

-- Eliminar columna event_id de tickets (si existe)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE tickets DROP COLUMN event_id CASCADE;
    RAISE NOTICE 'Columna event_id eliminada de tickets';
  END IF;
END $$;

-- ============================================
-- PASO 3: ELIMINAR TABLAS INNECESARIAS
-- ============================================

-- 1. Eliminar tabla events
DROP TABLE IF EXISTS events CASCADE;
RAISE NOTICE 'Tabla events eliminada';

-- 2. Eliminar event_ticket_stats (vista o tabla)
DROP VIEW IF EXISTS event_ticket_stats CASCADE;
DROP TABLE IF EXISTS event_ticket_stats CASCADE;
RAISE NOTICE 'event_ticket_stats eliminado';

-- 3. Eliminar webhook_events (si existe)
DROP TABLE IF EXISTS webhook_events CASCADE;
RAISE NOTICE 'webhook_events eliminado (si existía)';

-- 4. Eliminar validations (no se usa)
DROP TABLE IF EXISTS validations CASCADE;
RAISE NOTICE 'validations eliminado (si existía)';

-- ============================================
-- PASO 4: VERIFICAR ESTRUCTURA LIMPIA
-- ============================================

-- Ver tablas restantes con su tamaño
SELECT 
  schemaname,
  tablename as table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Ver estructura de orders (debe estar sin event_id)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Ver estructura de tickets (debe estar sin event_id, con ticket_type_id)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
ORDER BY ordinal_position;

-- ============================================
-- RESUMEN FINAL
-- ============================================

SELECT 
  '✅ Sistema limpio - Solo evento único' as status,
  COUNT(DISTINCT table_name) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Listar tablas finales
SELECT 
  '✅ ' || table_name as tables_remaining
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
/*
TABLAS ELIMINADAS:
❌ events - Ya no se usa, evento hardcodeado
❌ event_ticket_stats - Dependía de events
❌ webhook_events - Auditoría de webhooks (opcional)
❌ validations - No se usaba

TABLAS QUE QUEDARON:
✅ ticket_types - Tipos de entradas (General, VIP, Early Bird)
✅ orders - Compras realizadas
✅ tickets - Entradas con QR
✅ payments - Pagos de Mercado Pago
✅ email_logs - Log de emails
✅ users - Usuarios (si usas auth)

COLUMNAS ELIMINADAS:
❌ orders.event_id - Ya no se necesita
❌ tickets.event_id - Ya no se necesita

COLUMNAS QUE QUEDARON:
✅ tickets.ticket_type_id - Referencia a ticket_types
*/
