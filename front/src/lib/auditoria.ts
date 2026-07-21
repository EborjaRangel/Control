export type AuditAccion =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "SEND"
  | "STATE_CHANGE";

export type AuditCambioDTO = {
  antes: unknown;
  despues: unknown;
};

export type AuditLogDTO = {
  id: string;
  accion: AuditAccion;
  accionLabel: string;
  entidad: string;
  entidadId: string | null;
  entidadLabel: string | null;
  usuarioId: string | null;
  usuarioNombre: string | null;
  usuarioRol: string | null;
  dirigenteId: string | null;
  rcId: string | null;
  rgId: string | null;
  cambios: Record<string, AuditCambioDTO> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export const AUDIT_ACCION_OPTIONS: { value: AuditAccion | ""; label: string }[] = [
  { value: "", label: "Todas las acciones" },
  { value: "CREATE", label: "Alta" },
  { value: "UPDATE", label: "Cambio" },
  { value: "DELETE", label: "Baja" },
  { value: "STATE_CHANGE", label: "Cambio de estado" },
  { value: "LOGIN", label: "Inicio de sesión" },
  { value: "LOGOUT", label: "Cierre de sesión" },
  { value: "SEND", label: "Envío" },
];

export function formatAuditFecha(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export function resumenCambios(cambios: Record<string, AuditCambioDTO> | null) {
  if (!cambios) return "—";
  const keys = Object.keys(cambios);
  if (keys.length === 0) return "—";
  if (keys.length === 1) return keys[0];
  return `${keys.length} campo(s)`;
}
