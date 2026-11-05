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

export const TIPOS_DIRIGENTE_FILTRO_GRUPOS: {
  titulo: string;
  tipos: readonly TipoDirigente[];
}[] = [
  { titulo: "Dirigente de campo", tipos: TIPOS_DIRIGENTE_CAMPO },
  { titulo: "Organización", tipos: ["TRANSVERSAL", "ADMINISTRATIVO", "ENTIDAD", "PARTIDO_POLITICO"] },
];

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
  normalizarDesglose,
  type ConceptoComposicionInput,
  type ConceptoSueldo,
  type DesgloseSueldo,
} from "./composicion-sueldo";

export { formatMxn, nombreCompleto } from "./composicion-sueldo";

export function numeroDirigenteVisible(d: {
  id: string;
  numeroFicha?: number | null;
}): number | null {
  if (d.numeroFicha != null) return d.numeroFicha;
  const n = Number(d.id);
  return Number.isFinite(n) && n > 0 && Number.isInteger(n) ? n : null;
}

export function etiquetaNumeroDirigente(d: {
  id: string;
  numeroFicha?: number | null;
}): string {
  const n = numeroDirigenteVisible(d);
  return n != null ? String(n) : d.id;
}

export function etiquetaApellidosNombre(d: {
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
}): string {
  return [d.primerApellido, d.segundoApellido, d.nombre]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" ");
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
