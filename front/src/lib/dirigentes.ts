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
} from "./composicion-sueldo";

export { formatMxn, nombreCompleto } from "./composicion-sueldo";
