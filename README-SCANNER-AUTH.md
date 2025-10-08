# 🔐 Sistema de Autenticación para Scanner

## ✅ Cambios Implementados

### 1. **Bug Arreglado: Validación de Tickets**
- ✅ El endpoint `/api/tickets/validate` ahora actualiza correctamente el status a `'used'` en la base de datos
- ✅ Se eliminó el código mock que simulaba tickets
- ✅ Ahora usa datos reales de la base de datos

### 2. **Sistema de Login para Operadores**
- ✅ Solo operadores autenticados pueden acceder a `/scan`
- ✅ Página de login en `/scan/login`
- ✅ Session management con cookies HTTP-only
- ✅ Botón de logout en la página de scan

### 3. **Tabla de Operadores**
- ✅ Nueva tabla `operators` en la base de datos
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Usuarios de ejemplo incluidos

---

## 🚀 Pasos para Activar el Sistema

### **PASO 1: Crear la Tabla de Operadores en Supabase**

1. Ve a tu proyecto en Supabase: https://supabase.com
2. Abre el **SQL Editor**
3. Copia y pega el contenido de: `scripts/create_operators_table.sql`
4. Ejecuta el script (botón "Run")
5. Verifica que se creó la tabla: 
   ```sql
   SELECT * FROM public.operators;
   ```

---

### **PASO 2: Reiniciar el Servidor**

```powershell
# Si el servidor está corriendo, detenlo (Ctrl+C) y reinicia:
pnpm dev
```

---

### **PASO 3: Probar el Sistema**

1. **Intenta acceder a `/scan`**
   - URL: http://localhost:3002/scan
   - Te redireccionará automáticamente a `/scan/login`

2. **Inicia sesión:**
   - Usuario: `admin`
   - Contraseña: `admin123`

3. **Escanea un ticket:**
   - Ahora solo podrás validar tickets estando logueado
   - El status se actualizará correctamente en la base de datos

4. **Cierra sesión:**
   - Presiona el botón "Salir" en la parte superior

---

## 👤 Usuarios Disponibles

Por defecto, el script crea 2 usuarios:

| Usuario | Contraseña | Nombre |
|---------|-----------|--------|
| `admin` | `admin123` | Administrador |
| `scanner1` | `admin123` | Scanner 1 |

⚠️ **IMPORTANTE:** Cambia estas contraseñas en producción!

---

## 🔑 Crear Nuevos Operadores

### Opción 1: Generar Hash de Contraseña

```powershell
node scripts/generate-password-hash.js tu_contraseña_aqui
```

Esto te dará un hash que puedes usar en el SQL.

### Opción 2: Ejecutar SQL en Supabase

```sql
INSERT INTO public.operators (username, password_hash, name, email, is_active)
VALUES (
  'nuevo_usuario',
  '$2b$10$hash_generado_aqui',
  'Nombre Completo',
  'email@example.com',
  true
);
```

---

## 🔒 Cómo Funciona la Seguridad

### Antes (Sin Seguridad):
```
Usuario escanea QR → Va a /scan?tkn=xxx → Valida ticket ❌
Cualquiera puede escanear desde su celular
```

### Ahora (Con Seguridad):
```
Usuario intenta /scan → Verifica sesión → Si no está logueado → Redirige a /scan/login
Solo operadores autenticados pueden validar tickets ✅
```

### Flujo de Autenticación:
1. Usuario va a `/scan`
2. La página verifica si hay sesión activa (cookie `operator_session`)
3. Si NO hay sesión → Redirige a `/scan/login`
4. Usuario ingresa credenciales
5. Si son correctas → Crea sesión (cookie HTTP-only, 8 horas)
6. Redirige a `/scan` con acceso completo

---

## 📊 Endpoints de Autenticación

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Iniciar sesión |
| `/api/auth/logout` | POST | Cerrar sesión |
| `/api/auth/verify` | GET | Verificar sesión activa |

---

## 🎯 Verificar que Todo Funciona

### Test 1: Login Correcto
```bash
# En PowerShell:
$body = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3002/api/auth/login -Method POST -Body $body -ContentType "application/json"
```

**Resultado esperado:** Status 200 + cookie de sesión

### Test 2: Login Incorrecto
```bash
$body = @{
    username = "admin"
    password = "wrongpassword"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3002/api/auth/login -Method POST -Body $body -ContentType "application/json"
```

**Resultado esperado:** Status 401 + mensaje de error

### Test 3: Validación de Ticket
1. Compra un ticket (genera QR)
2. Inicia sesión en `/scan/login`
3. Escanea el QR
4. Verifica en Supabase que el status cambió a `'used'`:
   ```sql
   SELECT id, attendee_name, status, used_at 
   FROM tickets 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

---

## ⚙️ Configuración de Sesión

En `app/api/auth/login/route.ts`:

```typescript
response.cookies.set('operator_session', sessionData, {
  httpOnly: true,              // No accesible desde JavaScript
  secure: process.env.NODE_ENV === 'production', // HTTPS en producción
  sameSite: 'strict',          // Protección contra CSRF
  maxAge: 60 * 60 * 8,        // 8 horas
  path: '/',
})
```

Para cambiar la duración de la sesión, modifica `maxAge`:
- `60 * 60 * 1` = 1 hora
- `60 * 60 * 8` = 8 horas (actual)
- `60 * 60 * 24` = 24 horas

---

## 🐛 Troubleshooting

### Problema: "No se puede acceder a /scan"
**Solución:** Asegúrate de haber ejecutado el script SQL en Supabase

### Problema: "Usuario o contraseña incorrectos"
**Solución:** Verifica que la tabla `operators` tenga datos:
```sql
SELECT username, name, is_active FROM operators;
```

### Problema: "La sesión expira muy rápido"
**Solución:** Aumenta `maxAge` en el endpoint de login

### Problema: "El ticket no se marca como 'used'"
**Solución:** 
1. Verifica que la columna `token_hash` existe en la tabla `tickets`
2. Revisa los logs en la terminal para ver errores

---

## 📝 Cambios en Producción

Antes de ir a producción:

1. ✅ Cambia todas las contraseñas de los operadores
2. ✅ Genera nuevos hashes con el script `generate-password-hash.js`
3. ✅ Actualiza los registros en la base de datos
4. ✅ Asegúrate de usar HTTPS (para cookies `secure: true`)
5. ✅ Considera usar JWT en lugar de cookies simples para mayor seguridad

---

## 🎉 ¡Listo!

Ahora tu sistema de scanner está protegido y solo los operadores autorizados pueden validar tickets.

Si necesitas ayuda o quieres agregar más funcionalidades (como roles, permisos, etc.), avísame! 🚀
