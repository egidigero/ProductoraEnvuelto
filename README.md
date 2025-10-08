# 🎫 Productora Envuelto - Sistema de Venta de Entradas

Sistema completo de venta de entradas con códigos QR, validación atómica y gestión de eventos.

## 🎯 Características

- ✅ **Venta de entradas** con pago simulado (listo para Mercado Pago)
- ✅ **Generación automática de QR** por cada entrada
- ✅ **Envío de emails** con QR adjuntos (SMTP Gmail)
- ✅ **Validación atómica** para prevenir doble escaneo
- ✅ **Escáner QR** con cámara, linterna y feedback visual
- ✅ **Dashboard administrativo** con estadísticas y gestión
- ✅ **Export CSV** de entradas por evento
- ✅ **Sistema de logs** (validaciones, emails, pagos)

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a SQL Editor y ejecuta el contenido de `scripts/setup_database.sql`
3. Copia tus credenciales desde Settings > API

### 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales:

```env
# Supabase (requerido)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# URL base (requerido)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# SMTP Gmail (opcional para pruebas)
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
```

#### Cómo obtener App Password de Gmail:

1. Habilita verificación en 2 pasos en tu cuenta de Google
2. Ve a https://myaccount.google.com/apppasswords
3. Genera una contraseña de aplicación
4. Usa esa contraseña (no tu contraseña normal)

### 4. Ejecutar en desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📋 Estructura del Proyecto

```
app/
├── page.tsx                    # Página pública de compra
├── success/page.tsx            # Confirmación de compra
├── scan/page.tsx              # Escáner de QR (staff)
├── dashboard/page.tsx         # Panel administrativo
├── t/show/page.tsx           # Mostrar ticket individual
└── api/
    ├── orders/create/         # Crear orden y tickets
    ├── tickets/
    │   ├── validate/          # Validación atómica
    │   ├── show/              # Mostrar QR
    │   └── revoke/            # Revocar ticket
    ├── admin/
    │   ├── events/            # CRUD eventos
    │   ├── orders/            # Listar órdenes
    │   └── tickets/           # Buscar tickets
    └── dashboard/stats/       # Estadísticas

lib/
├── types.ts                   # Tipos TypeScript
├── supabase-client.ts        # Cliente de Supabase
├── token-utils.ts            # Generación de tokens y QR
└── email-service.ts          # Envío de emails

scripts/
└── setup_database.sql        # Schema completo de DB
```

## 🗄️ Base de Datos

### Tablas principales:

- **users** - Usuarios del sistema (admin/staff/viewer)
- **events** - Eventos con capacidad y precio
- **orders** - Órdenes de compra
- **payments** - Registros de pago (Mercado Pago)
- **tickets** - Entradas con hash de token (no se guarda el token)
- **validations** - Log de validaciones (éxito/fallo)
- **webhook_events** - Eventos de webhook (idempotencia)
- **email_logs** - Log de envíos de email

### Seguridad:

- ✅ Solo se guarda el **hash SHA-256** del token, nunca el token original
- ✅ Validación **atómica** con `UPDATE ... WHERE status='valid'`
- ✅ Prevención de **doble escaneo** a nivel de base de datos
- ✅ **Idempotencia** en webhooks con tabla de eventos

## 🎫 Flujo de Compra

1. **Usuario** selecciona evento y cantidad
2. **Sistema** crea orden con status `pending`
3. **Mock de pago** aprueba inmediatamente (en producción: webhook de Mercado Pago)
4. **Sistema** genera N tickets con tokens únicos
5. **Sistema** crea QR para cada token
6. **Sistema** envía email con QR adjuntos
7. **Usuario** recibe email con links de respaldo

## 📱 Flujo de Validación

1. **Staff** abre `/scan` (escáner QR)
2. **Cámara** escanea código QR
3. **Sistema** extrae token del QR
4. **API** hace hash del token
5. **DB** ejecuta UPDATE atómico:
   ```sql
   UPDATE tickets 
   SET status='used', used_at=NOW()
   WHERE token_hash=$1 AND status='valid'
   RETURNING *;
   ```
