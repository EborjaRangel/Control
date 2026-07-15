// Secciones electorales de la alcaldía Coyoacán (CDMX).
// Fuente: distritos locales 26 y 30 — marco geográfico electoral INE/IECM.

type Rango = [number, number] | number;

const RANGOS_DISTRITO_26: Rango[] = [
  [345, 348], [351, 368], [372, 396], [402, 424], [433, 445], [451, 472],
  [474, 478], [480, 485], [486, 489], 490, [492, 498], [501, 509], [511, 512],
  514, [693, 746], 5515,
];

const RANGOS_DISTRITO_30: Rango[] = [
  [349, 350], [369, 371], [397, 401], [425, 432], [446, 450], 473, 479, 491,
  [499, 500], 510, 513, [515, 692],
];

function expandirRangos(rangos: Rango[]): string[] {
  const set = new Set<string>();
  for (const r of rangos) {
    if (Array.isArray(r)) {
      for (let n = r[0]; n <= r[1]; n++) set.add(String(n));
    } else {
      set.add(String(r));
    }
  }
  return [...set];
}

const mapaDistrito = new Map<string, number>();
for (const s of expandirRangos(RANGOS_DISTRITO_26)) mapaDistrito.set(s, 26);
for (const s of expandirRangos(RANGOS_DISTRITO_30)) mapaDistrito.set(s, 30);

export const SECCIONES_ELECTORALES_COYOACAN = [...mapaDistrito.keys()].sort(
  (a, b) => Number(a) - Number(b),
);

export const TOTAL_SECCIONES_COYOACAN = SECCIONES_ELECTORALES_COYOACAN.length;

const seccionSet = new Set(SECCIONES_ELECTORALES_COYOACAN);

/** Distritos federales que aplican a Coyoacán (CDMX). */
export const DISTRITOS_FEDERALES_COYOACAN = [8, 19] as const;

/** Distritos locales electorales (INE/IECM) en Coyoacán. */
export const DISTRITOS_LOCALES_COYOACAN = [26, 30] as const;

export const CENTRO_DISTRITO_LOCAL: Record<number, { lat: number; lng: number }> = {
  26: { lat: 19.338, lng: -99.178 },
  30: { lat: 19.328, lng: -99.152 },
};

export function esSeccionValida(seccion: string): boolean {
  return seccionSet.has(seccion);
}

export function distritoLocalDeSeccion(seccion: string): number | null {
  return mapaDistrito.get(seccion) ?? null;
}

export function seccionesDeDistritoLocal(distrito: number): string[] {
  return SECCIONES_ELECTORALES_COYOACAN.filter(
    (s) => distritoLocalDeSeccion(s) === distrito,
  );
}

export function seccionesParaSelect(
  valorActual?: string | null,
  permitidas?: string[],
): string[] {
  const base = permitidas?.length
    ? [...permitidas].sort((a, b) => Number(a) - Number(b))
    : SECCIONES_ELECTORALES_COYOACAN;

  if (!valorActual || base.includes(valorActual)) {
    return base;
  }
  return [valorActual, ...base].sort((a, b) => Number(a) - Number(b));
}

export function etiquetaSeccion(seccion: string): string {
  return `Sección ${seccion}`;
}
