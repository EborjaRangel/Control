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

export const AUDIT_ENTIDAD_LABEL: Record<string, string> = {
  Sesion: "Sesión",
  Usuario: "Usuario",
  Dirigente: "Dirigente",
  Nomina: "Nómina",
  Detectado: "Detectado",
  PersonaDetectada: "Persona detectada",
  ResponsableColonia: "Rep. casilla (RC)",
  ResponsableGeneral: "Rep. general (RG)",
  RepresentanteCasilla: "Representante de casilla",
  EventoAsistencia: "Evento de asistencia",
  RegistroAsistencia: "Registro de asistencia",
  Notificacion: "Notificación",
  Convocatoria: "Convocatoria",
  ReporteServicioUrbano: "Servicio urbano",
};

const LOGIN_MOTIVO_LABEL: Record<string, string> = {
  credenciales_invalidas: "Usuario inexistente o inactivo",
  password_incorrecta: "Contraseña incorrecta",
  rol_detectado_sin_acceso: "Rol detectado sin acceso",
  dirigente_inactivo: "Dirigente dado de baja",
  rc_inactivo: "RC dado de baja",
  rg_inactivo: "RG dado de baja",
};

export function labelEntidadAuditoria(entidad: string) {
  return AUDIT_ENTIDAD_LABEL[entidad] ?? entidad;
}

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

export function resumenAuditoria(log: AuditLogDTO): string {
  if (log.accion === "LOGIN") {
    const exito = log.metadata?.exito === true;
    if (exito) {
      const rol = typeof log.metadata?.rol === "string" ? log.metadata.rol : log.usuarioRol;
      return rol ? `Sesión iniciada (${rol})` : "Sesión iniciada";
    }
    const motivo =
      typeof log.metadata?.motivo === "string"
        ? LOGIN_MOTIVO_LABEL[log.metadata.motivo] ?? log.metadata.motivo
        : "Intento fallido";
    return motivo;
  }
  if (log.accion === "LOGOUT") {
    return "Sesión terminada";
  }
  if (log.accion === "SEND") {
    return "Envío registrado";
  }
  return resumenCambios(log.cambios);
}
