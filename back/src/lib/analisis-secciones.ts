import { prisma } from "./prisma.js";
import { compararNumeroDirigente, nombreCompleto } from "./dirigentes.js";
import {
  cargarCasillasCoyoacan,
  casillasDatasetDisponible,
  casillasDeSeccion,
  distritoFederalDeSeccion,
  type SeccionCasillasResumenDTO,
} from "./casillas-electorales.js";
import {
  cargarResultadosAlcaldiaCoyoacan,
  resultadosAlcaldiaDisponibles,
  type AnioAlcaldiaResultados,
  type ResultadoAlcaldiaSeccion,
} from "./resultados-alcaldia-iecm.js";
import {
  SECCIONES_ELECTORALES_COYOACAN,
  distritoLocalDeSeccion,
} from "./secciones-electorales.js";
import {
  cargarDatosColoniasSeccion,
  estimarColoniasSeccion,
  type ColoniasSeccionInfo,
} from "./colonias-seccion.js";

export type ColoniaSeccionDetalle = ColoniasSeccionInfo["colonias"][number];

export type AnalisisSeccionRow = {
  seccion: string;
  dirigentes: string;
  casillas: string;
  totalCasillas: number;
  basicas: number;
  contiguas: number;
  unidadesTerritoriales: string;
  colonias: string;
  coloniasDetalle: ColoniasSeccionInfo;
  totalElectores: number;
  distritoLocal: number | null;
  distritoFederal: number | null;
  alcalde2015: ResultadoAlcaldiaSeccion | null;
  alcalde2018: ResultadoAlcaldiaSeccion | null;
  alcalde2021: ResultadoAlcaldiaSeccion | null;
  alcalde2024: ResultadoAlcaldiaSeccion | null;
};

export type AnalisisSeccionesResponse = {
  vigencia: string | null;
  fuente: string | null;
  totalSecciones: number;
  resultadosAlcaldiaAnios: AnioAlcaldiaResultados[];
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

async function dirigentesPorSeccion(): Promise<Map<string, string[]>> {
  const dirigentes = await prisma.dirigente.findMany({
    where: { status: { not: "BAJA" } },
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
      seccionElectoral: true,
    },
  });

  const mapa = new Map<string, typeof dirigentes>();
  for (const dirigente of dirigentes) {
    const lista = mapa.get(dirigente.seccionElectoral) ?? [];
    lista.push(dirigente);
    mapa.set(dirigente.seccionElectoral, lista);
  }

  const resultado = new Map<string, string[]>();
  for (const [seccion, lista] of mapa) {
    resultado.set(
      seccion,
      lista
        .sort(compararNumeroDirigente)
        .map((d) => nombreCompleto(d)),
    );
  }
  return resultado;
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

function etiquetaDirigentes(nombres: string[] | undefined): string {
  if (!nombres?.length) return "";
  return nombres
    .map((v) => v.trim())
    .filter(Boolean)
    .join(", ");
}

export async function analisisSeccionesElectorales(): Promise<AnalisisSeccionesResponse> {
  const [datosColonias, utsMap, dirigentesMap] = await Promise.all([
    cargarDatosColoniasSeccion(),
    utsPorSeccion(),
    dirigentesPorSeccion(),
  ]);
  const coloniasMap = datosColonias.mapa;

  const dataset = casillasDatasetDisponible() ? cargarCasillasCoyoacan() : null;
  const resultados = resultadosAlcaldiaDisponibles() ? cargarResultadosAlcaldiaCoyoacan() : null;

  const filas: AnalisisSeccionRow[] = SECCIONES_ELECTORALES_COYOACAN.map((seccion) => {
    const info = dataset?.porSeccion[seccion] ?? null;
    const totalElectores = totalElectoresSeccion(info);
    const nombresColonias = [...(coloniasMap.get(seccion) ?? [])];
    const coloniasDetalle = estimarColoniasSeccion(
      seccion,
      nombresColonias,
      totalElectores,
      datosColonias.dirigentesPorSeccionColonia.get(seccion) ?? new Map(),
      {
        utsPorColonia: datosColonias.utsPorColonia,
        uts: datosColonias.uts,
        enlacesColoniaUt: datosColonias.enlacesColoniaUt,
      },
    );

    return {
      seccion,
      dirigentes: etiquetaDirigentes(dirigentesMap.get(seccion)),
      casillas: etiquetaCasillas(info),
      totalCasillas: info?.total ?? 0,
      basicas: info?.basicas ?? 0,
      contiguas: info?.contiguas ?? 0,
      unidadesTerritoriales: etiquetaLista(utsMap.get(seccion)),
      colonias: coloniasDetalle.etiquetaLista,
      coloniasDetalle,
      totalElectores,
      distritoLocal: distritoLocalDeSeccion(seccion),
      distritoFederal: distritoFederalDeSeccion(seccion),
      alcalde2015: resultados?.["2015"]?.porSeccion[seccion] ?? null,
      alcalde2018: resultados?.["2018"]?.porSeccion[seccion] ?? null,
      alcalde2021: resultados?.["2021"]?.porSeccion[seccion] ?? null,
      alcalde2024: resultados?.["2024"]?.porSeccion[seccion] ?? null,
    };
  }).sort(
    (a, b) =>
      b.totalCasillas - a.totalCasillas ||
      b.totalElectores - a.totalElectores ||
      Number(a.seccion) - Number(b.seccion),
  );

  const resultadosAlcaldiaAnios = resultados
    ? ([2015, 2018, 2021, 2024] as const).filter(
        (anio) => Object.keys(resultados[String(anio)]?.porSeccion ?? {}).length > 0,
      )
    : [];

  return {
    vigencia: dataset?.vigencia ?? null,
    fuente: dataset?.fuente ?? null,
    totalSecciones: SECCIONES_ELECTORALES_COYOACAN.length,
    resultadosAlcaldiaAnios,
    filas,
  };
}
