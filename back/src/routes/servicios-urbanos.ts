import { Router } from "express";
import { ValidationError } from "yup";
import type { Prisma, TipoServicioUrbano } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { isStaffRol, requireAuth, requireStaff } from "../lib/auth.js";
import { canAccessDirigentePanel } from "../lib/user-panel.js";
import { variantesColoniaParaBusqueda } from "../lib/colonias.js";
import {
  registrarAuditoria,
  snapshotServicioUrbano,
} from "../lib/audit.js";
import {
  serializeReporteServicioUrbano,
  TIPO_SERVICIO_URBANO_LABEL,
} from "../lib/serialize-servicio-urbano.js";
import {
  dirigenteResumenServiciosUrbanosSelect,
  serializeDirigenteServiciosUrbanos,
} from "../lib/serialize-dirigente-servicios-urbanos.js";
import {
  servicioUrbanoCreateSchema,
  servicioUrbanoUpdateSchema,
} from "../lib/validation-servicios-urbanos.js";

const router = Router();
router.use(requireAuth);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const reporteInclude = {
  dirigente: { select: dirigenteResumenServiciosUrbanosSelect },
} as const;

router.get("/", requireStaff, async (req, res) => {
  try {
    const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim() : "";
    const tipo = typeof req.query.tipo === "string" ? req.query.tipo.trim() : "";
    const dirigenteId =
      typeof req.query.dirigenteId === "string" ? req.query.dirigenteId.trim() : "";
    const incluirBajas = req.query.incluirBajas === "true";

    const where: Prisma.ReporteServicioUrbanoWhereInput = {
      ...(incluirBajas ? {} : { activo: true }),
      ...(dirigenteId ? { dirigenteId } : {}),
      ...(tipo ? { tipo: tipo as TipoServicioUrbano } : {}),
      ...(buscar
        ? {
            OR: [
              { descripcion: { contains: buscar, mode: "insensitive" } },
              { colonia: { contains: buscar, mode: "insensitive" } },
              { dirigente: { nombre: { contains: buscar, mode: "insensitive" } } },
              { dirigente: { primerApellido: { contains: buscar, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const reportes = await prisma.reporteServicioUrbano.findMany({
      where,
      include: reporteInclude,
      orderBy: [{ createdAt: "desc" }],
      take: 500,
    });

    res.json(reportes.map(serializeReporteServicioUrbano));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar reportes" });
  }
});

router.get("/tipos", (_req, res) => {
  res.json(
    Object.entries(TIPO_SERVICIO_URBANO_LABEL).map(([value, label]) => ({ value, label })),
  );
});

router.get("/dirigentes", requireStaff, async (req, res) => {
  try {
    const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim() : "";
    const coloniaQuery =
      typeof req.query.colonia === "string" ? req.query.colonia.trim() : "";
    const coloniaFiltro = coloniaQuery ? variantesColoniaParaBusqueda(coloniaQuery) : [];
    const incluirBajas = req.query.incluirBajas === "true";

    const dirigentes = await prisma.dirigente.findMany({
      where: {
        ...(incluirBajas ? {} : { activo: true }),
        ...(coloniaFiltro.length > 0 ? { colonia: { in: coloniaFiltro } } : {}),
        ...(buscar
          ? {
              OR: [
                { nombre: { contains: buscar, mode: "insensitive" } },
                { primerApellido: { contains: buscar, mode: "insensitive" } },
                { segundoApellido: { contains: buscar, mode: "insensitive" } },
                { seccionElectoral: { contains: buscar, mode: "insensitive" } },
                { colonia: { contains: buscar, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        ...dirigenteResumenServiciosUrbanosSelect,
        _count: { select: { reportesServiciosUrbanos: { where: { activo: true } } } },
      },
      orderBy: [{ activo: "desc" }, { primerApellido: "asc" }],
    });

    res.json(
      dirigentes.map((d) =>
        serializeDirigenteServiciosUrbanos(d, d._count.reportesServiciosUrbanos),
      ),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar dirigentes" });
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
      select: {
        ...dirigenteResumenServiciosUrbanosSelect,
        _count: { select: { reportesServiciosUrbanos: { where: { activo: true } } } },
      },
    });

    if (!dirigente) {
      res.status(404).json({ error: "Dirigente no encontrado" });
      return;
    }

    const reportes = await prisma.reporteServicioUrbano.findMany({
      where: { dirigenteId, activo: true },
      include: reporteInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      dirigente: serializeDirigenteServiciosUrbanos(
        dirigente,
        dirigente._count.reportesServiciosUrbanos,
      ),
      reportes: reportes.map(serializeReporteServicioUrbano),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener reportes del dirigente" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const data = await servicioUrbanoCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (!req.user || !(await canAccessDirigentePanel(req.user, data.dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    if (!isStaffRol(req.user.rol) && req.user.rol !== "DIRIGENTE") {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const dirigente = await prisma.dirigente.findUnique({
      where: { id: data.dirigenteId },
      select: {
        id: true,
        activo: true,
        colonia: true,
        seccionElectoral: true,
      },
    });
    if (!dirigente || !dirigente.activo) {
      res.status(400).json({ error: "Dirigente no encontrado o inactivo" });
      return;
    }

    const reporte = await prisma.reporteServicioUrbano.create({
      data: {
        dirigenteId: data.dirigenteId,
        tipo: data.tipo as TipoServicioUrbano,
        descripcion: data.descripcion?.trim() || null,
        colonia: dirigente.colonia,
        seccionElectoral: dirigente.seccionElectoral,
        lat: data.lat,
        lng: data.lng,
        fotoAntesUrl: data.fotoAntesUrl,
        fotoDespuesUrl: data.fotoDespuesUrl,
      },
      include: reporteInclude,
    });

    await registrarAuditoria(req, {
      accion: "CREATE",
      entidad: "ReporteServicioUrbano",
      entidadId: reporte.id,
      entidadLabel: TIPO_SERVICIO_URBANO_LABEL[reporte.tipo],
      dirigenteId: reporte.dirigenteId,
      despues: snapshotServicioUrbano(reporte),
    });

    res.status(201).json(serializeReporteServicioUrbano(reporte));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al crear reporte" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const reporte = await prisma.reporteServicioUrbano.findUnique({
      where: { id },
      include: reporteInclude,
    });

    if (!reporte) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    if (!req.user || !(await canAccessDirigentePanel(req.user, reporte.dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    res.json(serializeReporteServicioUrbano(reporte));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener reporte" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const existing = await prisma.reporteServicioUrbano.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    if (!req.user || !(await canAccessDirigentePanel(req.user, existing.dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    if (!isStaffRol(req.user.rol) && req.user.rol !== "DIRIGENTE") {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const data = await servicioUrbanoUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const antes = snapshotServicioUrbano(existing);

    const reporte = await prisma.reporteServicioUrbano.update({
      where: { id },
      data: {
        tipo: data.tipo as TipoServicioUrbano,
        descripcion: data.descripcion?.trim() || null,
        lat: data.lat,
        lng: data.lng,
        fotoAntesUrl: data.fotoAntesUrl,
        fotoDespuesUrl: data.fotoDespuesUrl,
      },
      include: reporteInclude,
    });

    await registrarAuditoria(req, {
      accion: "UPDATE",
      entidad: "ReporteServicioUrbano",
      entidadId: id,
      entidadLabel: TIPO_SERVICIO_URBANO_LABEL[reporte.tipo],
      dirigenteId: reporte.dirigenteId,
      antes,
      despues: snapshotServicioUrbano(reporte),
    });

    res.json(serializeReporteServicioUrbano(reporte));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al actualizar reporte" });
  }
});

router.delete("/:id", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const reactivar = req.query.reactivar === "true";

    const existing = await prisma.reporteServicioUrbano.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    const reporte = await prisma.reporteServicioUrbano.update({
      where: { id },
      data: { activo: reactivar },
      include: reporteInclude,
    });

    await registrarAuditoria(req, {
      accion: reactivar ? "STATE_CHANGE" : "DELETE",
      entidad: "ReporteServicioUrbano",
      entidadId: id,
      entidadLabel: TIPO_SERVICIO_URBANO_LABEL[reporte.tipo],
      dirigenteId: reporte.dirigenteId,
      antes: snapshotServicioUrbano(existing),
      despues: snapshotServicioUrbano(reporte),
      metadata: { reactivar },
    });

    res.json(serializeReporteServicioUrbano(reporte));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
});

export default router;
