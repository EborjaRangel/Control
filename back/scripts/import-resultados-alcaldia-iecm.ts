/**
 * Importa resultados de alcaldía en Coyoacán por sección/casilla (IECM/IEDF).
 *
 * Fuentes:
 * - 2024: https://estadisticaresultadospelo2024.iecm.mx/archivos/downloadalc.php
 * - 2021: https://www.iecm.mx/www/estadisticaresultadospelo2021/archivos/downloadalc.php
 *   (formato distinto: hoja ResultadosCasillas)
 * - 2018: https://www.iecm.mx/www/estadisticaresultadospelo2018/archivos/bd2018alccas.xls
 *   (columnas DEM, SECCIÓN, LN, VT, VN)
 * - 2015: https://www.iecm.mx/www/estadisticaresultadospelo2015/archivos/bd2015jefcas.xls
 *   (jefaturas delegacionales; descarga manual si el IECM bloquea bots)
 *
 * Uso: npm run electoral:import-resultados-alcaldia -w control-back
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import XLSX from "xlsx";
import { SECCIONES_ELECTORALES_COYOACAN } from "../src/lib/secciones-electorales.js";
import {
  clavePartidoHomologada2015,
  esCoalicion2015,
  esColumnaTicketCoalicion2015,
  etiquetaPartidoHomologada2015,
} from "../src/lib/homologacion-partidos-2015.js";
import type {
  PartidoVotosSeccion,
  ResultadoAlcaldiaAnio,
  ResultadoAlcaldiaSeccion,
  ResultadosAlcaldiaCoyoacanDataset,
} from "../src/lib/resultados-alcaldia-iecm.js";

const rootDir = path.join(import.meta.dirname, "..");
const rawDir = path.join(rootDir, "data/electoral/raw");
const outFile = path.join(rootDir, "data/electoral/resultados-alcaldia-coyoacan.json");

const FUENTES = {
  2024: {
    url: "https://estadisticaresultadospelo2024.iecm.mx/archivos/downloadalc.php",
    archivo: "bd2024alccas.xlsx",
    fuente:
      "Instituto Electoral de la Ciudad de México (IECM) — Estadística de resultados PELO 2023-2024, elección de alcaldías por casilla",
  },
  2021: {
    url: "https://www.iecm.mx/www/estadisticaresultadospelo2021/archivos/downloadalc.php",
    archivo: "bd2021alccas.xlsx",
    fuente:
      "Instituto Electoral de la Ciudad de México (IECM/IEDF) — Estadística de resultados PELO 2020-2021, elección de alcaldías por casilla",
  },
  2018: {
    url: "https://www.iecm.mx/www/estadisticaresultadospelo2018/archivos/bd2018alccas.xls",
    archivo: "bd2018alccas.xls",
    fuente:
      "Instituto Electoral de la Ciudad de México (IECM/IEDF) — Estadística de resultados PELO 2017-2018, elección de alcaldías por casilla",
  },
  2015: {
    url: "https://www.iecm.mx/www/estadisticaresultadospelo2015/archivos/bd2015jefcas.xls",
    archivo: "bd2015jefcas.xls",
    archivosAlternativos: ["bd2015jefcas.xlsx", "eleccion2015coyoacan.xlsx"],
    urlsAlternativas: [
      "https://www.iecm.mx/www/estadisticaresultadospelo2015/archivos/bd2015jefcas.xlsx",
      "https://www.iecm.mx/www/estadisticaresultadospelo2015/archivos/downloadjef.php",
    ],
    fuente:
      "Instituto Electoral de la Ciudad de México (IEDF/IECM) — Estadística de resultados PELO 2014-2015, elección de jefaturas delegacionales por casilla",
  },
} as const;

type AnioImport = keyof typeof FUENTES;

const seccionesValidas = new Set(SECCIONES_ELECTORALES_COYOACAN);

const META_HEADERS = new Set(
  [
    "Distrito electoral local",
    "Clave demarcación territorial",
    "Demarcación territorial",
    "Sección electoral",
    "Sección",
    "Casilla electoral",
    "Casilla",
    "Distrito local",
    "Clave dem",
    "Tipo casilla",
    "Id casilla",
    "Ext contigua",
    "Votos totales",
    "Votación total",
    "Lista nominal",
    "Votos nulos",
    "Vn",
    "Votos candidatos no registrados",
    "Cnr",
    "Dem",
    "Clave dem",
    "Dtto loc",
    "Circunscripcion",
    "Cas",
    "Ln",
    "Vt",
    "Vn",
    "Gga",
    "Gmr",
    "Jcmn",
    "Mhg",
    "Jmpr",
    "Votacion total pt mor pes",
    "Votacion total pan prd mc",
    "Circunscripcion",
    "Id estado",
    "Nombre estado",
    "Id distrito",
    "Cabecera distrital",
    "Id municipio",
    "Municipio",
    "Num votos validos",
    "Total votos",
    "Num votos nulos",
    "Num votos can nreg",
    "Estatus acta",
    "Tepjf",
    "Observaciones",
    "Ruta acta",
  ].map(normalizarHeader),
);

function indiceHeader(headers: string[], ...candidatos: string[]) {
  for (const candidato of candidatos) {
    const idx = headers.findIndex((h) => normalizarHeader(h) === candidato);
    if (idx >= 0) return idx;
  }
  return -1;
}

function localizarHojaCasillas(wb: XLSX.WorkBook) {
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    for (let i = 0; i < Math.min(matrix.length, 25); i++) {
      const row = matrix[i] ?? [];
      const normalized = row.map(normalizarHeader);
      const tieneSeccion =
        normalized.includes("seccion electoral") || normalized.includes("seccion");
      const tieneListaNominal =
        normalized.includes("lista nominal") || normalized.includes("ln");
      if (tieneSeccion && tieneListaNominal) {
        return { matrix, headerRow: i, headers: row.map((cell) => String(cell ?? "").trim()) };
      }
    }
  }
  return null;
}

function normalizarSeccion(value: unknown) {
  if (value == null || value === "") return "";
  return String(Number(String(value).trim()));
}

function normalizarHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

const CLAVES_PARTIDO_EXCLUIDAS = new Set([
  "CNR",
  "DISTRITO_LOCAL",
  "CLAVE_DEM",
  "ID_CASILLA",
  "SECCION",
  "CASILLA",
  "TIPO_CASILLA",
  "EXT_CONTIGUA",
]);

function esClavePartidoValida(clave: string) {
  return !CLAVES_PARTIDO_EXCLUIDAS.has(clave.toUpperCase());
}

function etiquetaPartido(clave: string, anio?: AnioImport) {
  if (anio === 2015) return etiquetaPartidoHomologada2015(clave);
  return clave.replaceAll("_", "-");
}

function acumularVotoPartido(
  acum: Record<string, number>,
  claveRaw: string,
  votos: number,
  anio: AnioImport,
) {
  if (votos <= 0) return;
  const claveNorm = anio === 2015 ? clavePartidoHomologada2015(claveRaw) : claveRaw;
  if (anio === 2015 && esCoalicion2015(claveRaw)) return;
  if (!esClavePartidoValida(claveNorm)) return;
  acum[claveNorm] = (acum[claveNorm] ?? 0) + votos;
}

function cargarDatasetExistente(): ResultadosAlcaldiaCoyoacanDataset {
  if (!existsSync(outFile)) return {};
  try {
    return JSON.parse(readFileSync(outFile, "utf8")) as ResultadosAlcaldiaCoyoacanDataset;
  } catch {
    console.warn(`No se pudo leer ${outFile}; se regenerará desde cero.`);
    return {};
  }
}

function esArchivoHojaCalculo(filePath: string): boolean {
  try {
    const head = readFileSync(filePath).subarray(0, 4);
    const ole = head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0;
    const zip = head[0] === 0x50 && head[1] === 0x4b;
    return ole || zip;
  } catch {
    return false;
  }
}

function redondearPct(value: number) {
  return Math.round(value * 100) / 100;
}

function candidatosArchivo2015(meta: (typeof FUENTES)[2015]) {
  return [meta.archivo, ...(meta.archivosAlternativos ?? [])];
}

function validarArchivoImport(pathArchivo: string) {
  if (!esArchivoHojaCalculo(pathArchivo)) {
    throw new Error("El archivo descargado no es una hoja de cálculo válida");
  }
  XLSX.readFile(pathArchivo);
}

async function descargarArchivoIecm(url: string, destino: string) {
  const res = await fetch(url, {
    headers: {
      Accept: "*/*",
      "User-Agent": "Mozilla/5.0 (compatible; control-back-import/1.0)",
    },
  });
  if (!res.ok) return res.status;
  if (!res.body) throw new Error("Respuesta vacía al descargar resultados IECM");
  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(destino));
  return 200;
}

