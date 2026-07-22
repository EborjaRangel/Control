import { existsSync, readFileSync } from "fs";
import path from "path";
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

export type ResultadosAlcaldiaCoyoacanDataset = {
  "2021"?: ResultadoAlcaldiaAnio;
  "2024"?: ResultadoAlcaldiaAnio;
};

let cache: ResultadosAlcaldiaCoyoacanDataset | null = null;

export function resultadosAlcaldiaDisponibles() {
  return existsSync(RESULTADOS_FILE);
}

export function cargarResultadosAlcaldiaCoyoacan(): ResultadosAlcaldiaCoyoacanDataset {
  if (cache) return cache;
  if (!existsSync(RESULTADOS_FILE)) {
    cache = {};
    return cache;
  }
  cache = JSON.parse(readFileSync(RESULTADOS_FILE, "utf8")) as ResultadosAlcaldiaCoyoacanDataset;
  return cache;
}

export function resultadoAlcaldiaSeccion(
  anio: 2021 | 2024,
  seccion: string,
): ResultadoAlcaldiaSeccion | null {
  const data = cargarResultadosAlcaldiaCoyoacan();
  const bucket = anio === 2021 ? data["2021"] : data["2024"];
  return bucket?.porSeccion[seccion] ?? null;
}
