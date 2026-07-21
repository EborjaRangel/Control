import { Router } from "express";
import { ValidationError } from "yup";
import type { TipoDirigente } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireStaff, requireAuth } from "../lib/auth.js";
import {
  contarDestinatariosNotificacion,
  enviarNotificacion,
  etiquetaAlcanceNotificacion,
  serializeNotificacionUsuario,
} from "../lib/notificaciones.js";
import { notificacionEnviarSchema } from "../lib/validation-notificacion.js";
import { registrarAuditoria } from "../lib/audit.js";

const router = Router();

router.use(requireAuth);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

/** Resumen de no leídas (navbar). */
router.get("/resumen", async (req, res) => {
  try {
    const usuarioId = req.user!.sub;
    const noLeidas = await prisma.notificacionDestinatario.count({
      where: { usuarioId, vistoAt: null },
    });
    res.json({ noLeidas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar resumen" });
  }
});

/** Notificaciones del usuario autenticado. */
router.get("/mias", async (req, res) => {
  try {
    const usuarioId = req.user!.sub;
    const soloNoLeidas = req.query.soloNoLeidas === "true";

    const rows = await prisma.notificacionDestinatario.findMany({
      where: {
        usuarioId,
        ...(soloNoLeidas ? { vistoAt: null } : {}),
      },
      include: {
        notificacion: {
          include: {
            unidadTerritorial: { select: { clave: true, nombre: true } },
          },
        },
      },
      orderBy: { notificacion: { enviadoAt: "desc" } },
    });

    res.json(rows.map(serializeNotificacionUsuario));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar notificaciones" });
  }
});

/** Marcar una notificación como vista. */
router.post("/:destinatarioId/visto", async (req, res) => {
  try {
    const destinatarioId = paramId(req.params.destinatarioId);
    const usuarioId = req.user!.sub;

    const existing = await prisma.notificacionDestinatario.findFirst({
      where: { id: destinatarioId, usuarioId },
      include: {
        notificacion: {
          include: {
            unidadTerritorial: { select: { clave: true, nombre: true } },
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: "Notificación no encontrada" });
      return;
    }

    if (existing.vistoAt) {
      res.json(serializeNotificacionUsuario(existing));
      return;
    }

    const updated = await prisma.notificacionDestinatario.update({
      where: { id: destinatarioId },
      data: { vistoAt: new Date() },
      include: {
        notificacion: {
          include: {
            unidadTerritorial: { select: { clave: true, nombre: true } },
          },
        },
      },
    });

    res.json(serializeNotificacionUsuario(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al marcar como vista" });
  }
});

/** Admin: estimar destinatarios antes de enviar. */
router.post("/preview", requireStaff, async (req, res) => {
  try {
    const data = await notificacionEnviarSchema.validate(req.body ?? {}, {
      abortEarly: false,
      stripUnknown: true,
    });
    const conteo = await contarDestinatariosNotificacion({
      ...data,
      tipoDirigente: (data.tipoDirigente as TipoDirigente | null | undefined) ?? null,
    });
    res.json(conteo);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al calcular destinatarios" });
  }
});

/** Admin: enviar notificación in-app. */
router.post("/enviar", requireStaff, async (req, res) => {
  try {
    const data = await notificacionEnviarSchema.validate(req.body ?? {}, {
      abortEarly: false,
      stripUnknown: true,
    });

    const resultado = await enviarNotificacion({
      ...data,
      tipoDirigente: (data.tipoDirigente as TipoDirigente | null | undefined) ?? null,
      creadoPorId: req.user!.sub,
    });

    if (resultado.error) {
      res.status(400).json({ error: resultado.error });
      return;
    }

    await registrarAuditoria(req, {
      accion: "SEND",
      entidad: "Notificacion",
      entidadId: resultado.notificacionId,
      entidadLabel: resultado.alcanceLabel,
      despues: {
        mensaje: data.mensaje.trim().toUpperCase(),
        alcance: data.alcance,
        destinatarios: resultado.destinatarios,
        dirigentes: resultado.dirigentes,
      },
    });

    res.status(201).json(resultado);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al enviar notificación" });
  }
});

/** Admin: historial de envíos. */
router.get("/historial", requireStaff, async (_req, res) => {
  try {
    const rows = await prisma.notificacion.findMany({
      orderBy: { enviadoAt: "desc" },
      take: 50,
      include: {
        unidadTerritorial: { select: { clave: true, nombre: true } },
        _count: { select: { destinatarios: true } },
      },
    });

    res.json(
      rows.map((n) => ({
        id: n.id,
        mensaje: n.mensaje,
        alcance: n.alcance,
        alcanceLabel: etiquetaAlcanceNotificacion(n),
        enviadoAt: n.enviadoAt.toISOString(),
        destinatarios: n._count.destinatarios,
      })),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar historial" });
  }
});

export default router;
