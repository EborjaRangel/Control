import { Router } from "express";
import { ValidationError } from "yup";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff, isStaffRol } from "../lib/auth.js";
import { canAccessDirigentePanel } from "../lib/user-panel.js";
import { nombreCompleto } from "../lib/dirigentes.js";
import { eventoAceptaRegistroTransporte } from "../lib/evento-transporte.js";
import {
  MAX_FOTOS_TRANSPORTE,
  registroTransporteCreateSchema,
} from "../lib/validation-transporte.js";
import {
  dirigenteResumenTransporteSelect,
  serializeDirigenteTransportePanel,
  serializeEventoTransporteResumen,
  serializeRegistroTransporte,
  serializeRegistroTransporteAdmin,
} from "../lib/serialize-transporte.js";

const router = Router();
router.use(requireAuth);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const registroInclude = {
  evento: { select: { id: true, titulo: true, fecha: true, estado: true } },
  fotos: { orderBy: { orden: "asc" as const } },
} as const;

const registroIncludeAdmin = {
  ...registroInclude,
  dirigente: { select: dirigenteResumenTransporteSelect },
} as const;

function filtrosListadoStaff(query: Record<string, unknown>) {
  const eventoId = typeof query.eventoId === "string" ? query.eventoId.trim() : "";
  const dirigenteId = typeof query.dirigenteId === "string" ? query.dirigenteId.trim() : "";
  const buscar = typeof query.buscar === "string" ? query.buscar.trim() : "";
  return { eventoId, dirigenteId, buscar };
}

