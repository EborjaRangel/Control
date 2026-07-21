import { Router } from "express";
import { ValidationError } from "yup";
import { requireAuth, requireConvocatoriaOrStaff } from "../lib/auth.js";
import {
  convocatoriaListaParaEnvio,
  faltantesConfigConvocatoria,
  mensajeConfigConvocatoriaIncompleta,
  obtenerConfigConvocatoria,
} from "../lib/comunicacion/config.js";
import {
  enviarConvocatoriaEvento,
  resumenEnviosEvento,
} from "../lib/comunicacion/notificar-evento.js";
import { convocatoriaEventoSchema } from "../lib/validation-convocatoria.js";
import { registrarAuditoria } from "../lib/audit.js";
import { obtenerEvento } from "../lib/eventos-asistencia.js";

const router = Router();

router.use(requireAuth);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

router.get("/estado", requireConvocatoriaOrStaff, (_req, res) => {
  const config = obtenerConfigConvocatoria();
  res.json({
    listo: convocatoriaListaParaEnvio(),
    faltantes: faltantesConfigConvocatoria(),
    email: config.email.habilitado,
    sms: config.sms.habilitado,
    whatsapp: config.whatsapp.habilitado,
    notificaciones: true,
  });
});

router.post("/eventos/:id/enviar", requireConvocatoriaOrStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const data = await convocatoriaEventoSchema.validate(req.body ?? {}, {
      abortEarly: false,
      stripUnknown: true,
    });

    const resumen = await enviarConvocatoriaEvento(id, { mensaje: data.mensaje });

    const evento = await obtenerEvento(id);

    await registrarAuditoria(req, {
      accion: "SEND",
      entidad: "Convocatoria",
      entidadId: id,
      entidadLabel: evento?.titulo ?? id,
      despues: {
        mensaje: data.mensaje,
        totalDirigentes: resumen.totalDirigentes,
        email: resumen.email,
        sms: resumen.sms,
        whatsapp: resumen.whatsapp,
      },
    });

    res.json(resumen);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    if (error instanceof Error && error.message === "Evento no encontrado") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes("Configura en el servidor")) {
      res.status(503).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al enviar convocatoria" });
  }
});

router.get("/eventos/:id/envios", requireConvocatoriaOrStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const resumen = await resumenEnviosEvento(id);
    res.json(resumen);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar envíos de convocatoria" });
  }
});

export default router;
