import { existsSync, readFileSync, statSync } from "fs";
import { prisma } from "./prisma.js";
import { resolveBackDataPath } from "./back-data-path.js";
import type { Prisma } from "../generated/prisma/client.js";

const RESULTADOS_FILE = resolveBackDataPath("electoral", "resultados-alcaldia-coyoacan.json");

export type PartidoVotosSeccion = {
  clave: string;
  etiqueta: string;
  votos: number;
  porcentaje: number;
};

export type ResultadoAlcaldiaSeccion = {
  listaNominal: number;
  votacionTotal: number;
  participacionPct: number;
  votosNulos: number;
  votosNulosPct: number;
  partidos: PartidoVotosSeccion[];
};

export type ResultadoAlcaldiaAnio = {
  anio: number;
  fuente: string;
  urlFuente: string;
  generadoEn: string;
  porSeccion: Record<string, ResultadoAlcaldiaSeccion>;
};

export type AnioAlcaldiaResultados = 2015 | 2018 | 2021 | 2024;

export type ResultadosAlcaldiaCoyoacanDataset = {
  "2015"?: ResultadoAlcaldiaAnio;
  "2018"?: ResultadoAlcaldiaAnio;
  "2021"?: ResultadoAlcaldiaAnio;
  "2024"?: ResultadoAlcaldiaAnio;
};

let cache: ResultadosAlcaldiaCoyoacanDataset | null = null;
let cacheMtimeMs = 0;
let cacheOrigen: "db" | "json" | null = null;

function datasetTieneAnios(data: ResultadosAlcaldiaCoyoacanDataset | null) {
  if (!data) return false;
  return (["2015", "2018", "2021", "2024"] as const).some(
    (anio) => Object.keys(data[anio]?.porSeccion ?? {}).length > 0,
  );
}

export function resultadosAlcaldiaDisponibles() {
  if (datasetTieneAnios(cache)) return true;
  return existsSync(RESULTADOS_FILE);
}

export function origenResultadosAlcaldia() {
  return cacheOrigen;
}

export function invalidarCacheResultadosAlcaldia() {
  cache = null;
  cacheMtimeMs = 0;
  cacheOrigen = null;
}

function datasetDesdeJson(): ResultadosAlcaldiaCoyoacanDataset {
  if (!existsSync(RESULTADOS_FILE)) return {};
  const mtimeMs = statSync(RESULTADOS_FILE).mtimeMs;
  if (cache && cacheOrigen === "json" && cacheMtimeMs === mtimeMs) return cache;
  cache = JSON.parse(readFileSync(RESULTADOS_FILE, "utf8")) as ResultadosAlcaldiaCoyoacanDataset;
  cacheMtimeMs = mtimeMs;
  cacheOrigen = "json";
  return cache;
}

function partidosDeJson(value: Prisma.JsonValue): PartidoVotosSeccion[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PartidoVotosSeccion => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.clave === "string" && typeof row.votos === "number";
  });
}

export async function hidratarResultadosAlcaldiaDesdeDb(): Promise<boolean> {
  const procesos = await prisma.resultadoAlcaldiaProceso.findMany({
    include: { secciones: true },
    orderBy: { anio: "asc" },
  });
  if (!procesos.length) return false;

  const data: ResultadosAlcaldiaCoyoacanDataset = {};
  for (const proceso of procesos) {
    if (proceso.anio !== 2015 && proceso.anio !== 2018 && proceso.anio !== 2021 && proceso.anio !== 2024) {
      continue;
    }
    const porSeccion: Record<string, ResultadoAlcaldiaSeccion> = {};
    for (const seccion of proceso.secciones) {
      porSeccion[seccion.seccion] = {
        listaNominal: seccion.listaNominal,
        votacionTotal: seccion.votacionTotal,
        participacionPct: seccion.participacionPct,
        votosNulos: seccion.votosNulos,
        votosNulosPct: seccion.votosNulosPct,
        partidos: partidosDeJson(seccion.partidos),
      };
    }
    data[String(proceso.anio) as keyof ResultadosAlcaldiaCoyoacanDataset] = {
      anio: proceso.anio,
      fuente: proceso.fuente,
      urlFuente: proceso.urlFuente,
      generadoEn: proceso.generadoEn.toISOString(),
      porSeccion,
    };
  }

  if (!datasetTieneAnios(data)) return false;
  cache = data;
  cacheMtimeMs = Date.now();
  cacheOrigen = "db";
  return true;
}

export function cargarResultadosAlcaldiaCoyoacan(): ResultadosAlcaldiaCoyoacanDataset {
  if (datasetTieneAnios(cache)) return cache!;
  return datasetDesdeJson();
}

export function resultadoAlcaldiaSeccion(
  anio: AnioAlcaldiaResultados,
  seccion: string,
): ResultadoAlcaldiaSeccion | null {
  const data = cargarResultadosAlcaldiaCoyoacan();
  return data[String(anio) as keyof ResultadosAlcaldiaCoyoacanDataset]?.porSeccion[seccion] ?? null;
}

export function leerResultadosAlcaldiaDesdeArchivo(): ResultadosAlcaldiaCoyoacanDataset {
  if (!existsSync(RESULTADOS_FILE)) return {};
  return JSON.parse(readFileSync(RESULTADOS_FILE, "utf8")) as ResultadosAlcaldiaCoyoacanDataset;
}
