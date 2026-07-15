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

Opcionales: `SMTP_*`, `TWILIO_*` (convocatorias).

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
