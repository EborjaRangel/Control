# Control de Dirigentes

Sistema de administración de dirigentes con arquitectura separada:

- **`back/`** — API REST (Express + Prisma + PostgreSQL)
- **`front/`** — Interfaz web (Next.js)

## Requisitos

- Node.js 20+
- PostgreSQL

## Configuración

1. Copia las variables de entorno:

```bash
cp back/.env.example back/.env
cp front/.env.example front/.env.local
```

2. Edita `back/.env` con tu `DATABASE_URL`.

3. Instala dependencias y aplica migraciones:

```bash
npm install
npm run db:migrate
```

## Desarrollo

Levanta backend (puerto 4000) y frontend (puerto 3000) a la vez:

```bash
npm run dev
```

O por separado:

```bash
npm run dev:back
npm run dev:front
```

Abre [http://localhost:3000](http://localhost:3000). El frontend redirige `/api/*` y `/uploads/*` al backend.

## Deploy (Railway + Vercel)

Monorepo: el backend va en **Railway** y el frontend en **Vercel**. Sube el proyecto a GitHub (carpeta `control` como raíz del repositorio).

### 1. Backend en Railway

1. Crea un proyecto en [Railway](https://railway.app) y conecta el repositorio.
2. Añade un servicio **PostgreSQL** y vincúlalo al servicio del API.
3. En el servicio del API, configura **Root Directory** = `back`.
4. Railway detectará `back/railway.toml` (migraciones en cada deploy).
5. Variables de entorno obligatorias:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | (automática al vincular PostgreSQL) |
| `JWT_SECRET` | Secreto largo y aleatorio |
| `FRONTEND_URL` | URL de Vercel, ej. `https://tu-app.vercel.app` |
| `PUBLIC_APP_URL` | Igual que `FRONTEND_URL` |
| `ADMIN_USERNAME` | Usuario admin inicial |
| `ADMIN_PASSWORD` | Contraseña admin inicial |

Opcionales: `SMTP_*` (recuperación de contraseña y convocatorias por correo), `TWILIO_*` (SMS/WhatsApp).

Para **recuperación de contraseña** en producción configura SMTP en Railway (requiere **Railway Pro** para conexión saliente a Gmail; ver sección abajo). Alternativa en cualquier plan: `RESEND_API_KEY` + `RESEND_FROM`.

6. Tras el primer deploy, crea el admin:

```bash
railway run npm run db:seed
```

7. **Fotos / uploads:** el disco de Railway es efímero. Monta un [Volume](https://docs.railway.app/guides/volumes) en la ruta `/app/uploads` para conservar imágenes entre deploys.

8. Copia la URL pública del API (ej. `https://control-api.up.railway.app`).

### 2. Frontend en Vercel

1. Importa el mismo repositorio en [Vercel](https://vercel.com).
2. **Root Directory** = `front`.
3. Variables de entorno:

| Variable | Valor |
|----------|-------|
| `API_PROXY_URL` | URL del API en Railway (sin `/` final) |
| `NEXT_PUBLIC_APP_URL` | URL de Vercel, ej. `https://tu-app.vercel.app` |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Token de Mapbox |

4. Deploy. Vercel ejecutará `next build`; las peticiones a `/api/*` se redirigen al backend vía `next.config.ts`.

### 3. Verificación

- Backend: `https://tu-api.up.railway.app/health` → `{"ok":true}`
- Frontend: inicia sesión con el usuario admin creado en el seed.

Si cambias la URL del API en Railway, actualiza `API_PROXY_URL` en Vercel y vuelve a desplegar.

## Recuperación de contraseña (correo SMTP)

Flujo en producción:

1. El usuario ingresa su **correo registrado** en `/login/recuperar`.
2. El backend envía un correo con enlace válido 1 hora.
3. El usuario abre `/login/restablecer/[token]` y define una nueva contraseña.

### Gmail (recomendado para empezar)

1. Usa una cuenta Gmail o Google Workspace dedicada al sistema.
2. Activa **verificación en 2 pasos**: https://myaccount.google.com/security
3. Crea una **contraseña de aplicación**: https://myaccount.google.com/apppasswords
4. Configura estas variables (local `back/.env` y Railway):

| Variable | Ejemplo |
|----------|---------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `control@gmail.com` (correo completo) |
| `SMTP_PASS` | 16 caracteres sin espacios (contraseña de aplicación) |
| `SMTP_FROM` | `Control Coyoacán <control@gmail.com>` |

`SMTP_USER` y el correo dentro de `SMTP_FROM` deben coincidir.

`PUBLIC_APP_URL` y `FRONTEND_URL` deben ser la URL pública de Vercel (ej. `https://tu-app.vercel.app`) para que el enlace del correo apunte al frontend correcto.

### Prueba local antes del deploy

1. Completa `back/.env` con SMTP real.
2. Reinicia el backend (`npm run dev:back`).
3. Usa un correo que exista en la ficha de un dirigente activo.
4. Revisa bandeja de entrada y spam.

Modo desarrollo sin correo (solo pruebas): `SMTP_DEV_LOG=true` en `back/.env`. Muestra el enlace en pantalla; **no uses esto en Railway/Vercel**.

### Variables en Railway (backend)

Además de `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PUBLIC_APP_URL`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=contraseña-de-aplicacion-16-chars
SMTP_FROM=Control Coyoacán <tu-correo@gmail.com>
FRONTEND_URL=https://tu-app.vercel.app
PUBLIC_APP_URL=https://tu-app.vercel.app
NODE_ENV=production
```

### Railway Pro y SMTP

Railway **Hobby** bloquea SMTP saliente (puertos 25/465/587). Con **Railway Pro** puedes usar Gmail (`smtp.gmail.com:587`) con contraseña de aplicación.

Si defines `RESEND_API_KEY`, el backend usa **Resend** y no SMTP. Para forzar Gmail en producción, deja solo las variables `SMTP_*` en Railway.

Tras guardar variables → **Redeploy** del servicio en Railway (o `npm run env:sync-to-railway -w control-back` desde una máquina con `back/.env` configurado).

Verifica: `GET https://tu-api.up.railway.app/health` debe responder `"email": { "habilitado": true, "proveedor": "smtp" }`.

### Variables en Vercel (frontend)

```
API_PROXY_URL=https://tu-api.up.railway.app
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

### Deploy (push)

```bash
git add .
git commit -m "Recuperación de contraseña por correo SMTP"
git push origin main
```

Railway y Vercel despliegan automáticamente si el repo está conectado.

### Verificación en producción

1. `https://tu-api.up.railway.app/health` → `{"ok":true}`
2. Abre `https://tu-app.vercel.app/login/recuperar`
3. Ingresa un correo registrado en un dirigente
4. Recibe el correo, abre el enlace y cambia la contraseña
5. Inicia sesión con la nueva contraseña

## Estructura

```
control/
├── back/
│   ├── prisma/          # Esquema y migraciones
│   ├── src/
│   │   ├── routes/      # Endpoints REST
│   │   └── lib/         # Lógica de negocio
│   └── uploads/         # Fotos subidas
└── front/
    └── src/
        ├── app/         # Páginas Next.js
        └── components/  # UI
```