router.get("/dirigentes/:dirigenteId", async (req, res) => {
  try {
    const dirigenteId = paramId(req.params.dirigenteId);
    if (!req.user || !(await canAccessDirigentePanel(req.user, dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const dirigente = await prisma.dirigente.findUnique({
      where: { id: dirigenteId },
      select: dirigenteResumenTransporteSelect,
    });
    if (!dirigente) {
      res.status(404).json({ error: "Dirigente no encontrado" });
      return;
    }

    const [registros, eventosAbiertos] = await Promise.all([
      prisma.registroTransporte.findMany({
        where: { dirigenteId },
        include: registroInclude,
        orderBy: { registradoAt: "desc" },
      }),
      prisma.eventoAsistencia.findMany({
        where: { estado: "ABIERTO" },
        orderBy: [{ abiertoAt: "desc" }, { fecha: "desc" }],
        select: { id: true, titulo: true, fecha: true, estado: true },
      }),
    ]);

    res.json({
      ...serializeDirigenteTransportePanel(dirigente, registros.length),
      eventosAbiertos: eventosAbiertos.map(serializeEventoTransporteResumen),
      registros: registros.map(serializeRegistroTransporte),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar transporte" });
  }
});

router.post("/registros", async (req, res) => {
  try {
    const data = await registroTransporteCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const dirigenteId = req.user?.dirigenteId;
    if (!dirigenteId || !req.user) {
      res.status(403).json({ error: "Solo dirigentes pueden registrar transporte" });
      return;
    }

    const [evento, dirigente] = await Promise.all([
      prisma.eventoAsistencia.findUnique({ where: { id: data.eventoId } }),
      prisma.dirigente.findUnique({
        where: { id: dirigenteId },
        select: { id: true, activo: true, status: true },
      }),
    ]);

    if (!evento) {
      res.status(400).json({ error: "Evento no encontrado" });
      return;
    }
    if (!eventoAceptaRegistroTransporte(evento)) {
      res.status(400).json({ error: "El evento no está abierto para registrar transporte" });
      return;
    }
    if (!dirigente || !dirigente.activo || dirigente.status !== "ACTIVO") {
      res.status(400).json({ error: "Dirigente inactivo" });
      return;
    }

    const fotos = data.fotos.slice(0, MAX_FOTOS_TRANSPORTE);

    const registro = await prisma.registroTransporte.create({
      data: {
        eventoId: data.eventoId,
        dirigenteId,
        tipoUnidad: data.tipoUnidad,
        placas: data.placas,
        nombreChofer: data.nombreChofer,
        telefonoChofer: data.telefonoChofer,
        tipoRecorrido: data.tipoRecorrido,
        puntoEntrega: data.puntoEntrega,
        lat: data.lat,
        lng: data.lng,
        fotos: {
          create: fotos.map((url, orden) => ({ url, orden })),
        },
      },
      include: registroInclude,
    });

    res.status(201).json(serializeRegistroTransporte(registro));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    const msg =
      error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2021"
        ? "Base de datos sin migración de transporte. Contacta al administrador."
        : "Error al registrar transporte";
    res.status(500).json({ error: msg });
  }
});

router.get("/registros/mapa", requireStaff, async (req, res) => {
  try {
    const { eventoId, dirigenteId, buscar } = filtrosListadoStaff(req.query as Record<string, unknown>);

    const registros = await prisma.registroTransporte.findMany({
      where: {
        ...(eventoId ? { eventoId } : {}),
        ...(dirigenteId ? { dirigenteId } : {}),
        ...(buscar
          ? {
              OR: [
                { placas: { contains: buscar, mode: "insensitive" } },
                { nombreChofer: { contains: buscar, mode: "insensitive" } },
                { puntoEntrega: { contains: buscar, mode: "insensitive" } },
                { dirigente: { nombre: { contains: buscar, mode: "insensitive" } } },
                { dirigente: { primerApellido: { contains: buscar, mode: "insensitive" } } },
                { evento: { titulo: { contains: buscar, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: registroIncludeAdmin,
      orderBy: { registradoAt: "desc" },
      take: 5000,
    });

    res.json(registros.map(serializeRegistroTransporteAdmin));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar mapa de transporte" });
  }
});

router.get("/registros", requireStaff, async (req, res) => {
  try {
    const { eventoId, dirigenteId, buscar } = filtrosListadoStaff(req.query as Record<string, unknown>);

    const registros = await prisma.registroTransporte.findMany({
      where: {
        ...(eventoId ? { eventoId } : {}),
        ...(dirigenteId ? { dirigenteId } : {}),
        ...(buscar
          ? {
              OR: [
                { placas: { contains: buscar, mode: "insensitive" } },
                { nombreChofer: { contains: buscar, mode: "insensitive" } },
                { puntoEntrega: { contains: buscar, mode: "insensitive" } },
                { dirigente: { nombre: { contains: buscar, mode: "insensitive" } } },
                { dirigente: { primerApellido: { contains: buscar, mode: "insensitive" } } },
                { evento: { titulo: { contains: buscar, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: registroIncludeAdmin,
      orderBy: { registradoAt: "desc" },
      take: 1000,
    });

    res.json(registros.map(serializeRegistroTransporteAdmin));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar registros de transporte" });
  }
});

router.get("/eventos/:eventoId/registros", requireStaff, async (req, res) => {
  try {
    const eventoId = paramId(req.params.eventoId);
    const evento = await prisma.eventoAsistencia.findUnique({
      where: { id: eventoId },
      select: { id: true, titulo: true, fecha: true, estado: true },
    });
    if (!evento) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }

    const registros = await prisma.registroTransporte.findMany({
      where: { eventoId },
      include: {
        ...registroInclude,
        dirigente: { select: dirigenteResumenTransporteSelect },
      },
      orderBy: { registradoAt: "desc" },
    });

    res.json({
      evento: serializeEventoTransporteResumen(evento),
      registros: registros.map((r) => ({
        ...serializeRegistroTransporte(r),
        dirigente: {
          id: r.dirigente.id,
          numeroFicha: r.dirigente.numeroFicha,
          nombreCompleto: nombreCompleto(r.dirigente),
        },
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar transporte del evento" });
  }
});

router.get("/registros/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const registro = await prisma.registroTransporte.findUnique({
      where: { id },
      include: registroIncludeAdmin,
    });
    if (!registro) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    if (
      req.user &&
      !isStaffRol(req.user.rol) &&
      req.user.dirigenteId !== registro.dirigenteId
    ) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    if (req.user && isStaffRol(req.user.rol)) {
      res.json(serializeRegistroTransporteAdmin(registro));
      return;
    }

    res.json(serializeRegistroTransporte(registro));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener registro" });
  }
});

export default router;
