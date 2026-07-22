import type { EstatusServicioUrbano } from "./servicios-urbanos";

export type SemaforoTiempoInput = {
  createdAt: string | Date;
  estatus?: EstatusServicioUrbano;
  atendidoAt?: string | Date | null;
};

function parseDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

/** Tiempo transcurrido para el semáforo; se congela en atendidoAt si ya fue atendido. */
export function horasSemaforoReporte(input: string | Date | SemaforoTiempoInput) {
  const opts =
    typeof input === "object" && input !== null && "createdAt" in input
      ? input
      : { createdAt: input };
  const inicio = parseDate(opts.createdAt).getTime();
  const fin =
    opts.estatus === "ATENDIDO" && opts.atendidoAt
      ? parseDate(opts.atendidoAt).getTime()
      : Date.now();
  return Math.max(0, fin - inicio) / (1000 * 60 * 60);
}

export function calcSemaforoTiempoReporte(input: string | Date | SemaforoTiempoInput) {
  const horas = horasSemaforoReporte(input);
  if (horas <= 24) return "verde" as const;
  if (horas <= 96) return "amarillo" as const;
  return "rojo" as const;
}

export function etiquetaSemaforoTiempoReporte(input: string | Date | SemaforoTiempoInput) {
  const horas = horasSemaforoReporte(input);
  const congelado =
    typeof input === "object" &&
    input !== null &&
    "createdAt" in input &&
    input.estatus === "ATENDIDO" &&
    input.atendidoAt;

  if (horas < 1) {
    const mins = Math.max(1, Math.round(horas * 60));
    return congelado ? `${mins} min · atendido` : `${mins} min`;
  }
  if (horas < 48) {
    return congelado ? `${Math.round(horas)} h · atendido` : `${Math.round(horas)} h`;
  }
  const dias = Math.round(horas / 24);
  return congelado ? `${dias} d · atendido` : `${dias} d`;
}

export function semaforoCongelado(input: string | Date | SemaforoTiempoInput) {
  return (
    typeof input === "object" &&
    input !== null &&
    "createdAt" in input &&
    input.estatus === "ATENDIDO" &&
    Boolean(input.atendidoAt)
  );
}
