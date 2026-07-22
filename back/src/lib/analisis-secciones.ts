import { prisma } from "./prisma.js";
import {
  cargarCasillasCoyoacan,
  casillasDatasetDisponible,
  type SeccionCasillasResumenDTO,
} from "./casillas-electorales.js";
import {
  cargarResultadosAlcaldiaCoyoacan,
  resultadosAlcaldiaDisponibles,
  type ResultadoAlcaldiaSeccion,
} from "./resultados-alcaldia-iecm.js";
import {
  SECCIONES_ELECTORALES_COYOACAN,
  distritoLocalDeSeccion,
} from "./secciones-electorales.js";

export type CasillaElectoresDetalle = {
  etiqueta: string;
  listaNominal: number;
};

export type AnalisisSeccionRow = {
  seccion: string;
  casillas: string;
  totalCasillas: number;
  basicas: number;
  contiguas: number;
  casillasDetalle: CasillaElectoresDetalle[];
  unidadesTerritoriales: string;
  colonias: string;
  totalElectores: number;
  distritoLocal: number | null;
  distritoFederal: number | null;
  alcalde2021: ResultadoAlcaldiaSeccion | null;
  alcalde2024: ResultadoAlcaldiaSeccion | null;
};

export type AnalisisSeccionesResponse = {
  vigencia: string | null;
  fuente: string | null;
  totalSecciones: number;
  filas: AnalisisSeccionRow[];
};

function etiquetaCasillas(info: SeccionCasillasResumenDTO | null): string {
  if (!info?.casillas?.length) return "—";
  return info.casillas
    .map((c) => `${c.numero} ${c.tipoLabel}`)
    .join(", ");
}

function totalElectoresSeccion(info: SeccionCasillasResumenDTO | null): number {
  if (!info?.casillas?.length) return 0;
  return info.casillas.reduce((sum, casilla) => sum + casilla.listaNominal, 0);
}

function casillasDetalleElectores(info: SeccionCasillasResumenDTO | null): CasillaElectoresDetalle[] {
  if (!info?.casillas?.length) return [];
  return [...info.casillas]
    .sort((a, b) => a.numero - b.numero)
    .map((casilla) => ({
      etiqueta: `${casilla.numero} ${casilla.tipoLabel}`,
      listaNominal: casilla.listaNominal,
    }));
}

function distritoFederalSeccion(info: SeccionCasillasResumenDTO | null): number | null {
  if (!info?.casillas?.length) return null;
  const distritos = [...new Set(info.casillas.map((c) => c.distritoFederal))].sort((a, b) => a - b);
  if (distritos.length === 0) return null;
  if (distritos.length === 1) return distritos[0] ?? null;
  return distritos[0] ?? null;
}

async function coloniasPorSeccion(): Promise<Map<string, Set<string>>> {
  const enlaces = await prisma.coloniaUnidadTerritorial.findMany({
    include: {
      unidadTerritorial: { select: { seccionesElectorales: true } },
    },
  });

  const mapa = new Map<string, Set<string>>();
  for (const enlace of enlaces) {
    for (const seccion of enlace.unidadTerritorial.seccionesElectorales) {
      const lista = mapa.get(seccion) ?? new Set<string>();
      lista.add(enlace.coloniaNombre);
      mapa.set(seccion, lista);
    }
  }
  return mapa;
}

async function utsPorSeccion(): Promise<Map<string, Set<string>>> {
  const uts = await prisma.unidadTerritorial.findMany({
    select: { clave: true, nombre: true, seccionesElectorales: true },
    orderBy: { clave: "asc" },
  });

  const mapa = new Map<string, Set<string>>();
  for (const ut of uts) {
    const etiqueta = `${ut.clave} — ${ut.nombre}`;
    for (const seccion of ut.seccionesElectorales) {
      const lista = mapa.get(seccion) ?? new Set<string>();
      lista.add(etiqueta);
      mapa.set(seccion, lista);
    }
  }
  return mapa;
}

function etiquetaLista(set: Set<string> | undefined): string {
  if (!set?.size) return "—";
  return [...set]
    .map((v) => v.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"))
    .join(", ");
}

export async function analisisSeccionesElectorales(): Promise<AnalisisSeccionesResponse> {
  const [coloniasMap, utsMap] = await Promise.all([coloniasPorSeccion(), utsPorSeccion()]);

  const dataset = casillasDatasetDisponible() ? cargarCasillasCoyoacan() : null;
  const resultados = resultadosAlcaldiaDisponibles() ? cargarResultadosAlcaldiaCoyoacan() : null;

  const filas: AnalisisSeccionRow[] = SECCIONES_ELECTORALES_COYOACAN.map((seccion) => {
    const info = dataset?.porSeccion[seccion] ?? null;
    return {
      seccion,
      casillas: etiquetaCasillas(info),
      totalCasillas: info?.total ?? 0,
      basicas: info?.basicas ?? 0,
      contiguas: info?.contiguas ?? 0,
      casillasDetalle: casillasDetalleElectores(info),
      unidadesTerritoriales: etiquetaLista(utsMap.get(seccion)),
      colonias: etiquetaLista(coloniasMap.get(seccion)),
      totalElectores: totalElectoresSeccion(info),
      distritoLocal: distritoLocalDeSeccion(seccion),
      distritoFederal: distritoFederalSeccion(info),
      alcalde2021: resultados?.["2021"]?.porSeccion[seccion] ?? null,
      alcalde2024: resultados?.["2024"]?.porSeccion[seccion] ?? null,
    };
  }).sort(
    (a, b) =>
      b.totalCasillas - a.totalCasillas ||
      b.totalElectores - a.totalElectores ||
      Number(a.seccion) - Number(b.seccion),
  );

  return {
    vigencia: dataset?.vigencia ?? null,
    fuente: dataset?.fuente ?? null,
    totalSecciones: SECCIONES_ELECTORALES_COYOACAN.length,
    filas,
  };
}
