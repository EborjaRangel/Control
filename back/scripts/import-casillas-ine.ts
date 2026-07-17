/**
 * Importa casillas básicas y contiguas de Coyoacán desde el catálogo PREP 2024 (PEF).
 *
 * Fuente: https://prep2024.ine.mx/publicacion/nacional/assets/20240602_CATALOGO_CASILLAS_PEF24.zip
 *
 * Uso: npm run electoral:import-casillas -w control-back
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import AdmZip from "adm-zip";
import XLSX from "xlsx";
import { SECCIONES_ELECTORALES_COYOACAN } from "../src/lib/secciones-electorales.js";
import type {
  CasillaElectoralDTO,
  CasillasCoyoacanDataset,
  SeccionCasillasResumenDTO,
  TipoCasillaElectoral,
} from "../src/lib/casillas-electorales.js";

const rootDir = path.join(import.meta.dirname, "..");
const rawDir = path.join(rootDir, "data/electoral/raw");
const outDir = path.join(rootDir, "data/electoral");
const zipPath = path.join(rawDir, "20240602_CATALOGO_CASILLAS_PEF24.zip");
const CATALOG_URL =
  "https://prep2024.ine.mx/publicacion/nacional/assets/20240602_CATALOGO_CASILLAS_PEF24.zip";

const seccionesValidas = new Set(SECCIONES_ELECTORALES_COYOACAN);

function normalizarSeccion(value: unknown) {
  if (value == null || value === "") return "";
  return String(Number(String(value).trim()));
}

function parseTipoCasilla(label: unknown): TipoCasillaElectoral | null {
  const text = String(label ?? "").trim().toUpperCase();
  if (text === "BÁSICA" || text === "BASICA") return "BASICA";
  if (text.startsWith("CONTIGUA")) return "CONTIGUA";
  return null;
}

async function ensureCatalogZip() {
  mkdirSync(rawDir, { recursive: true });
  if (existsSync(zipPath)) return;

  console.log("Descargando catálogo de casillas PREP 2024…");
  const res = await fetch(CATALOG_URL);
  if (!res.ok) throw new Error(`Descarga fallida: ${res.status}`);
  if (!res.body) throw new Error("Respuesta vacía al descargar catálogo");
  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(zipPath));
}

function extraerXlsx() {
  const extractDir = path.join(rawDir, "catalogo");
  mkdirSync(extractDir, { recursive: true });
  const zip = new AdmZip(zipPath);
  const entry = zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith(".xlsx"));
  if (!entry) throw new Error("No se encontró archivo XLSX en el catálogo");
  const target = path.join(extractDir, path.basename(entry.entryName));
  if (!existsSync(target)) {
    zip.extractEntryTo(entry.entryName, extractDir, false, true);
  }
  return target;
}

async function main() {
  await ensureCatalogZip();
  const xlsxPath = extraerXlsx();
  console.log(`Leyendo ${xlsxPath}…`);

  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const porSeccion = new Map<string, SeccionCasillasResumenDTO>();
  let totalCasillas = 0;

  for (const row of rows) {
    if (!/coyoac/i.test(String(row.NOMBRE_MUNICIPIO ?? ""))) continue;

    const seccion = normalizarSeccion(row.SECCION);
    if (!seccion || !seccionesValidas.has(seccion)) continue;

    const tipo = parseTipoCasilla(row.TIPO_CASILLA);
    if (!tipo) continue;

    const numero = Number(row.CASILLA);
    if (!Number.isFinite(numero)) continue;

    const casilla: CasillaElectoralDTO = {
      id: `${seccion}-${numero}`,
      seccion,
      numero,
      tipo,
      tipoLabel: String(row.TIPO_CASILLA ?? "").trim(),
      extContigua: row.EXT_CONTIGUA ? Number(row.EXT_CONTIGUA) : null,
      listaNominal: Number(row.NUM_REG) || 0,
      distritoFederal: Number(row.DISTRITO) || 0,
    };

    if (!porSeccion.has(seccion)) {
      porSeccion.set(seccion, {
        seccion,
        basicas: 0,
        contiguas: 0,
        total: 0,
        casillas: [],
      });
    }

    const bucket = porSeccion.get(seccion)!;
    bucket.casillas.push(casilla);
    bucket.total += 1;
    if (tipo === "BASICA") bucket.basicas += 1;
    else bucket.contiguas += 1;
    totalCasillas += 1;
  }

  for (const info of porSeccion.values()) {
    info.casillas.sort((a, b) => a.numero - b.numero);
  }

  const faltantes = [...seccionesValidas].filter((s) => !porSeccion.has(s));
  if (faltantes.length) {
    console.warn(`Secciones sin casillas básicas/contiguas: ${faltantes.join(", ")}`);
  }

  const dataset: CasillasCoyoacanDataset = {
    vigencia: "2024",
    fuente: "Instituto Nacional Electoral (INE) — Catálogo PREP PEF 2024",
    urlFuente: CATALOG_URL,
    generadoEn: new Date().toISOString(),
    totalCasillas,
    totalSecciones: porSeccion.size,
    porSeccion: Object.fromEntries(
      [...porSeccion.entries()].sort(
        (a, b) => Number(a[0]) - Number(b[0]),
      ),
    ),
  };

  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "casillas-coyoacan-2024.json");
  writeFileSync(outFile, JSON.stringify(dataset, null, 2));
  console.log(`Escrito ${outFile}`);
  console.log(`Casillas básicas/contiguas: ${totalCasillas}`);
  console.log(`Secciones con datos: ${porSeccion.size} / ${seccionesValidas.size}`);

  writeFileSync(
    path.join(outDir, "casillas-coyoacan-2024.manifest.json"),
    JSON.stringify(
      {
        fuente: CATALOG_URL,
        xlsx: path.basename(xlsxPath),
        totalCasillas,
        totalSecciones: porSeccion.size,
        faltantes,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
