-- ============================================
-- CREATE OPERATORS TABLE
-- ============================================
-- Tabla para almacenar los operadores que pueden escanear tickets
-- Los operadores deben autenticarse para acceder a /scan

CREATE TABLE IF NOT EXISTS public.operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_operators_username ON public.operators(username);
CREATE INDEX idx_operators_active ON public.operators(is_active);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_operators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_operators_updated_at
BEFORE UPDATE ON public.operators
FOR EACH ROW
EXECUTE FUNCTION update_operators_updated_at();

-- ============================================
-- INSERT DEFAULT OPERATOR
-- ============================================
-- Usuario: admin
-- Contraseña: admin123
-- (IMPORTANTE: Cambiar esta contraseña en producción)
-- Password hash generado con bcrypt (10 rounds)

INSERT INTO public.operators (username, password_hash, name, email, is_active)
VALUES (
  'admin',
  '$2b$10$vAaMA8CKvjMsOzZPxvjF0umV.LSwYSMhE2KlUoK.Pm0uyxVeWWDmq',
  'Administrador',
  'admin@productoraenvuelto.com',
  true
)
ON CONFLICT (username) DO NOTHING;

-- Usuario adicional de ejemplo
INSERT INTO public.operators (username, password_hash, name, email, is_active)
VALUES (
  'scanner1',
  '$2b$10$vAaMA8CKvjMsOzZPxvjF0umV.LSwYSMhE2KlUoK.Pm0uyxVeWWDmq',
  'Scanner 1',
  'scanner1@productoraenvuelto.com',
  true
)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.operators IS 'Operadores autorizados para escanear y validar tickets';
COMMENT ON COLUMN public.operators.username IS 'Nombre de usuario único para login';
COMMENT ON COLUMN public.operators.password_hash IS 'Hash de la contraseña usando bcrypt';
COMMENT ON COLUMN public.operators.is_active IS 'Si false, el operador no puede iniciar sesión';
COMMENT ON COLUMN public.operators.last_login_at IS 'Última vez que el operador inició sesión';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Verificar que la tabla fue creada correctamente
SELECT 
  id,
  username,
  name,
  email,
  is_active,
  created_at
FROM public.operators
ORDER BY created_at DESC;