async function ensureXlsx(anio: AnioImport) {
  mkdirSync(rawDir, { recursive: true });
  const meta = FUENTES[anio];
  const candidatos =
    anio === 2015 ? candidatosArchivo2015(meta) : [meta.archivo];

  for (const nombre of candidatos) {
    const candidato = path.join(rawDir, nombre);
    if (!existsSync(candidato)) continue;
    try {
      validarArchivoImport(candidato);
      return candidato;
    } catch {
      console.warn(`Archivo dañado, se volverá a descargar: ${nombre}`);
    }
  }

  const target = path.join(rawDir, meta.archivo);
  const urls =
    anio === 2015
      ? [
          meta.url,
          ...(meta.urlsAlternativas ?? []),
          ...candidatosArchivo2015(meta).map(
            (nombre) =>
              `https://www.iecm.mx/www/estadisticaresultadospelo2015/archivos/${nombre}`,
          ),
        ]
      : [meta.url];

  for (const url of [...new Set(urls)]) {
    console.log(`Descargando ${meta.archivo} desde ${url}…`);
    try {
      const status = await descargarArchivoIecm(url, target);
      if (status !== 200) continue;
      validarArchivoImport(target);
      return target;
    } catch {
      // probar siguiente URL
    }
  }

  for (const nombre of candidatos) {
    const candidato = path.join(rawDir, nombre);
    if (!existsSync(candidato)) continue;
    try {
      validarArchivoImport(candidato);
      return candidato;
    } catch {
      // sigue
    }
  }

  if (anio === 2021 || anio === 2018 || anio === 2015) {
    throw new Error(
      `No se pudo obtener ${candidatos.join(" ni ")}. Descárgalo manualmente desde el IECM (Jefaturas delegacionales 2015 → BASE DE DATOS) y colócalo en data/electoral/raw/`,
    );
  }
  throw new Error(`Descarga IECM fallida (${anio})`);
}

