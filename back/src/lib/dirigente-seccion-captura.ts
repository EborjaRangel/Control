import type { TipoDirigente } from "../generated/prisma/client.js";
import { esSeccionValida } from "./secciones-electorales.js";

export function dirigenteCapturaSoloSuSeccion(tipo: string | TipoDirigente): boolean {
  return tipo !== "D1";
}

export function validarSeccionCapturaDirigente(
  tipo: string | TipoDirigente,
  seccionDirigente: string,
  seccionCaptura: string,
): string | null {
  if (!esSeccionValida(seccionCaptura)) {
    return "Sección electoral no válida para Coyoacán";
  }
  if (dirigenteCapturaSoloSuSeccion(tipo) && seccionCaptura !== seccionDirigente) {
    return `Como dirigente ${tipo}, solo puedes capturar en la sección ${seccionDirigente}`;
  }
  return null;
}
