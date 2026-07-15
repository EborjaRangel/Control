import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import routes from "./routes/index.js";

const app = express();
const uploadDir = path.join(process.cwd(), "uploads");
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

fs.mkdirSync(uploadDir, { recursive: true });

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
app.use("/uploads", express.static(uploadDir));
app.use("/api", routes);
app.get("/health", (_req, res) => {
  res.json({ ok: true });
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

app.listen(port, "0.0.0.0", () => {
  console.log(`Control API escuchando en http://0.0.0.0:${port}`);
});