type FilaCasilla = {
  seccion: string;
  listaNominal: number;
  votosTotales: number;
  votosNulos: number;
  votosCnr: number;
  partidos: Record<string, number>;
};

function parseXlsxAlcaldia(xlsxPath: string, anio: AnioImport): ResultadoAlcaldiaAnio {
  const wb = XLSX.readFile(xlsxPath);
  const located = localizarHojaCasillas(wb);
  if (!located) throw new Error(`No se encontró encabezado en ${xlsxPath}`);

  const { matrix, headerRow, headers } = located;

  const partyColumns: { index: number; clave: string }[] = [];
  headers.forEach((header, index) => {
    const norm = normalizarHeader(header);
    if (!header || META_HEADERS.has(norm)) return;
    const clave = header.replace(/\s+/g, "_").toUpperCase();
    if (/^CAND_IND\d*$/.test(clave)) return;
    if (anio === 2015 && esColumnaTicketCoalicion2015(clave)) return;
    if (anio === 2015 && esCoalicion2015(clave)) return;
    partyColumns.push({ index, clave });
  });

  const idxDem = indiceHeader(
    headers,
    "demarcacion territorial",
    "dem",
    "municipio",
    "demarcacion",
  );
  const idxSeccion = indiceHeader(headers, "seccion electoral", "seccion");
  const idxListaNominal = indiceHeader(headers, "lista nominal", "ln");
  const idxVotosTotales = indiceHeader(
    headers,
    "votos totales",
    "votacion total",
    "vt",
    "total votos",
  );
  const idxVotosNulos = indiceHeader(headers, "votos nulos", "vn", "num votos nulos");
  const idxVotosCnr = indiceHeader(
    headers,
    "votos candidatos no registrados",
    "cnr",
    "num votos can nreg",
  );

  if (
    idxDem < 0 ||
    idxSeccion < 0 ||
    idxListaNominal < 0 ||
    idxVotosTotales < 0 ||
    idxVotosNulos < 0 ||
    idxVotosCnr < 0
  ) {
    throw new Error(`Columnas incompletas en ${xlsxPath}`);
  }

  const filas: FilaCasilla[] = [];
  for (const row of matrix.slice(headerRow + 1)) {
    if (!row?.length) continue;
    const demarcacion = String(row[idxDem] ?? "");
    if (!/coyoac/i.test(demarcacion)) continue;

    const seccion = normalizarSeccion(row[idxSeccion]);
    if (!seccion || !seccionesValidas.has(seccion)) continue;

    const listaNominal = Number(row[idxListaNominal]) || 0;
    const votosTotales = Number(row[idxVotosTotales]) || 0;
    const votosNulos = Number(row[idxVotosNulos]) || 0;
    const votosCnr = Number(row[idxVotosCnr]) || 0;

    const partidos: Record<string, number> = {};
    for (const col of partyColumns) {
      acumularVotoPartido(partidos, col.clave, Number(row[col.index]) || 0, anio);
    }

    filas.push({ seccion, listaNominal, votosTotales, votosNulos, votosCnr, partidos });
  }

  const porSeccion: Record<string, ResultadoAlcaldiaSeccion> = {};

  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    const casillas = filas.filter((f) => f.seccion === seccion);
    if (!casillas.length) continue;

    const listaNominal = casillas.reduce((sum, c) => sum + c.listaNominal, 0);
    const votacionTotal = casillas.reduce((sum, c) => sum + c.votosTotales, 0);
    const votosNulos = casillas.reduce((sum, c) => sum + c.votosNulos, 0);
    const votosCnr = casillas.reduce((sum, c) => sum + c.votosCnr, 0);

    const acumPartidos = new Map<string, number>();
    for (const casilla of casillas) {
      for (const [clave, votos] of Object.entries(casilla.partidos)) {
        if (anio === 2015 && esCoalicion2015(clave)) continue;
        const claveNorm = anio === 2015 ? clavePartidoHomologada2015(clave) : clave;
        if (!esClavePartidoValida(claveNorm)) continue;
        acumPartidos.set(claveNorm, (acumPartidos.get(claveNorm) ?? 0) + votos);
      }
    }

    const partidos: PartidoVotosSeccion[] = [...acumPartidos.entries()]
      .filter(([clave, votos]) => votos > 0 && esClavePartidoValida(clave))
      .map(([clave, votos]) => ({
        clave,
        etiqueta: etiquetaPartido(clave, anio),
        votos,
        porcentaje: votacionTotal > 0 ? redondearPct((votos / votacionTotal) * 100) : 0,
      }))
      .sort((a, b) => b.votos - a.votos || a.etiqueta.localeCompare(b.etiqueta, "es"));

    if (votosCnr > 0) {
      partidos.push({
        clave: "CNR",
        etiqueta: "Candidatos no registrados",
        votos: votosCnr,
        porcentaje: votacionTotal > 0 ? redondearPct((votosCnr / votacionTotal) * 100) : 0,
      });
      partidos.sort((a, b) => b.votos - a.votos || a.etiqueta.localeCompare(b.etiqueta, "es"));
    }

    porSeccion[seccion] = {
      listaNominal,
      votacionTotal,
      participacionPct:
        listaNominal > 0 ? redondearPct((votacionTotal / listaNominal) * 100) : 0,
      votosNulos,
      votosNulosPct: votacionTotal > 0 ? redondearPct((votosNulos / votacionTotal) * 100) : 0,
      partidos,
    };
  }

  return {
    anio,
    fuente: FUENTES[anio].fuente,
    urlFuente: FUENTES[anio].url,
    generadoEn: new Date().toISOString(),
    porSeccion,
  };
}

