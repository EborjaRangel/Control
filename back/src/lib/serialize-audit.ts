import type { AuditAccion } from "../generated/prisma/client.js";

export const AUDIT_ACCION_LABEL: Record<AuditAccion, string> = {
  CREATE: "Alta",
  UPDATE: "Cambio",
  DELETE: "Baja",
  LOGIN: "Inicio de sesión",
  LOGOUT: "Cierre de sesión",
  SEND: "Envío",
  STATE_CHANGE: "Cambio de estado",
};

type AuditRow = {
  id: string;
  accion: AuditAccion;
  entidad: string;
  entidadId: string | null;
  entidadLabel: string | null;
  usuarioId: string | null;
  usuarioNombre: string | null;
  usuarioRol: string | null;
  dirigenteId: string | null;
  rcId: string | null;
  rgId: string | null;
  cambios: unknown;
  metadata: unknown;
  createdAt: Date;
};

export function serializeAuditLog(row: AuditRow) {
  return {
    id: row.id,
    accion: row.accion,
    accionLabel: AUDIT_ACCION_LABEL[row.accion],
    entidad: row.entidad,
    entidadId: row.entidadId,
    entidadLabel: row.entidadLabel,
    usuarioId: row.usuarioId,
    usuarioNombre: row.usuarioNombre,
    usuarioRol: row.usuarioRol,
    dirigenteId: row.dirigenteId,
    rcId: row.rcId,
    rgId: row.rgId,
    cambios: row.cambios,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}
