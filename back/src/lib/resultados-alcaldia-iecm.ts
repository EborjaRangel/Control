import { existsSync, readFileSync, statSync } from "fs";
import { resolveBackDataPath } from "./back-data-path.js";

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

export function resultadosAlcaldiaDisponibles() {
  return existsSync(RESULTADOS_FILE);
}

export function invalidarCacheResultadosAlcaldia() {
  cache = null;
  cacheMtimeMs = 0;
}

export function cargarResultadosAlcaldiaCoyoacan(): ResultadosAlcaldiaCoyoacanDataset {
  if (!existsSync(RESULTADOS_FILE)) {
    cache = {};
    cacheMtimeMs = 0;
    return cache;
  }

  const mtimeMs = statSync(RESULTADOS_FILE).mtimeMs;
  if (cache && cacheMtimeMs === mtimeMs) return cache;

  cache = JSON.parse(readFileSync(RESULTADOS_FILE, "utf8")) as ResultadosAlcaldiaCoyoacanDataset;
  cacheMtimeMs = mtimeMs;
  return cache;
}

export function resultadoAlcaldiaSeccion(
  anio: AnioAlcaldiaResultados,
  seccion: string,
): ResultadoAlcaldiaSeccion | null {
  const data = cargarResultadosAlcaldiaCoyoacan();
  return data[String(anio) as keyof ResultadosAlcaldiaCoyoacanDataset]?.porSeccion[seccion] ?? null;
}