async function main() {
  const dataset = cargarDatasetExistente();
  if (Object.keys(dataset).length > 0) {
    console.log(`Dataset previo: ${Object.keys(dataset).join(", ")}`);
  }

  for (const anio of [2024, 2021, 2018, 2015] as const) {
    try {
      const xlsxPath = await ensureXlsx(anio);
      console.log(`Procesando ${anio}…`);
      const resultado = parseXlsxAlcaldia(xlsxPath, anio);
      dataset[String(anio) as keyof ResultadosAlcaldiaCoyoacanDataset] = resultado;
      const count = Object.keys(resultado.porSeccion).length;
      console.log(`  ${anio}: ${count} secciones`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ${anio}: omitido — ${msg}`);
      if (dataset[String(anio) as keyof ResultadosAlcaldiaCoyoacanDataset]) {
        console.warn(`  ${anio}: se conserva la versión ya presente en ${outFile}`);
      }
    }
  }

  if (!dataset["2024"] && !dataset["2021"] && !dataset["2018"] && !dataset["2015"]) {
    throw new Error("No se importó ningún año de resultados de alcaldía/jefatura");
  }

  writeFileSync(outFile, JSON.stringify(dataset, null, 2));
  console.log(`Escrito ${outFile}`);

  if (!dataset["2021"]) {
    console.warn(
      "2021 no importado. Descarga bd2021alccas.xlsx desde el IECM y vuelve a ejecutar el script.",
    );
  }
  if (!dataset["2015"]) {
    console.warn(
      "2015 no importado. Descarga bd2015jefcas.xlsx desde el IECM (Jefaturas delegacionales → BASE DE DATOS) y colócalo en data/electoral/raw/.",
    );
  }
  if (!dataset["2018"]) {
    console.warn(
      "2018 no importado. Descarga bd2018alccas.xls desde el IECM y vuelve a ejecutar el script.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
