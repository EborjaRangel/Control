export type AlcanceNotificacion =
  | "TODOS"
  | "TIPO_DIRIGENTE"
  | "DISTRITO_FEDERAL"
  | "DISTRITO_LOCAL"
  | "COLONIA"
  | "UNIDAD_TERRITORIAL"
  | "SECCION";

export const ALCANCE_NOTIFICACION_LABEL: Record<AlcanceNotificacion, string> = {
  TODOS: "Todos los dirigentes (D1–D4)",
  TIPO_DIRIGENTE: "Por tipo de dirigente",
  DISTRITO_FEDERAL: "Por distrito federal",
  DISTRITO_LOCAL: "Por distrito local",
  COLONIA: "Por colonia",
  UNIDAD_TERRITORIAL: "Por unidad territorial",
  SECCION: "Por sección electoral",
};

export type NotificacionUsuarioDTO = {
  id: string;
  notificacionId: string;
  mensaje: string;
  alcance: AlcanceNotificacion;
  alcanceLabel: string;
  enviadoAt: string;
  vistoAt: string | null;
  leida: boolean;
};

export type NotificacionResumen = {
  noLeidas: number;
};

export type NotificacionEnviarResultado = {
  notificacionId: string | null;
  alcanceLabel: string;
  dirigentes: number;
  destinatarios: number;
  enviadoAt?: string;
  error?: string | null;
};

export type NotificacionHistorialItem = {
  id: string;
  mensaje: string;
  alcance: AlcanceNotificacion;
  alcanceLabel: string;
  enviadoAt: string;
  destinatarios: number;
};

export function formatFechaNotificacion(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const MS_24H = 24 * 60 * 60 * 1000;

function inicioDiaLocal(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** Para la bandeja del usuario: menos de 24 h en horas/minutos; desde 24 h en días calendario. */
export function formatRelativaNotificacion(iso: string, ahora = new Date()): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return formatFechaNotificacion(iso);

  const diffMs = ahora.getTime() - fecha.getTime();
  if (diffMs < 0) return formatFechaNotificacion(iso);

  if (diffMs < MS_24H) {
    const horas = Math.floor(diffMs / (60 * 60 * 1000));
    if (horas < 1) {
      const minutos = Math.max(1, Math.floor(diffMs / (60 * 1000)));
      return minutos === 1 ? "hace 1 minuto" : `hace ${minutos} minutos`;
    }
    return horas === 1 ? "hace 1 hora" : `hace ${horas} horas`;
  }

  const dias = Math.floor(
    (inicioDiaLocal(ahora).getTime() - inicioDiaLocal(fecha).getTime()) / MS_24H,
  );
  const n = Math.max(1, dias);
  return n === 1 ? "hace 1 día" : `hace ${n} días`;
}
