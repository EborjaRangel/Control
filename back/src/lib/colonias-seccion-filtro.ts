import { enlaceColoniaUtValido } from "./colonia-ut-claves.js";
import { baseNombreTerritorial } from "./unidades-territoriales-match.js";
import { pesosColoniasCompartenUt, pesosUtSuperposicionGeo } from "./colonias-seccion-geo.js";

export type UtColoniaEnlace = {
  clave: string;
  nombre: string;
  seccionesElectorales: string[];
};

export type EnlaceColoniaUt = {
  coloniaNombre: string;
  utClave: string;
};

export type PesoColoniaUt = {
  peso: number;
  utClave: string;
  utNombre: string;
};

/** Colonias que no deben aparecer en ciertas secciones (override manual puntual). */
export const COLONIAS_EXCLUIDAS_POR_SECCION: Record<string, readonly string[]> = {};

export function coloniaPermitidaEnSeccion(seccion: string, colonia: string): boolean {
  const excluidas = COLONIAS_EXCLUIDAS_POR_SECCION[seccion];
  return !excluidas?.includes(colonia);
}

/** Colonia cuyo nombre coincide mejor con la UT (evita duplicar SEPOMEX sobre la misma UT). */
function coloniaCanonicaUt(utNombre: string, candidatas: string[]): string | null {
  if (candidatas.length <= 1) return candidatas[0] ?? null;

  const utBase = baseNombreTerritorial(utNombre);
  const utTokens = new Set(utBase.split(" ").filter((t) => t.length > 2));

  let mejor = candidatas[0];
  let mejorScore = -1;

  for (const colonia of candidatas) {
    const coloniaBase = baseNombreTerritorial(colonia);
    const coloniaTokens = coloniaBase.split(" ").filter((t) => t.length > 2);
    const hits = coloniaTokens.filter((t) => utTokens.has(t)).length;
    let score = coloniaTokens.length ? hits / coloniaTokens.length : 0;
    if (utBase.includes(coloniaBase) || coloniaBase.includes(utBase)) {
      score += 0.5;
    }

    if (score > mejorScore || (score === mejorScore && colonia.length > mejor.length)) {
      mejor = colonia;
      mejorScore = score;
    }
  }

  return mejorScore > 0 ? mejor : null;
}

/**
 * Si varias colonias SEPOMEX comparten la misma clave UT, una sola fila con el peso total de esa UT.
 */
function colapsarColoniasMismaUt(pesos: Map<string, PesoColoniaUt>): void {
  const porUt = new Map<string, { colonia: string; meta: PesoColoniaUt }[]>();

  for (const [colonia, meta] of pesos) {
    if (!meta.utClave) continue;
    const lista = porUt.get(meta.utClave) ?? [];
    lista.push({ colonia, meta });
    porUt.set(meta.utClave, lista);
  }

  for (const [, entries] of porUt) {
    if (entries.length <= 1) continue;

    const total = entries.reduce((s, e) => s + e.meta.peso, 0);
    const utNombre = entries[0].meta.utNombre;
    const nombres = entries.map((e) => e.colonia);

    const maxPeso = Math.max(...entries.map((e) => e.meta.peso));
    const candidatasMax = entries.filter((e) => e.meta.peso >= maxPeso - 1e-12);
    const canonica =
      candidatasMax.length === 1
        ? candidatasMax[0]
        : (() => {
            const nombre =
              coloniaCanonicaUt(utNombre, candidatasMax.map((e) => e.colonia)) ??
              candidatasMax[0].colonia;
            return candidatasMax.find((e) => e.colonia === nombre) ?? candidatasMax[0];
          })();

    for (const e of entries) {
      pesos.delete(e.colonia);
    }
    pesos.set(canonica.colonia, { ...canonica.meta, peso: total });
  }
}

function enlacesValidosUt(
  seccion: string,
  ut: UtColoniaEnlace,
  enlacesColoniaUt: EnlaceColoniaUt[],
): EnlaceColoniaUt[] {
  if (!ut.seccionesElectorales.includes(seccion)) return [];
  return enlacesColoniaUt.filter((enlace) => {
    if (enlace.utClave !== ut.clave) return false;
    if (!coloniaPermitidaEnSeccion(seccion, enlace.coloniaNombre)) return false;
    return enlaceColoniaUtValido(enlace.coloniaNombre, ut.clave);
  });
}

/**
 * Colonias de una sección: UT IECM que contiene la sección + enlace autorizado por clave.
 */
export function coloniasPorUtEnSeccion(
  seccion: string,
  uts: UtColoniaEnlace[],
  enlacesColoniaUt: EnlaceColoniaUt[],
): string[] {
  const colonias = new Set<string>();

  for (const ut of uts) {
    for (const enlace of enlacesValidosUt(seccion, ut, enlacesColoniaUt)) {
      colonias.add(enlace.coloniaNombre);
    }
  }

  return [...colonias].sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Reparto de la sección entre colonias según superposición geográfica IECM (UT ∩ sección).
 * Si no hay geometría, respaldo: 1 ÷ secciones de la UT.
 */
export function pesosColoniasPorUtEnSeccion(
  seccion: string,
  uts: UtColoniaEnlace[],
  enlacesColoniaUt: EnlaceColoniaUt[],
): Map<string, PesoColoniaUt> {
  const utsSec = uts.filter((ut) => ut.seccionesElectorales.includes(seccion));
  const clavesSec = utsSec.map((u) => u.clave);
  const pesosGeo = pesosUtSuperposicionGeo(seccion, clavesSec);
  const usarGeo = pesosGeo.size > 0;

  const pesos = new Map<string, PesoColoniaUt>();

  for (const ut of utsSec) {
    const validos = enlacesValidosUt(seccion, ut, enlacesColoniaUt);
    if (!validos.length) continue;

    const pesoUt = usarGeo
      ? (pesosGeo.get(ut.clave) ?? 0)
      : 1 / ut.seccionesElectorales.length;

    if (pesoUt <= 0) continue;

    const nombres = validos.map((v) => v.coloniaNombre);
    const pesosColoniaUt = validos.length > 1 ? pesosColoniasCompartenUt(seccion, ut.clave, nombres) : null;
    const canonicaSinSubgeo =
      !pesosColoniaUt && validos.length > 1 ? coloniaCanonicaUt(ut.nombre, nombres) : null;

    for (const enlace of validos) {
      let share: number;
      if (pesosColoniaUt) {
        share = pesoUt * (pesosColoniaUt.get(enlace.coloniaNombre) ?? 0);
      } else if (canonicaSinSubgeo) {
        share = enlace.coloniaNombre === canonicaSinSubgeo ? pesoUt : 0;
      } else if (validos.length > 1) {
        share = pesoUt / validos.length;
      } else {
        share = pesoUt;
      }

      if (share <= 0) continue;

      const prev = pesos.get(enlace.coloniaNombre);
      const nuevoPeso = (prev?.peso ?? 0) + share;
      const utPrincipal =
        !prev || share >= prev.peso
          ? { utClave: ut.clave, utNombre: ut.nombre }
          : { utClave: prev.utClave, utNombre: prev.utNombre };
      pesos.set(enlace.coloniaNombre, {
        peso: nuevoPeso,
        ...utPrincipal,
      });
    }
  }

  colapsarColoniasMismaUt(pesos);
  return pesos;
}
