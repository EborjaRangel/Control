export const TIPOS_DIRIGENTE = ["D1", "D2", "D3", "D4"] as const;
export type TipoDirigente = (typeof TIPOS_DIRIGENTE)[number];

export const TIPO_DIRIGENTE_LABEL: Record<TipoDirigente, string> = {
  D1: "D1 — Más experiencia",
  D2: "D2 — Avanzado",
  D3: "D3 — Intermedio",
  D4: "D4 — Principiante",
};

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

export function numeroDirigente(id: string): number | null {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

/** Orden numérico por ID de dirigente del Excel (1, 2, 10…). */
export function compararNumeroDirigente(a: { id: string }, b: { id: string }): number {
  const na = numeroDirigente(a.id);
  const nb = numeroDirigente(b.id);
  if (na != null && nb != null) return na - nb;
  return a.id.localeCompare(b.id, "es");
}
