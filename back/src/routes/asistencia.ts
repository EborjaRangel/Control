import { Router } from "express";
import { ValidationError } from "yup";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../lib/auth.js";
import { codigoQrDesdeTextoQr } from "../lib/codigo-qr.js";
import { nombreCompleto } from "../lib/dirigentes.js";
import {
  detalleAsistenciaDirigente,
  dirigenteEsElegible,
  enriquecerEvento,
  filtroDirigentesElegibles,
  obtenerEvento,
  resumenAsistenciaDirigentes,
  serializeEvento,
} from "../lib/eventos-asistencia.js";
import {
  eventoCreateSchema,
  registrarAsistenciaSchema,
} from "../lib/validation-asistencia.js";

const router = Router();

router.use(requireAdmin);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

router.get("/dirigente/:codigoQr", async (req, res) => {
  try {
    const codigoQr = paramId(req.params.codigoQr).trim();
    if (!codigoQr) {
      res.status(400).json({ error: "Código QR requerido" });
      return;
    }

    const dirigente = await prisma.dirigente.findUnique({
      where: { codigoQr },
      include: { unidadTerritorial: true },
    });

    if (!dirigente) {
      res.status(404).json({ error: "Código QR no válido o dirigente no encontrado" });
      return;
    }

    res.json({
      id: dirigente.id,
      codigoQr: dirigente.codigoQr,
      nombre: dirigente.nombre,
      primerApellido: dirigente.primerApellido,
      segundoApellido: dirigente.segundoApellido,
      nombreCompleto: nombreCompleto(dirigente),
      fechaNacimiento: dirigente.fechaNacimiento.toISOString().slice(0, 10),
      tipo: dirigente.tipo,
      colonia: dirigente.colonia,
      seccionElectoral: dirigente.seccionElectoral,
      activo: dirigente.activo,
      fotoUrl: dirigente.fotoUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al verificar código QR" });
  }
});

router.get("/eventos", async (req, res) => {
  try {
    const activos = req.query.activos === "true";
    const cerrados = req.query.cerrados === "true";

    const eventos = await prisma.eventoAsistencia.findMany({
      where: activos
        ? { estado: { in: ["PROGRAMADO", "ABIERTO"] } }
        : cerrados
          ? { estado: "CERRADO" }
          : undefined,
      include: {
        unidadTerritorial: true,
        _count: { select: { asistencias: true } },
      },
      orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    });

    const enriched = await Promise.all(eventos.map((e) => enriquecerEvento(e)));
    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar eventos" });
  }
});

router.post("/eventos", async (req, res) => {
  try {
    const data = await eventoCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (data.alcance === "UNIDAD_TERRITORIAL" && data.unidadTerritorialId) {
      const ut = await prisma.unidadTerritorial.findUnique({
        where: { id: data.unidadTerritorialId },
      });
      if (!ut) {
        res.status(400).json({ error: "Unidad territorial no encontrada" });
        return;
      }
    }

    const evento = await prisma.eventoAsistencia.create({
      data: {
        titulo: data.titulo,
        fecha: new Date(data.fecha),
        hora: data.hora,
        lugar: data.lugar,
        alcance: data.alcance,
        colonia: data.alcance === "COLONIA" ? data.colonia! : null,
        seccionElectoral: data.alcance === "SECCION" ? data.seccionElectoral! : null,
        unidadTerritorialId:
          data.alcance === "UNIDAD_TERRITORIAL" ? data.unidadTerritorialId! : null,
        distritoLocal: data.alcance === "DISTRITO" ? (data.distritoLocal ?? null) : null,
        tipoDirigente:
          data.alcance === "TIPO_DIRIGENTE" ? (data.tipoDirigente as import("../generated/prisma/client.js").TipoDirigente) : null,
        creadoPorId: req.user!.sub,
      },
      include: {
        unidadTerritorial: true,
        _count: { select: { asistencias: true } },
      },
    });

    res.status(201).json(await enriquecerEvento(evento));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al crear evento" });
  }
});

router.get("/eventos/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const evento = await obtenerEvento(id);
    if (!evento) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    res.json(await enriquecerEvento(evento));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar evento" });
  }
});

