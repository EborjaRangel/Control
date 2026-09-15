import { Router } from "express";
import { ValidationError } from "yup";
import { prisma } from "../lib/prisma.js";
import { isStaffRol, requireAuth, requireAdmin } from "../lib/auth.js";
import { canAccessDirigentePanel } from "../lib/user-panel.js";
import { puntoEnSeccionElectoral } from "../lib/colonias-seccion-geo.js";
import { validarSeccionCapturaDirigente } from "../lib/dirigente-seccion-captura.js";
import {
  asambleaCreateSchema,
  asambleaObservacionSchema,
  asambleaUpdateSchema,
  MAX_FOTOS_ASAMBLEA,
} from "../lib/validation-asambleas.js";
import {
  dirigenteResumenAsambleasSelect,
  serializeAsamblea,
  serializeDirigenteAsambleas,
} from "../lib/serialize-asamblea.js";

const router = Router();
router.use(requireAuth);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const asambleaInclude = {
  dirigente: { select: dirigenteResumenAsambleasSelect },
  fotos: { orderBy: { orden: "asc" as const } },
} as const;

function validarUbicacionEnSeccion(
  lat: number,
  lng: number,
  seccionElectoral: string,
): string | null {
  if (!puntoEnSeccionElectoral(lng, lat, seccionElectoral)) {
    return `El lugar debe estar dentro del mapa de la sección ${seccionElectoral}`;
  }
  return null;
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
      select: dirigenteResumenAsambleasSelect,
    });
    if (!dirigente) {
      res.status(404).json({ error: "Dirigente no encontrado" });
      return;
    }

    const asambleas = await prisma.asamblea.findMany({
      where: { dirigenteId, activo: true },
      include: { fotos: { orderBy: { orden: "asc" }, take: MAX_FOTOS_ASAMBLEA } },
      orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    });

    res.json({
      dirigente: serializeDirigenteAsambleas(dirigente, asambleas.length),
      asambleas: asambleas.map((a) => serializeAsamblea({ ...a, dirigente })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar asambleas" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await asambleaCreateSchema.validate(req.body, {
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
      select: { id: true, activo: true, seccionElectoral: true, tipo: true },
    });
    if (!dirigente || !dirigente.activo) {
      res.status(400).json({ error: "Dirigente no encontrado o inactivo" });
      return;
    }

    const seccionError = validarSeccionCapturaDirigente(
      dirigente.tipo,
      dirigente.seccionElectoral,
      data.seccionElectoral,
    );
    if (seccionError) {
      res.status(400).json({ error: seccionError });
      return;
    }

    const ubicacionError = validarUbicacionEnSeccion(data.lat, data.lng, data.seccionElectoral);
    if (ubicacionError) {
      res.status(400).json({ error: ubicacionError });
      return;
    }

    const fotos = data.fotos.slice(0, MAX_FOTOS_ASAMBLEA);

    const asamblea = await prisma.asamblea.create({
      data: {
        dirigenteId: data.dirigenteId,
        fecha: new Date(`${data.fecha}T12:00:00.000Z`),
        hora: data.hora,
        lugar: data.lugar,
        lat: data.lat,
        lng: data.lng,
        seccionElectoral: data.seccionElectoral,
        cantidadConvocada: data.cantidadConvocada,
        cantidadReal: data.cantidadReal,
        fotos: {
          create: fotos.map((url, index) => ({ url, orden: index })),
        },
      },
      include: asambleaInclude,
    });

    res.status(201).json(serializeAsamblea(asamblea));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al registrar asamblea" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);

    const asamblea = await prisma.asamblea.findUnique({
      where: { id },
      include: {
        ...asambleaInclude,
        fotos: { orderBy: { orden: "asc" }, take: MAX_FOTOS_ASAMBLEA },
      },
    });
    if (!asamblea) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    if (!req.user || !(await canAccessDirigentePanel(req.user, asamblea.dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    res.json(serializeAsamblea(asamblea));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener asamblea" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);

    const existing = await prisma.asamblea.findUnique({
      where: { id },
      include: { dirigente: { select: { seccionElectoral: true, activo: true, tipo: true } } },
    });
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

    const data = await asambleaUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (existing.dirigente && existing.dirigente.activo) {
      const seccionError = validarSeccionCapturaDirigente(
        existing.dirigente.tipo,
        existing.dirigente.seccionElectoral,
        data.seccionElectoral,
      );
      if (seccionError) {
        res.status(400).json({ error: seccionError });
        return;
      }
    }

    const ubicacionError = validarUbicacionEnSeccion(data.lat, data.lng, data.seccionElectoral);
    if (ubicacionError) {
      res.status(400).json({ error: ubicacionError });
      return;
    }

    const fotos = data.fotos.slice(0, MAX_FOTOS_ASAMBLEA);

    const asamblea = await prisma.$transaction(async (tx) => {
      await tx.asambleaFoto.deleteMany({ where: { asambleaId: id } });
      return tx.asamblea.update({
        where: { id },
        data: {
          fecha: new Date(`${data.fecha}T12:00:00.000Z`),
          hora: data.hora,
          lugar: data.lugar,
          lat: data.lat,
          lng: data.lng,
          seccionElectoral: data.seccionElectoral,
          cantidadConvocada: data.cantidadConvocada,
          cantidadReal: data.cantidadReal,
          fotos: {
            create: fotos.map((url, index) => ({ url, orden: index })),
          },
        },
        include: asambleaInclude,
      });
    });

    res.json(serializeAsamblea(asamblea));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al actualizar asamblea" });
  }
});

router.patch("/:id/observacion", requireAdmin, async (req, res) => {
  try {
    const id = paramId(req.params.id);

    const existing = await prisma.asamblea.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    const data = await asambleaObservacionSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const asamblea = await prisma.asamblea.update({
      where: { id },
      data: { observacion: data.observacion || null },
      include: asambleaInclude,
    });

    res.json(serializeAsamblea(asamblea));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al guardar observación" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const reactivar = req.query.reactivar === "true";

    const existing = await prisma.asamblea.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    const asamblea = await prisma.asamblea.update({
      where: { id },
      data: { activo: reactivar },
      include: asambleaInclude,
    });

    res.json(serializeAsamblea(asamblea));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
});

export default router;
