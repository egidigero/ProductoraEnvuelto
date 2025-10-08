# 🚀 Guía de Setup Rápido - Productora Envuelto

## Paso 1: Instalar Dependencias - Listo

```bash
pnpm install
```

## Paso 2: Configurar Supabase

### 2.1 Crear Proyecto
1. Ve a [Supabase](https://supabase.com)
2. Click en "New Project"
3. Elige un nombre y región
4. Guarda la contraseña de la base de datos

### 2.2 Ejecutar SQL
1. Ve a SQL Editor en el panel de Supabase
2. Copia todo el contenido de `scripts/setup_database.sql`
3. Pega y ejecuta (Run)
4. Verifica que todas las tablas se crearon correctamente

### 2.3 Obtener Credenciales
1. Ve a Settings > API
2. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (¡no expongas públicamente!)

## Paso 3: Configurar Variables de Entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local`:

```env
# REQUERIDO - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# REQUERIDO - Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# OPCIONAL - SMTP (puedes saltear para pruebas iniciales)
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

## Paso 4: Configurar Gmail (Opcional)

### Opción A: Sin Email (para testing rápido)
- Deja `SMTP_USER` y `SMTP_PASSWORD` vacíos
- Los emails fallarán pero el sistema funcionará
- Los QR se pueden acceder desde el link en la consola

### Opción B: Con Gmail
1. Habilita **verificación en 2 pasos** en tu cuenta de Google
2. Ve a https://myaccount.google.com/apppasswords
3. Selecciona "App" → "Mail", "Device" → "Other"
4. Ingresa nombre: "Productora Envuelto"
5. Copia la contraseña de 16 caracteres
6. Pega en `SMTP_PASSWORD` (sin espacios)

⚠️ **IMPORTANTE**: Usa la App Password, NO tu contraseña de Gmail normal.

## Paso 5: Ejecutar en Desarrollo

```bash
pnpm dev
```

Abre: http://localhost:3000

## Paso 6: Crear Evento de Prueba

### Opción A: Usar evento pre-creado
El script SQL ya creó un "Evento de Prueba" → Ve al home y deberías verlo

### Opción B: Crear manualmente
1. Ve a http://localhost:3000/dashboard
2. Tab "Eventos"
3. Agrega manualmente desde Supabase o crea un endpoint POST

## Paso 7: Probar Compra

1. Ve a http://localhost:3000
2. Selecciona el evento
3. Completa:
   - Nombre: "Juan Pérez"
   - Email: tu-email@gmail.com (usa tu email real)
   - Cantidad: 1
4. Click "Ir a pagar"
5. Espera confirmación → Redirige a `/success`

## Paso 8: Verificar Email

1. Revisa tu bandeja de entrada (puede tardar 10-30 seg)
2. Si no llega, revisa **Spam/Correo no deseado**
3. Deberías ver:
   - Subject: "Tu entrada para Evento de Prueba"
   - Adjuntos: `ticket-1-ORD-xxxxx.png`
   - Links alternativos en el cuerpo

## Paso 9: Probar Validación

### Opción A: Escanear con Cámara
1. Ve a http://localhost:3000/scan
2. Click "Iniciar escaneo"
3. Permite acceso a cámara
4. Apunta a QR del email
5. Ver resultado: ✅ Verde (válido) o ❌ Rojo (ya usado/inválido)

### Opción B: Abrir QR en Browser
1. Click en link del email: `https://localhost:3000/t/show?tkn=...`
2. Ver QR grande en pantalla
3. Escanear con otro dispositivo

### Opción C: Validar sin cámara
1. Extrae token del URL del QR
2. POST a `/api/tickets/validate` con:
   ```json
   {
     "tkn": "el-token-uuid",
     "deviceId": "test-device"
   }
   ```

## Paso 10: Verificar Dashboard

1. Ve a http://localhost:3000/dashboard
2. Verifica estadísticas:
   - Entradas Vendidas: 1
   - Entradas Usadas: 1 (si ya validaste)
   - Ingresos Totales: $5000 (o el precio del evento)
3. Tab "Órdenes": ver tu compra
4. Tab "Entradas": buscar por tu email
5. Tab "Validaciones": ver intentos de escaneo

## ✅ Checklist de Funcionamiento

- [ ] Dependencias instaladas sin errores
- [ ] Supabase configurado con todas las tablas
- [ ] Variables de entorno configuradas
- [ ] App corre en http://localhost:3000
- [ ] Evento visible en home
- [ ] Compra exitosa (redirect a /success)
- [ ] Email recibido con QR adjunto (o logs sin error si SMTP no configurado)
- [ ] QR visible en /t/show?tkn=...
- [ ] Escáner funciona en /scan
- [ ] Validación exitosa (verde) primera vez
- [ ] Segundo escaneo falla (rojo - ya usado)
- [ ] Dashboard muestra estadísticas correctas

## 🐛 Problemas Comunes

### "Missing Supabase environment variables"
- Verifica que `.env.local` existe
- Reinicia el servidor (`Ctrl+C` y `pnpm dev` de nuevo)

### Emails no llegan
- ¿SMTP configurado? Si no, es normal
- ¿Revisaste spam?
- ¿App Password correcto?
- Verifica logs en consola del servidor

### Cámara no funciona
- ¿Permiso otorgado?
- En producción necesitas HTTPS
- Prueba en Chrome/Edge (mejor soporte)

### Tickets no se crean
- Revisa consola del servidor
- Verifica que evento existe y está "active"
- Chequea logs en Supabase

### QR no valida
- ¿Token correcto en URL?
- ¿Ticket ya usado?
- Verifica en dashboard > Tab Entradas

## 📚 Próximos Pasos

1. **Integrar Mercado Pago**: Ver docs en README.md
2. **Configurar dominio**: Para producción
3. **Agregar autenticación**: NextAuth para dashboard
4. **Personalizar emails**: Editar templates en `lib/email-service.ts`
5. **PWA**: Configurar service worker para offline

## 🆘 Ayuda

Si algo no funciona:
1. Revisa logs de consola del navegador (F12)
2. Revisa logs del servidor (terminal donde corre `pnpm dev`)
3. Verifica datos en Supabase directamente
4. Abre un issue en GitHub