router.get("/eventos/:id/pase", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const evento = await obtenerEvento(id);
    if (!evento) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }

    const [elegibles, registros] = await Promise.all([
      prisma.dirigente.findMany({
        where: filtroDirigentesElegibles(evento),
        select: {
          id: true,
          nombre: true,
          primerApellido: true,
          segundoApellido: true,
          tipo: true,
          colonia: true,
          seccionElectoral: true,
          codigoQr: true,
        },
        orderBy: [{ primerApellido: "asc" }, { nombre: "asc" }],
      }),
      prisma.registroAsistencia.findMany({
        where: { eventoId: id },
        include: {
          dirigente: {
            select: {
              id: true,
              nombre: true,
              primerApellido: true,
              segundoApellido: true,
              tipo: true,
              colonia: true,
              seccionElectoral: true,
            },
          },
        },
        orderBy: { registradoAt: "asc" },
      }),
    ]);

    const asistioIds = new Set(registros.map((r) => r.dirigenteId));

    res.json({
      evento: await enriquecerEvento(evento),
      lista: elegibles.map((d) => ({
        id: d.id,
        nombreCompleto: nombreCompleto(d),
        tipo: d.tipo,
        colonia: d.colonia,
        seccionElectoral: d.seccionElectoral,
        codigoQr: d.codigoQr,
        asistio: asistioIds.has(d.id),
      })),
      registros: registros.map((r) => ({
        id: r.id,
        registradoAt: r.registradoAt.toISOString(),
        dirigente: {
          id: r.dirigente.id,
          nombreCompleto: nombreCompleto(r.dirigente),
          tipo: r.dirigente.tipo,
          colonia: r.dirigente.colonia,
          seccionElectoral: r.dirigente.seccionElectoral,
        },
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar pase de lista" });
  }
});

router.post("/eventos/:id/abrir", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const evento = await obtenerEvento(id);
    if (!evento) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    if (evento.estado === "ABIERTO") {
      res.status(400).json({ error: "El pase de lista ya está abierto" });
      return;
    }
    if (evento.estado === "CERRADO") {
      res.status(400).json({ error: "El evento ya fue cerrado y no se puede reabrir" });
      return;
    }

    const updated = await prisma.eventoAsistencia.update({
      where: { id },
      data: { estado: "ABIERTO", abiertoAt: new Date() },
      include: {
        unidadTerritorial: true,
        _count: { select: { asistencias: true } },
      },
    });

    res.json(await enriquecerEvento(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al abrir pase de lista" });
  }
});

router.post("/eventos/:id/cerrar", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const evento = await obtenerEvento(id);
    if (!evento) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    if (evento.estado === "CERRADO") {
      res.status(400).json({ error: "El pase de lista ya está cerrado" });
      return;
    }
    if (evento.estado === "PROGRAMADO") {
      res.status(400).json({ error: "Debes abrir el pase de lista antes de cerrarlo" });
      return;
    }

    const updated = await prisma.eventoAsistencia.update({
      where: { id },
      data: { estado: "CERRADO", cerradoAt: new Date() },
      include: {
        unidadTerritorial: true,
        _count: { select: { asistencias: true } },
      },
    });

    res.json(await enriquecerEvento(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cerrar pase de lista" });
  }
});

router.post("/eventos/:id/registrar", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const rawCodigo =
      typeof req.body?.codigoQr === "string"
        ? req.body.codigoQr
        : typeof req.body?.raw === "string"
          ? req.body.raw
          : "";

    const parsed = await registrarAsistenciaSchema.validate(
      { codigoQr: codigoQrDesdeTextoQr(rawCodigo) ?? rawCodigo.trim() },
      { abortEarly: false },
    );

    const evento = await obtenerEvento(id);
    if (!evento) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    if (evento.estado !== "ABIERTO") {
      res.status(400).json({
        error:
          evento.estado === "CERRADO"
            ? "El pase de lista está cerrado. Ya no se pueden registrar asistencias."
            : "Debes abrir el pase de lista antes de registrar asistencias.",
      });
      return;
    }

    const dirigente = await prisma.dirigente.findUnique({
      where: { codigoQr: parsed.codigoQr },
    });
    if (!dirigente) {
      res.status(404).json({ error: "Código QR no válido" });
      return;
    }
    if (!dirigenteEsElegible(dirigente, evento)) {
      res.status(400).json({
        error: "Este dirigente no pertenece al alcance del evento (colonia, sección o UT).",
      });
      return;
    }

    const existente = await prisma.registroAsistencia.findUnique({
      where: {
        eventoId_dirigenteId: { eventoId: id, dirigenteId: dirigente.id },
      },
    });
    if (existente) {
      res.status(409).json({
        error: "Asistencia ya registrada",
        registradoAt: existente.registradoAt.toISOString(),
        dirigente: {
          id: dirigente.id,
          nombreCompleto: nombreCompleto(dirigente),
        },
      });
      return;
    }

    const registro = await prisma.registroAsistencia.create({
      data: {
        eventoId: id,
        dirigenteId: dirigente.id,
        registradoPorId: req.user!.sub,
      },
      include: {
        dirigente: {
          select: {
            id: true,
            nombre: true,
            primerApellido: true,
            segundoApellido: true,
            tipo: true,
            colonia: true,
            seccionElectoral: true,
          },
        },
      },
    });

    res.status(201).json({
      id: registro.id,
      registradoAt: registro.registradoAt.toISOString(),
      dirigente: {
        id: registro.dirigente.id,
        nombreCompleto: nombreCompleto(registro.dirigente),
        tipo: registro.dirigente.tipo,
        colonia: registro.dirigente.colonia,
        seccionElectoral: registro.dirigente.seccionElectoral,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al registrar asistencia" });
  }
});

router.get("/dashboard/dirigentes", async (_req, res) => {
  try {
    const resumen = await resumenAsistenciaDirigentes();
    res.json(resumen);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar dashboard" });
  }
});

router.get("/dashboard/dirigentes/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const detalle = await detalleAsistenciaDirigente(id);
    if (!detalle) {
      res.status(404).json({ error: "Dirigente no encontrado" });
      return;
    }
    res.json(detalle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar detalle" });
  }
});

export default router;
