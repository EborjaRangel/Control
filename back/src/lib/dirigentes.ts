export const TIPOS_DIRIGENTE_CAMPO = ["D1", "D2", "D3", "D4"] as const;
export const TIPOS_DIRIGENTE_ORGANIZACION = [
  "TRANSVERSAL",
  "ADMINISTRATIVO",
  "ENTIDAD",
  "PARTIDO_POLITICO",
] as const;

export const TIPOS_DIRIGENTE = [
  ...TIPOS_DIRIGENTE_CAMPO,
  ...TIPOS_DIRIGENTE_ORGANIZACION,
] as const;
export type TipoDirigente = (typeof TIPOS_DIRIGENTE)[number];

export const TIPOS_SECCION_ELECTORAL_CERO = [
  "ADMINISTRATIVO",
  "ENTIDAD",
  "PARTIDO_POLITICO",
] as const;

export function tipoPermiteSeccionCero(tipo: string): boolean {
  return (TIPOS_SECCION_ELECTORAL_CERO as readonly string[]).includes(tipo);
}

export const TIPO_DIRIGENTE_LABEL: Record<TipoDirigente, string> = {
  D1: "D1 — Más experiencia",
  D2: "D2 — Avanzado",
  D3: "D3 — Intermedio",
  D4: "D4 — Principiante",
  TRANSVERSAL: "Transversal",
  ADMINISTRATIVO: "Administrativo",
  ENTIDAD: "Entidad",
  PARTIDO_POLITICO: "Partido político",
};

export const TIPO_DIRIGENTE_CORTO: Record<TipoDirigente, string> = {
  D1: "D1",
  D2: "D2",
  D3: "D3",
  D4: "D4",
  TRANSVERSAL: "Transversal",
  ADMINISTRATIVO: "Administrativo",
  ENTIDAD: "Entidad",
  PARTIDO_POLITICO: "Partido político",
};

export function etiquetaTipoDirigenteCorto(tipo: string): string {
  return TIPO_DIRIGENTE_CORTO[tipo as TipoDirigente] ?? tipo;
}

export {
  CONCEPTOS_SUELDO_CATALOGO,
  CONCEPTO_SUELDO_LABEL,
  MAX_CONCEPTOS_COMPOSICION,
  calcularSueldo,
  etiquetaConceptoComposicion,
  type ConceptoComposicionInput,
  type ConceptoSueldo,
  type DesgloseSueldo,
} from "./composicion-sueldo.js";

export { formatMxn, nombreCompleto } from "./composicion-sueldo.js";

import { numeroDirigenteVisible as numeroDirigenteVisibleImpl } from "./numero-ficha-dirigente.js";

export {
  etiquetaNumeroDirigente,
  numeroDesdeIdLegacy,
  numeroDirigenteVisible,
} from "./numero-ficha-dirigente.js";

/** @deprecated Use numeroDirigenteVisible */
export function numeroDirigente(id: string): number | null {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export function compararNumeroDirigente(
  a: { id: string; numeroFicha?: number | null },
  b: { id: string; numeroFicha?: number | null },
): number {
  const na = numeroDirigenteVisibleImpl(a);
  const nb = numeroDirigenteVisibleImpl(b);
  if (na != null && nb != null) return na - nb;
  return a.id.localeCompare(b.id, "es");
}

export function compararDirigentePorApellidosNombre(
  a: { nombre: string; primerApellido: string; segundoApellido?: string | null },
  b: { nombre: string; primerApellido: string; segundoApellido?: string | null },
): number {
  const cmpApellido = a.primerApellido.localeCompare(b.primerApellido, "es", {
    sensitivity: "base",
  });
  if (cmpApellido !== 0) return cmpApellido;

  const cmpMaterno = (a.segundoApellido ?? "").localeCompare(b.segundoApellido ?? "", "es", {
    sensitivity: "base",
  });
  if (cmpMaterno !== 0) return cmpMaterno;

  return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
}
