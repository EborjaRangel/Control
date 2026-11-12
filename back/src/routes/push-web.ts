import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../lib/auth.js";
import { pushWebConfigurado, pushWebPublicKey, enviarPushWebAUsuarios } from "../lib/push-web.js";
import { pushSubscribeSchema } from "../lib/validation-push-web.js";

const router = Router();

router.get("/vapid-public-key", (_req, res) => {
  const configurado = pushWebConfigurado();
  res.json({
    configurado,
    publicKey: configurado ? pushWebPublicKey() : null,
  });
});

router.use(requireAuth);

/** Staff: envía push de prueba al usuario autenticado (requiere haber activado avisos en este dispositivo). */
router.post("/probar", requireStaff, async (req, res) => {
  try {
    if (!pushWebConfigurado()) {
      res.status(503).json({ error: "Push web no configurado en el servidor" });
      return;
    }
    const usuarioId = req.user!.sub;
    const resultado = await enviarPushWebAUsuarios({
      usuarioIds: [usuarioId],
      mensaje: `PRUEBA Control AXIS — ${new Date().toLocaleString("es-MX")}`,
    });
    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al enviar push de prueba" });
  }
});

router.post("/subscribe", async (req, res) => {
  try {
    if (!pushWebConfigurado()) {
      res.status(503).json({
        error: "Push web no configurado (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en servidor)",
      });
      return;
    }

    const data = await pushSubscribeSchema.validate(req.body ?? {}, {
      abortEarly: false,
      stripUnknown: true,
    });

    const usuarioId = req.user!.sub;
    const userAgent =
      typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, 500) : null;

    await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        usuarioId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent,
      },
      update: {
        usuarioId,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent,
      },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Suscripción push inválida" });
  }
});

router.delete("/subscribe", async (req, res) => {
  try {
    const endpoint =
      typeof req.body?.endpoint === "string" ? req.body.endpoint.trim() : "";
    if (!endpoint) {
      res.status(400).json({ error: "Falta endpoint" });
      return;
    }
    const usuarioId = req.user!.sub;
    await prisma.pushSubscription.deleteMany({ where: { usuarioId, endpoint } });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cancelar push" });
  }
});

export default router;
