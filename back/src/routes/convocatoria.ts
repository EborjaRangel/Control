import { Router } from "express";
import { ValidationError } from "yup";
import { requireStaff } from "../lib/auth.js";
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

const router = Router();

router.use(requireStaff);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

router.get("/estado", (_req, res) => {
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

router.post("/eventos/:id/enviar", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const data = await convocatoriaEventoSchema.validate(req.body ?? {}, {
      abortEarly: false,
      stripUnknown: true,
    });

    const resumen = await enviarConvocatoriaEvento(id, { mensaje: data.mensaje });
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

router.get("/eventos/:id/envios", async (req, res) => {
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
