/** URL base de la app (para QR de asistencia). */
export function appBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export function urlQrAsistencia(codigoQr: string): string {
  return `${appBaseUrl()}/pase?c=${encodeURIComponent(codigoQr)}`;
}

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
  fechaNacimiento: string;
};

export function payloadQrDirigente(d: DatosQrDirigente): string {
  return urlQrAsistencia(d.codigoQr);
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

export function codigoQrDesdeTextoQr(texto: string): string | null {
  const trimmed = texto.trim();
  if (!trimmed) return null;

  const parsed = parseQrDirigentePayload(trimmed);
  if (parsed) return parsed.codigoQr;

  try {
    const url = trimmed.startsWith("/")
      ? new URL(trimmed, "https://axis.local")
      : new URL(trimmed);
    const c = url.searchParams.get("c")?.trim();
    if (c) return c;
  } catch {
    /* no es URL */
  }

  if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
  return null;
}

export function formatFechaQr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export type AsistenciaDirigenteResumen = {
  id: string;
  codigoQr: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  fechaNacimiento: string;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  activo: boolean;
  fotoUrl: string | null;
};
