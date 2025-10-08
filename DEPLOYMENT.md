# 🚀 Deployment Guide - Productora Envuelto

## Opciones de Deployment

1. **Vercel** (Recomendado) - Gratis, fácil, optimizado para Next.js
2. **Railway** - Con PostgreSQL incluido
3. **Netlify** - Similar a Vercel
4. **VPS** (DigitalOcean, AWS, etc.) - Más control

---

## 🎯 Opción 1: Vercel (Recomendado)

### Pre-requisitos
- Cuenta en Vercel (gratis)
- Repositorio en GitHub/GitLab/Bitbucket
- Supabase configurado

### Paso 1: Preparar el proyecto

1. Asegúrate que todo funciona localmente
2. Commit y push a tu repositorio

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Paso 2: Deploy a Vercel

#### Opción A: Web Interface
1. Ve a [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Importa tu repositorio
4. Configuración automática (detecta Next.js)
5. Click "Deploy"

#### Opción B: CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### Paso 3: Configurar Variables de Entorno

En Vercel Dashboard:

1. Ve a tu proyecto
2. Settings → Environment Variables
3. Agrega todas las variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_BASE_URL=https://tu-proyecto.vercel.app
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

4. Redeploy para aplicar cambios

### Paso 4: Configurar Dominio (Opcional)

1. Settings → Domains
2. Agrega tu dominio custom
3. Configura DNS según instrucciones
4. Actualiza `NEXT_PUBLIC_BASE_URL`

### Paso 5: Configurar Webhook de Mercado Pago

1. En Mercado Pago dashboard, configura:
   - URL: `https://tu-proyecto.vercel.app/api/webhooks/mercadopago`
   - Eventos: `payment.created`, `payment.updated`

---

## 🚂 Opción 2: Railway

### Ventajas
- PostgreSQL incluido (alternativa a Supabase)
- Deploy automático desde GitHub
- Gratis con $5 de crédito inicial

### Pasos

1. Crea cuenta en [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Selecciona tu repositorio
4. Railway detecta Next.js automáticamente
5. Agrega variables de entorno en Settings
6. Deploy automático

Si usas PostgreSQL de Railway en vez de Supabase:
- Railway provee `DATABASE_URL`
- Adapta código para usar PostgreSQL directamente
- Ejecuta `setup_database.sql` en Railway Postgres

---

## 🌐 Opción 3: VPS (DigitalOcean, AWS, etc.)

### Pre-requisitos
- VPS con Ubuntu 22.04+
- Dominio apuntando al VPS
- SSL Certificate (Let's Encrypt)

### Paso 1: Preparar Servidor

```bash
# Conectar vía SSH
ssh root@tu-servidor-ip

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar nginx
apt install -y nginx

# Instalar certbot (SSL)
apt install -y certbot python3-certbot-nginx
```

### Paso 2: Clonar y Build

```bash
# Crear usuario para la app
adduser --disabled-password productora
su - productora

# Clonar repositorio
git clone https://github.com/tu-usuario/ProductoraEnvuelto.git
cd ProductoraEnvuelto

# Instalar dependencias
pnpm install

# Configurar .env.local
nano .env.local
# Pega tus variables de entorno

# Build
pnpm build
```

### Paso 3: Configurar PM2 (Process Manager)

```bash
# Instalar PM2
npm install -g pm2

# Crear ecosystem file
nano ecosystem.config.js
```

Contenido de `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'productora-envuelto',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/productora/ProductoraEnvuelto',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

```bash
# Iniciar app
pm2 start ecosystem.config.js

# Auto-start on reboot
pm2 startup
pm2 save
```

### Paso 4: Configurar Nginx

```bash
# Volver a root
exit

# Configurar nginx
nano /etc/nginx/sites-available/productora
```

Contenido:
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activar sitio
ln -s /etc/nginx/sites-available/productora /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test y reload
nginx -t
systemctl reload nginx

# Configurar SSL
certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### Paso 5: Firewall

```bash
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

---

## 🔧 Post-Deployment Checklist

### Seguridad
- [ ] HTTPS habilitado
- [ ] Variables de entorno configuradas correctamente
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no expuesta en código cliente
- [ ] Rate limiting configurado (Vercel automático)
- [ ] CORS configurado si es necesario

### Funcionalidad
- [ ] Home page carga eventos
- [ ] Compra de entradas funciona
- [ ] Emails se envían correctamente
- [ ] QR codes se generan
- [ ] Validación funciona en móvil
- [ ] Dashboard accesible
- [ ] Export CSV funciona

### Performance
- [ ] Images optimizadas (Next.js Image)
- [ ] API responses < 500ms
- [ ] Lighthouse score > 90

### Monitoreo
- [ ] Configurar Vercel Analytics (gratis)
- [ ] Configurar Sentry para errores
- [ ] Logs accesibles

---

## 📊 Monitoreo y Logs

### Vercel
- Dashboard → Logs
- Real-time logs durante deploy
- Runtime logs de funciones

### Railway
- Project → Deployments → View Logs
- Real-time streaming

### VPS (PM2)
```bash
# Ver logs
pm2 logs productora-envuelto

# Ver status
pm2 status

# Restart
pm2 restart productora-envuelto

# Monitoreo en tiempo real
pm2 monit
```

---

## 🔄 Updates y Maintenance

### Vercel (Automático)
1. Push a main branch
2. Vercel detecta y deploya automáticamente

### VPS (Manual)
```bash
ssh root@tu-servidor
su - productora
cd ProductoraEnvuelto

# Pull cambios
git pull origin main

# Rebuild
pnpm install
pnpm build

# Restart
exit
pm2 restart productora-envuelto
```

---

## 🐛 Troubleshooting Deployment

### Error: "Module not found"
```bash
# Limpiar y reinstalar
rm -rf node_modules .next
pnpm install
pnpm build
```

### Error: "Environment variable missing"
- Verifica que todas las env vars estén en Vercel/Railway
- Redeploy después de agregar vars

### Error: "CORS"
Si consumes API desde otro dominio, agrega en `next.config.mjs`:
```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
      ],
    },
  ];
}
```

### Emails no se envían en producción
- Verifica SMTP credentials
- Chequea que Gmail permita "less secure apps" (o usa App Password)
- Verifica logs en tabla `email_logs`
- Considera usar servicio dedicado (SendGrid, Resend)

### Cámara no funciona en móvil
- HTTPS es REQUERIDO para acceso a cámara
- Verifica permisos en browser
- Prueba en Chrome/Safari (mejor soporte)

---

## 📈 Scaling Considerations

### Base de Datos
- Supabase Free tier: 500MB, 2GB bandwidth
- Considera upgrade si tienes >10k tickets/mes
- Indices están optimizados en schema

### API
- Vercel Free: 100GB bandwidth, funciones serverless
- Railway: $5/mes crédito, escala automáticamente
- Considera caching con Redis si tienes mucho tráfico

### Emails
- Gmail SMTP: ~500 emails/día
- Para más volumen:
  - SendGrid: 100 emails/día gratis
  - Resend: 3000 emails/mes gratis
  - AWS SES: muy económico

---

## 🎉 Success!

Tu sistema de tickets está en producción. Monitorea los primeros días y ajusta según sea necesario.

**Próximos pasos:**
1. Testear compra real
2. Validar tickets en evento real
3. Recopilar feedback
4. Iterar y mejorar
