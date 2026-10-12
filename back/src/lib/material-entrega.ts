import type { EstadoEvento } from "../generated/prisma/client.js";

export function etiquetaEstadoEntregaMaterial(estado: EstadoEvento): string {
  if (estado === "PROGRAMADO") return "Programado";
  if (estado === "ABIERTO") return "Entrega abierta";
  return "Cerrado";
}

export function hoyIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function vigenciaEntregaMaterialActiva(fechaInicio: Date, fechaFin: Date, hoy = hoyIsoUtc()): boolean {
  const inicio = fechaInicio.toISOString().slice(0, 10);
  const fin = fechaFin.toISOString().slice(0, 10);
  return hoy >= inicio && hoy <= fin;
}

export function mensajeFueraVigencia(titulo: string): string {
  return `La entrega «${titulo}» está fuera de su periodo de vigencia`;
}

export function etiquetaDistritoLocal(distritoLocal: number | null | undefined): string {
  if (distritoLocal === 26) return "Distrito local 26";
  if (distritoLocal === 30) return "Distrito local 30";
  return "Sin distrito";
}