6. Si retorna fila → ✅ **ÉXITO** (verde + vibración)
7. Si no retorna → ❌ **FALLO** (rojo + razón + vibración)

### Prevención de doble escaneo:

- ✅ El `UPDATE` solo afecta tickets con `status='valid'`
- ✅ Si dos dispositivos escanean simultáneamente:
  - Uno obtiene la fila (éxito)
  - El otro obtiene 0 filas (ya usado)
- ✅ Se loguea cada intento en la tabla `validations`

## 📊 Dashboard

Accede a `/dashboard` para:

- Ver **estadísticas** generales (vendidas, usadas, ingresos)
- Gestionar **eventos** (crear, editar, archivar)
- Ver **órdenes** con filtros
- **Buscar tickets** por email
- Ver **validaciones recientes**
- **Exportar CSV** de tickets por evento
- **Revocar** tickets manualmente

## 🔧 Configuración Adicional

### Mercado Pago (Producción)

1. Crea una aplicación en https://www.mercadopago.com.ar/developers
2. Agrega las credenciales a `.env.local`:
   ```env
   NEXT_PUBLIC_MP_PUBLIC_KEY=tu-public-key
   MP_ACCESS_TOKEN=tu-access-token
   ```
3. Configura webhook URL: `https://tu-dominio.com/api/webhooks/mercadopago`
4. Reemplaza el mock en `/api/orders/create` con integración real

### Dominios personalizados (Email)

Para mejorar deliverability:

1. Configura SPF record:
   ```
   v=spf1 include:_spf.google.com ~all
   ```
2. Configura DKIM en Gmail/Google Workspace
3. Configura DMARC record

## 🧪 Testing

### Crear un evento de prueba:

```bash
# El script setup_database.sql ya crea un evento de prueba
# O crea uno manualmente desde el dashboard
```

### Comprar entradas:

1. Ve a http://localhost:3000
2. Selecciona evento
3. Completa el formulario
4. Click "Ir a pagar" → se aprueba automáticamente
5. Revisa tu email (o spam)

### Validar entradas:

1. Ve a http://localhost:3000/scan
2. Permite acceso a cámara
3. Escanea el QR del email
4. Ver feedback verde (válido) o rojo (inválido)

### Ver estadísticas:

1. Ve a http://localhost:3000/dashboard
2. Revisa tabs: Eventos, Órdenes, Entradas, Validaciones

## 📦 Deploy

### Vercel (Recomendado)

```bash
pnpm install -g vercel
vercel
```

Configura las variables de entorno en Vercel dashboard.

### Otras plataformas

1. Build: `pnpm build`
2. Start: `pnpm start`
3. Configura variables de entorno según la plataforma

## 🐛 Troubleshooting

### Los emails no se envían

- Verifica que `SMTP_USER` y `SMTP_PASSWORD` estén configurados
- Usa App Password de Gmail, no tu contraseña normal
- Revisa la carpeta de spam
- Chequea logs en la tabla `email_logs`

### Los QR no escanean

- Verifica permisos de cámara en el navegador
- Usa HTTPS en producción (requerido para cámara)
- Prueba con diferente iluminación
- Verifica que el QR sea de alta calidad (400x400px)

### Doble escaneo no se previene

- Verifica que la tabla `tickets` tenga el constraint `UNIQUE(token_hash)`
- Chequea que el UPDATE use `WHERE status='valid'`
- Revisa logs en tabla `validations`

### Error de conexión a Supabase

- Verifica URLs y keys en `.env.local`
- Asegúrate que el proyecto de Supabase esté activo
- Verifica que las tablas existan (ejecuta setup_database.sql)

## 📝 Licencia

MIT

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor abre un issue o PR.

## 📧 Soporte

Para problemas o preguntas, abre un issue en GitHub.
