import { Router } from "express";
import { ValidationError } from "yup";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireAuth, requireStaff, isStaffRol } from "../lib/auth.js";
import { canAccessDirigentePanel } from "../lib/user-panel.js";
import { campanaAceptaRegistros, campanaPermiteEditarRegistros } from "../lib/campana-difusion.js";
import {
  campanaDifusionCreateSchema,
  campanaDifusionUpdateSchema,
  registroDifusionCreateSchema,
  registroDifusionUpdateSchema,
} from "../lib/validation-difusion.js";
import {
  dirigenteResumenDifusionSelect,
  serializeCampanaDifusion,
  serializeDirigenteDifusionPanel,
  serializeRegistroDifusion,
} from "../lib/serialize-difusion.js";

const router = Router();
router.use(requireAuth);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const registroInclude = {
  campana: true,
  dirigente: { select: dirigenteResumenDifusionSelect },
} as const;

router.get("/campanas/activas", async (req, res) => {
  try {
    const campanas = await prisma.campanaDifusion.findMany({
      where: { estado: "ACTIVA" },
      orderBy: [{ fechaInicio: "desc" }, { titulo: "asc" }],
    });
    res.json(campanas.filter(campanaAceptaRegistros).map(serializeCampanaDifusion));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar campañas activas" });
  }
});

router.get("/campanas", requireStaff, async (_req, res) => {
  try {
    const campanas = await prisma.campanaDifusion.findMany({
      include: { _count: { select: { registros: true } } },
      orderBy: [{ createdAt: "desc" }],
    });
    res.json(campanas.map(serializeCampanaDifusion));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar campañas" });
  }
});

router.post("/campanas", requireAdmin, async (req, res) => {
  try {
    const data = await campanaDifusionCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const campana = await prisma.campanaDifusion.create({
      data: {
        titulo: data.titulo,
        fechaInicio: new Date(`${data.fechaInicio}T12:00:00.000Z`),
        fechaFin: new Date(`${data.fechaFin}T12:00:00.000Z`),
        creadoPorId: req.user?.sub,
      },
      include: { _count: { select: { registros: true } } },
    });

    res.status(201).json(serializeCampanaDifusion(campana));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al crear campaña" });
  }
});

router.get("/campanas/:id", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const campana = await prisma.campanaDifusion.findUnique({
      where: { id },
      include: { _count: { select: { registros: true } } },
    });
    if (!campana) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    res.json(serializeCampanaDifusion(campana));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener campaña" });
  }
});

router.put("/campanas/:id", requireAdmin, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const existing = await prisma.campanaDifusion.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    if (existing.estado === "CERRADA") {
      res.status(400).json({ error: "La campaña cerrada no se puede editar" });
      return;
    }

    const data = await campanaDifusionUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const campana = await prisma.campanaDifusion.update({
      where: { id },
      data: {
        titulo: data.titulo,
        fechaInicio: new Date(`${data.fechaInicio}T12:00:00.000Z`),
        fechaFin: new Date(`${data.fechaFin}T12:00:00.000Z`),
      },
      include: { _count: { select: { registros: true } } },
    });

    res.json(serializeCampanaDifusion(campana));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al actualizar campaña" });
  }
});

router.post("/campanas/:id/cerrar", requireAdmin, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const existing = await prisma.campanaDifusion.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    const campana = await prisma.campanaDifusion.update({
      where: { id },
      data: { estado: "CERRADA", cerradaAt: new Date() },
      include: { _count: { select: { registros: true } } },
    });

    res.json(serializeCampanaDifusion(campana));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cerrar campaña" });
  }
});

