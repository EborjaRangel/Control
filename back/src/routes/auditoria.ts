import { Router } from "express";
import type { AuditAccion, Prisma } from "../generated/prisma/client.js";
import { requireAdminPrivileges } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { serializeAuditLog } from "../lib/serialize-audit.js";

const router = Router();

const ACCIONES: AuditAccion[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "SEND",
  "STATE_CHANGE",
];

router.use(requireAdminPrivileges);

router.get("/", async (req, res) => {
  try {
    const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim() : "";
    const entidad = typeof req.query.entidad === "string" ? req.query.entidad.trim() : "";
    const accionRaw = typeof req.query.accion === "string" ? req.query.accion.trim() : "";
    const usuarioId = typeof req.query.usuarioId === "string" ? req.query.usuarioId.trim() : "";
    const entidadId = typeof req.query.entidadId === "string" ? req.query.entidadId.trim() : "";
    const desde = typeof req.query.desde === "string" ? req.query.desde.trim() : "";
    const hasta = typeof req.query.hasta === "string" ? req.query.hasta.trim() : "";
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 100;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const accion = ACCIONES.includes(accionRaw as AuditAccion)
      ? (accionRaw as AuditAccion)
      : undefined;

    const where: Prisma.AuditLogWhereInput = {
      ...(entidad ? { entidad } : {}),
      ...(accion ? { accion } : {}),
      ...(usuarioId ? { usuarioId } : {}),
      ...(entidadId ? { entidadId } : {}),
      ...(desde || hasta
        ? {
            createdAt: {
              ...(desde ? { gte: new Date(desde) } : {}),
              ...(hasta ? { lte: new Date(`${hasta}T23:59:59.999`) } : {}),
            },
          }
        : {}),
      ...(buscar
        ? {
            OR: [
              { entidadLabel: { contains: buscar, mode: "insensitive" } },
              { entidadId: { contains: buscar, mode: "insensitive" } },
              { usuarioNombre: { contains: buscar, mode: "insensitive" } },
              { entidad: { contains: buscar, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json(rows.map(serializeAuditLog));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar auditoría" });
  }
});

router.get("/entidades", (_req, res) => {
  res.json([
    "Usuario",
    "Dirigente",
    "Nomina",
    "Detectado",
    "PersonaDetectada",
    "ResponsableColonia",
    "ResponsableGeneral",
    "RepresentanteCasilla",
    "EventoAsistencia",
    "RegistroAsistencia",
    "Notificacion",
    "Convocatoria",
    "Sesion",
  ]);
});

export default router;
