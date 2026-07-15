import { esSeccionValida } from "./secciones-electorales.js";

/** Parsea listas de secciones del catálogo IECM (secciones + secciones1). */
export function parseSeccionesIecm(
  secciones?: string | null,
  secciones1?: string | null,
): string[] {
  const raw = [secciones, secciones1]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const out = new Set<string>();
  for (const s of raw) {
    if (esSeccionValida(s)) out.add(s);
  }
  return [...out].sort((a, b) => Number(a) - Number(b));
}

export function combinarSecciones(listas: string[][]): string[] {
  const out = new Set<string>();
  for (const lista of listas) {
    for (const s of lista) out.add(s);
  }
  return [...out].sort((a, b) => Number(a) - Number(b));
}
