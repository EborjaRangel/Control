import type { CampanaDifusion, EstadoCampanaDifusion } from "../generated/prisma/client.js";

function hoyUtcDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function campanaAceptaRegistros(campana: Pick<CampanaDifusion, "estado" | "fechaInicio" | "fechaFin">): boolean {
  if (campana.estado !== "ACTIVA") return false;
  const hoy = hoyUtcDate();
  const inicio = toDateOnly(campana.fechaInicio);
  const fin = toDateOnly(campana.fechaFin);
  return hoy >= inicio && hoy <= fin;
}

export function etiquetaEstadoCampana(estado: EstadoCampanaDifusion): string {
  return estado === "ACTIVA" ? "Activa" : "Cerrada";
}
