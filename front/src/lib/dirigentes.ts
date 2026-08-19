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

/** IDs y nombre completo de referentes que van al inicio del selector. */
export const REFERENTES_PRIORITARIOS = [
  { id: "1164", nombreCompleto: "JESUS SANCHEZ PITA" },
  { id: "1195", nombreCompleto: "GIOVANI GUTIERREZ AGUILAR" },
] as const;

function claveNombreDirigente(d: {
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
}): string {
  return [d.nombre, d.primerApellido, d.segundoApellido]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function indiceReferentePrioritario(d: {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
}): number {
  const nombre = claveNombreDirigente(d);
  return REFERENTES_PRIORITARIOS.findIndex(
    (r) => r.id === d.id || r.nombreCompleto === nombre,
  );
}

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
