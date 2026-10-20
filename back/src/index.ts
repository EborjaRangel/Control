import "dotenv/config";
import compression from "compression";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { ensureUploadDir, uploadDiskInfo } from "./lib/upload-dir.js";
import { hidratarCatalogosElectorales } from "./lib/catalogos-electorales.js";
import {
  faltantesWhatsApp,
  obtenerConfigConvocatoria,
  smtpUsaValoresEjemplo,
  whatsAppListo,
  whatsAppProveedor,
} from "./lib/comunicacion/config.js";
import { resendConfigurado } from "./lib/comunicacion/email-resend.js";

const app = express();
const uploadDir = ensureUploadDir();
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(
  "/uploads",
  express.static(uploadDir, {
    maxAge: "7d",
    etag: true,
    lastModified: true,
    setHeaders(res) {
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    },
  }),
);
app.use("/api", routes);
app.get("/health", async (_req, res) => {
  const uploads = await uploadDiskInfo();
  const resend = resendConfigurado();
  const smtpConfigurado =
    Boolean(
      process.env.SMTP_HOST?.trim() &&
        process.env.SMTP_FROM?.trim() &&
        process.env.SMTP_USER?.trim() &&
        process.env.SMTP_PASS?.trim(),
    ) && !smtpUsaValoresEjemplo();
  const config = obtenerConfigConvocatoria();

  res.json({
    ok: true,
    uploads: {
      dir: uploads.dir,
      freeMb:
        uploads.freeBytes != null ? Math.round(uploads.freeBytes / (1024 * 1024)) : null,
      lowSpace: uploads.lowSpace,
    },
    email: {
      habilitado: config.email.habilitado && !smtpUsaValoresEjemplo(),
      proveedor: resend ? "resend" : smtpConfigurado ? "smtp" : null,
    },
    whatsapp: {
      habilitado: whatsAppListo(),
      proveedor: whatsAppProveedor(),
      from: config.whatsapp.from,
      faltantes: faltantesWhatsApp(),
    },
    sms: {
      habilitado: config.sms.habilitado,
      from: config.sms.from,
    },
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Error interno del servidor" });
  },
);

const port = Number(process.env.PORT ?? 4000);

async function start() {
  const catalogos = await hidratarCatalogosElectorales();
  const uploads = await uploadDiskInfo();
  console.log(
    `Catálogos electorales: resultados=${catalogos.resultados ? "db" : "archivo"} casillas=${catalogos.casillas ? "db" : "archivo"}`,
  );
  console.log(
    `Uploads: dir=${uploads.dir} libre=${uploads.freeBytes != null ? `${Math.round(uploads.freeBytes / (1024 * 1024))} MB` : "?"}${
      uploads.lowSpace ? " (poco espacio)" : ""
    }`,
  );
  app.listen(port, "0.0.0.0", () => {
    console.log(`Control API escuchando en http://0.0.0.0:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
