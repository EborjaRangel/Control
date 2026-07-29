/** Catálogo de composición del sueldo (nómina del dirigente). */

export const CONCEPTOS_SUELDO_CATALOGO = [
  "BASE",
  "HONORARIOS",
  "COSSOC",
  "SETENTA_TREINTA",
  "PF",
  "NOMINA_8",
  "ESTRUCTURA",
] as const;

export type ConceptoSueldo = (typeof CONCEPTOS_SUELDO_CATALOGO)[number];

export const CONCEPTO_SUELDO_LABEL: Record<ConceptoSueldo, string> = {
  BASE: "Base",
  HONORARIOS: "Honorarios",
  COSSOC: "COSSOC",
  SETENTA_TREINTA: "70/30",
  PF: "PF",
  NOMINA_8: "Nómina 8",
  ESTRUCTURA: "Estructura",
};

export const MAX_CONCEPTOS_COMPOSICION = 30;

export const TIPOS_DETALLE_SUELDO = ["TITULAR", "CHAMBELAN"] as const;

export type TipoDetalleSueldo = (typeof TIPOS_DETALLE_SUELDO)[number];

export const TIPO_DETALLE_SUELDO_LABEL: Record<TipoDetalleSueldo, string> = {
  TITULAR: "Titular",
  CHAMBELAN: "Chambelán",
};

export function tipoDetalleSueldoParaFormulario(
  value: string | null | undefined,
): TipoDetalleSueldo {
  if (value && (TIPOS_DETALLE_SUELDO as readonly string[]).includes(value)) {
    return value as TipoDetalleSueldo;
  }
  return "TITULAR";
}

export function tipoDetalleSueldoLabel(value: string | null | undefined): string {
  if (value && (TIPOS_DETALLE_SUELDO as readonly string[]).includes(value)) {
    return TIPO_DETALLE_SUELDO_LABEL[value as TipoDetalleSueldo];
  }
  return value?.trim() || "—";
}

export type ConceptoComposicionInput = {
  concepto: ConceptoSueldo;
  monto: number;
  nombre?: string | null;
  tipoDetalle?: TipoDetalleSueldo | string | null;
};

export type DesgloseSueldo = Record<ConceptoSueldo, number> & {
  total: number;
};

/** Garantiza todas las columnas del catálogo (p. ej. Estructura) aunque el API sea parcial. */
export function normalizarDesglose(
  desglose: Partial<DesgloseSueldo> & { total?: number },
): DesgloseSueldo {
  const porConcepto = {} as Record<ConceptoSueldo, number>;
  for (const key of CONCEPTOS_SUELDO_CATALOGO) {
    porConcepto[key] = round2(num(desglose[key]));
  }
  const totalCalculado = CONCEPTOS_SUELDO_CATALOGO.reduce((sum, key) => sum + porConcepto[key], 0);
  const total =
    desglose.total != null && Number.isFinite(Number(desglose.total))
      ? round2(num(desglose.total))
      : round2(totalCalculado);
  return { ...porConcepto, total };
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcularSueldo(conceptos: ConceptoComposicionInput[]): DesgloseSueldo {
  const porConcepto: Record<ConceptoSueldo, number> = {
    BASE: 0,
    HONORARIOS: 0,
    COSSOC: 0,
    SETENTA_TREINTA: 0,
    PF: 0,
    NOMINA_8: 0,
    ESTRUCTURA: 0,
  };

  for (const c of conceptos ?? []) {
    if (CONCEPTOS_SUELDO_CATALOGO.includes(c.concepto)) {
      porConcepto[c.concepto] += num(c.monto);
    }
  }

  const total = CONCEPTOS_SUELDO_CATALOGO.reduce((sum, key) => sum + porConcepto[key], 0);

  return {
    BASE: round2(porConcepto.BASE),
    HONORARIOS: round2(porConcepto.HONORARIOS),
    COSSOC: round2(porConcepto.COSSOC),
    SETENTA_TREINTA: round2(porConcepto.SETENTA_TREINTA),
    PF: round2(porConcepto.PF),
    NOMINA_8: round2(porConcepto.NOMINA_8),
    ESTRUCTURA: round2(porConcepto.ESTRUCTURA),
    total: round2(total),
  };
}

export function formatMxn(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number.isFinite(value) ? value : 0);
}

export function nombreCompleto(d: {
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
}): string {
  return [d.nombre, d.primerApellido, d.segundoApellido]
    .filter(Boolean)
    .join(" ");
}

/** Etiqueta legible para una línea de composición. */
export function etiquetaConceptoComposicion(c: ConceptoComposicionInput & { id?: string }): string {
  const partes = [CONCEPTO_SUELDO_LABEL[c.concepto]];
  if (c.nombre?.trim()) partes.push(c.nombre.trim());
  if (c.tipoDetalle?.trim()) partes.push(`(${tipoDetalleSueldoLabel(c.tipoDetalle)})`);
  return partes.join(" · ");
}
