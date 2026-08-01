/**
 * Homologación de partidos para la elección de jefatura delegacional 2015 (Coyoacán).
 * MC se registraba como Convergencia; PRD compitió en alianza con PT (PRD-PT).
 */

/** Coaliciones a omitir en importación (existen columnas individuales). */
export const CLAVES_COALICION_2015 = new Set(
  ["PRI_PVEM", "PVEM_PRI", "PRI-PVEM", "PVEM-PRI"].map((k) => k.toUpperCase()),
);

/** Columnas de boleta de coalición (no sumar si ya hay PAN/PRI/PRD/PT sueltos). */
export const CLAVES_TICKET_COALICION_2015 = new Set(
  [
    "PRD_PT",
    "PT_PRD",
    "PRD_PT_NVA_ALIANZA",
    "PRD_NVA_ALIANZA",
    "PT_NVA_ALIANZA",
  ].map((k) => k.toUpperCase()),
);

export function esVotoPartidoPrdPt2015(clave: string): boolean {
  const k = clave.toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return k === "PRD" || k === "PT";
}

export function esColumnaTicketCoalicion2015(clave: string): boolean {
  const k = clave.toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return CLAVES_TICKET_COALICION_2015.has(k);
}

export function esCoalicion2015(clave: string): boolean {
  const k = clave.toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (esVotoPartidoPrdPt2015(clave) || k === "PRD_PT") return false;
  if (CLAVES_COALICION_2015.has(k)) return true;
  if (esColumnaTicketCoalicion2015(clave)) return true;
  if (k.includes("_") && /^(PAN|PRI|PVEM|MORENA)_/.test(k)) return true;
  return false;
}

/** Normaliza claves del IECM 2015 (MC←Convergencia; PRD+PT→PRD_PT). */
export function clavePartidoHomologada2015(clave: string): string {
  const k = clave.toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (k === "CONVERGENCIA" || k.includes("CONVERGENCIA")) return "MC";
  if (esVotoPartidoPrdPt2015(clave)) return "PRD_PT";
  return k;
}

export function etiquetaPartidoHomologada2015(clave: string): string {
  const k = clave.toUpperCase();
  if (k === "MC") return "MC (Convergencia)";
  if (k === "PRD_PT") return "PRD-PT";
  return clave.replaceAll("_", "-");
}
