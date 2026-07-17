import { readFileSync, existsSync } from "fs";
import path from "path";
import { esSeccionValida } from "./secciones-electorales.js";

const CASILLAS_FILE = path.join(
  process.cwd(),
  "data/electoral/casillas-coyoacan-2024.json",
);

export type TipoCasillaElectoral = "BASICA" | "CONTIGUA";

export type CasillaElectoralDTO = {
  id: string;
  seccion: string;
  numero: number;
  tipo: TipoCasillaElectoral;
  tipoLabel: string;
  extContigua: number | null;
  listaNominal: number;
  distritoFederal: number;
};

export type SeccionCasillasResumenDTO = {
  seccion: string;
  basicas: number;
  contiguas: number;
  total: number;
  casillas: CasillaElectoralDTO[];
};

export type CasillasCoyoacanDataset = {
  vigencia: string;
  fuente: string;
  urlFuente: string;
  generadoEn: string;
  totalCasillas: number;
  totalSecciones: number;
  porSeccion: Record<string, SeccionCasillasResumenDTO>;
};

let cache: CasillasCoyoacanDataset | null = null;

export function casillasDatasetDisponible() {
  return existsSync(CASILLAS_FILE);
}

export function cargarCasillasCoyoacan(): CasillasCoyoacanDataset {
  if (cache) return cache;
  if (!existsSync(CASILLAS_FILE)) {
    cache = {
      vigencia: "2024",
      fuente: "INE PREP",
      urlFuente:
        "https://prep2024.ine.mx/publicacion/nacional/assets/20240602_CATALOGO_CASILLAS_PEF24.zip",
      generadoEn: "",
      totalCasillas: 0,
      totalSecciones: 0,
      porSeccion: {},
    };
    return cache;
  }
  cache = JSON.parse(readFileSync(CASILLAS_FILE, "utf8")) as CasillasCoyoacanDataset;
  return cache;
}

export function resumenCasillasPorSeccion() {
  const data = cargarCasillasCoyoacan();
  return Object.fromEntries(
    Object.entries(data.porSeccion).map(([seccion, info]) => [
      seccion,
      {
        seccion,
        basicas: info.basicas,
        contiguas: info.contiguas,
        total: info.total,
      },
    ]),
  );
}

export function casillasDeSeccion(seccion: string): SeccionCasillasResumenDTO | null {
  if (!esSeccionValida(seccion)) return null;
  const data = cargarCasillasCoyoacan();
  return data.porSeccion[seccion] ?? null;
}
