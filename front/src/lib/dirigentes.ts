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
  normalizarDesglose,
  type ConceptoComposicionInput,
  type ConceptoSueldo,
  type DesgloseSueldo,
} from "./composicion-sueldo";

export { formatMxn, nombreCompleto } from "./composicion-sueldo";

/** Orden alfabético: primer apellido, segundo apellido, nombre. */
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
