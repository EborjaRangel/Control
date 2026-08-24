import { readFileSync, existsSync } from "fs";
import { esSeccionValida } from "./secciones-electorales.js";
import { resolveBackDataPath } from "./back-data-path.js";
import { prisma } from "./prisma.js";

const CASILLAS_FILE = resolveBackDataPath("electoral", "casillas-coyoacan-2024.json");

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
let cacheOrigen: "db" | "json" | null = null;

const CASILLAS_VACIO: CasillasCoyoacanDataset = {
  vigencia: "2024",
  fuente: "INE PREP",
  urlFuente: "https://prep2024.ine.mx/publicacion/nacional/assets/20240602_CATALOGO_CASILLAS_PEF24.zip",
  generadoEn: "",
  totalCasillas: 0,
  totalSecciones: 0,
  porSeccion: {},
};

export function origenCasillasCoyoacan() {
  return cacheOrigen;
}

export function invalidarCacheCasillasCoyoacan() {
  cache = null;
  cacheOrigen = null;
}

export function casillasDatasetDisponible() {
  if (cache && cache.totalCasillas > 0) return true;
  return existsSync(CASILLAS_FILE);
}

export async function hidratarCasillasDesdeDb(): Promise<boolean> {
  const catalogo = await prisma.casillaElectoralCatalogo.findFirst({
    include: { casillas: true },
    orderBy: { vigencia: "desc" },
  });
  if (!catalogo?.casillas.length) return false;

  const porSeccion: Record<string, SeccionCasillasResumenDTO> = {};
  for (const casilla of catalogo.casillas) {
    const actual = porSeccion[casilla.seccion] ?? {
      seccion: casilla.seccion,
      basicas: 0,
      contiguas: 0,
      total: 0,
      casillas: [],
    };
    actual.casillas.push({
      id: casilla.id,
      seccion: casilla.seccion,
      numero: casilla.numero,
      tipo: casilla.tipo === "CONTIGUA" ? "CONTIGUA" : "BASICA",
      tipoLabel: casilla.tipoLabel,
      extContigua: casilla.extContigua,
      listaNominal: casilla.listaNominal,
      distritoFederal: casilla.distritoFederal,
    });
    if (casilla.tipo === "CONTIGUA") actual.contiguas += 1;
    else actual.basicas += 1;
    actual.total = actual.casillas.length;
    porSeccion[casilla.seccion] = actual;
  }

  for (const info of Object.values(porSeccion)) {
    info.casillas.sort((a, b) => a.numero - b.numero);
  }

  cache = {
    vigencia: catalogo.vigencia,
    fuente: catalogo.fuente,
    urlFuente: catalogo.urlFuente,
    generadoEn: catalogo.generadoEn.toISOString(),
    totalCasillas: catalogo.totalCasillas,
    totalSecciones: catalogo.totalSecciones,
    porSeccion,
  };
  cacheOrigen = "db";
  return true;
}

export function cargarCasillasCoyoacan(): CasillasCoyoacanDataset {
  if (cache) return cache;
  if (!existsSync(CASILLAS_FILE)) {
    cache = { ...CASILLAS_VACIO, porSeccion: {} };
    return cache;
  }
  cache = JSON.parse(readFileSync(CASILLAS_FILE, "utf8")) as CasillasCoyoacanDataset;
  cacheOrigen = "json";
  return cache;
}

export function leerCasillasDesdeArchivo(): CasillasCoyoacanDataset | null {
  if (!existsSync(CASILLAS_FILE)) return null;
  return JSON.parse(readFileSync(CASILLAS_FILE, "utf8")) as CasillasCoyoacanDataset;
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

/** Distrito federal INE de una sección (catálogo de casillas 2024). */
export function distritoFederalDeSeccion(seccion: string): number | null {
  const info = casillasDeSeccion(seccion);
  if (!info?.casillas?.length) return null;
  const distritos = [...new Set(info.casillas.map((c) => c.distritoFederal))]
    .filter((d) => d > 0)
    .sort((a, b) => a - b);
  if (!distritos.length) return null;
  return distritos[0] ?? null;
}