router.get("/registros/mapa", async (req, res) => {
  try {
    const campanaId =
      typeof req.query.campanaId === "string" ? req.query.campanaId.trim() : "";
    const dirigenteQuery =
      typeof req.query.dirigenteId === "string" ? req.query.dirigenteId.trim() : "";

    let dirigenteId: string | undefined;
    if (req.user && isStaffRol(req.user.rol)) {
      dirigenteId = dirigenteQuery || undefined;
    } else if (req.user?.dirigenteId) {
      dirigenteId = req.user.dirigenteId;
    } else {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const registros = await prisma.registroDifusion.findMany({
      where: {
        ...(campanaId ? { campanaId } : {}),
        ...(dirigenteId ? { dirigenteId } : {}),
      },
      include: registroInclude,
      orderBy: { registradoAt: "desc" },
      take: 5000,
    });

    res.json(registros.map(serializeRegistroDifusion));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar mapa" });
  }
});

router.get("/dirigentes/:dirigenteId", async (req, res) => {
  try {
    const dirigenteId = paramId(req.params.dirigenteId);
    if (!req.user || !(await canAccessDirigentePanel(req.user, dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const dirigente = await prisma.dirigente.findUnique({
      where: { id: dirigenteId },
      select: dirigenteResumenDifusionSelect,
    });
    if (!dirigente) {
      res.status(404).json({ error: "Dirigente no encontrado" });
      return;
    }

    const [registros, campanasActivas] = await Promise.all([
      prisma.registroDifusion.findMany({
        where: { dirigenteId },
        include: registroInclude,
        orderBy: { registradoAt: "desc" },
      }),
      prisma.campanaDifusion.findMany({
        where: { estado: "ACTIVA" },
        orderBy: { titulo: "asc" },
      }),
    ]);

    res.json({
      ...serializeDirigenteDifusionPanel(dirigente, registros.length),
      campanasActivas: campanasActivas.filter(campanaAceptaRegistros).map(serializeCampanaDifusion),
      registros: registros.map(serializeRegistroDifusion),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar difusión" });
  }
});

router.post("/registros", async (req, res) => {
  try {
    const data = await registroDifusionCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const dirigenteId = req.user?.dirigenteId;
    if (!dirigenteId || !req.user) {
      res.status(403).json({ error: "Solo dirigentes pueden registrar acciones de difusión" });
      return;
    }

    const [campana, dirigente] = await Promise.all([
      prisma.campanaDifusion.findUnique({ where: { id: data.campanaId } }),
      prisma.dirigente.findUnique({
        where: { id: dirigenteId },
        select: { id: true, activo: true, status: true },
      }),
    ]);

    if (!campana) {
      res.status(400).json({ error: "Campaña no encontrada" });
      return;
    }
    if (!campanaAceptaRegistros(campana)) {
      res.status(400).json({ error: "La campaña no acepta registros (cerrada o fuera de vigencia)" });
      return;
    }
    if (!dirigente || !dirigente.activo || dirigente.status !== "ACTIVO") {
      res.status(400).json({ error: "Dirigente inactivo" });
      return;
    }

    const registro = await prisma.registroDifusion.create({
      data: {
        campanaId: data.campanaId,
        dirigenteId,
        fotoUrl: data.fotoUrl,
        lat: data.lat,
        lng: data.lng,
      },
      include: registroInclude,
    });

    res.status(201).json(serializeRegistroDifusion(registro));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al registrar acción" });
  }
});

router.put("/registros/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const data = await registroDifusionUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const dirigenteId = req.user?.dirigenteId;
    if (!dirigenteId || !req.user) {
      res.status(403).json({ error: "Solo el dirigente puede editar su acción de difusión" });
      return;
    }

    const existing = await prisma.registroDifusion.findUnique({
      where: { id },
      include: { campana: true },
    });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    if (existing.dirigenteId !== dirigenteId) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    if (!existing.campana || !campanaPermiteEditarRegistros(existing.campana)) {
      res.status(400).json({ error: "La campaña está cerrada; el registro ya no se puede modificar" });
      return;
    }

    const registro = await prisma.registroDifusion.update({
      where: { id },
      data: {
        fotoUrl: data.fotoUrl,
        lat: data.lat,
        lng: data.lng,
      },
      include: registroInclude,
    });

    res.json(serializeRegistroDifusion(registro));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al actualizar registro" });
  }
});

router.get("/registros/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const registro = await prisma.registroDifusion.findUnique({
      where: { id },
      include: registroInclude,
    });
    if (!registro) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    if (!req.user || !(await canAccessDirigentePanel(req.user, registro.dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    res.json(serializeRegistroDifusion(registro));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener registro" });
  }
});

export default router;
