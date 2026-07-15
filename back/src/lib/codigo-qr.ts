import { randomUUID } from "crypto";

export type QrDirigentePayload = {
  v: 1;
  codigoQr: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  fechaNacimiento: string;
  url: string;
};

export type DatosQrDirigente = {
  codigoQr: string;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
  fechaNacimiento: string | Date;
};

/** Genera un identificador único para el QR de asistencia del dirigente. */
export function generarCodigoQr(): string {
  return randomUUID();
}

/** URL pública que abre la verificación de asistencia en la app. */
export function urlQrAsistencia(codigoQr: string): string {
  const base =
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.FRONTEND_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/asistencia/registrar?c=${encodeURIComponent(codigoQr)}`;
}

function fechaIso(d: string | Date): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Contenido del QR: datos únicos del dirigente desde la base de datos + enlace de verificación. */
export function payloadQrDirigente(d: DatosQrDirigente): string {
  const payload: QrDirigentePayload = {
    v: 1,
    codigoQr: d.codigoQr,
    nombre: d.nombre.trim(),
    primerApellido: d.primerApellido.trim(),
    segundoApellido: (d.segundoApellido ?? "").trim(),
    fechaNacimiento: fechaIso(d.fechaNacimiento),
    url: urlQrAsistencia(d.codigoQr),
  };
  return JSON.stringify(payload);
}

export function parseQrDirigentePayload(raw: string): QrDirigentePayload | null {
  try {
    const data = JSON.parse(raw) as Partial<QrDirigentePayload>;
    if (
      data.v === 1 &&
      typeof data.codigoQr === "string" &&
      typeof data.nombre === "string" &&
      typeof data.primerApellido === "string"
    ) {
      return data as QrDirigentePayload;
    }
    return null;
  } catch {
    return null;
  }
}

/** Extrae codigoQr de JSON del QR o de una URL de asistencia. */
export function codigoQrDesdeTextoQr(texto: string): string | null {
  const trimmed = texto.trim();
  if (!trimmed) return null;

  const parsed = parseQrDirigentePayload(trimmed);
  if (parsed) return parsed.codigoQr;

  try {
    const url = new URL(trimmed);
    const c = url.searchParams.get("c")?.trim();
    if (c) return c;
  } catch {
    /* no es URL */
  }

  if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
  return null;
}
