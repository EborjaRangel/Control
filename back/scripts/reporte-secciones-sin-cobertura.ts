/**
 * Confronta el Excel de siembra (ID + SECCION) contra las 403 secciones de Coyoacán.
 * Genera un archivo con secciones sin registros o con menos de 10 dirigentes en el Excel.
 *
 * Uso:
 *   npx tsx scripts/reporte-secciones-sin-cobertura.ts
 *   npx tsx scripts/reporte-secciones-sin-cobertura.ts --file "C:/Users/.../control.xlsx"
 *   npx tsx scripts/reporte-secciones-sin-cobertura.ts --min 10 --out ./secciones-bajo-meta.xlsx
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import {
  SECCIONES_ELECTORALES_COYOACAN,
  TOTAL_SECCIONES_COYOACAN,
  distritoLocalDeSeccion,
} from "../src/lib/secciones-electorales.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve("C:/Users/Administrador/Downloads/control.xlsx");

type FilaExcel = { id: string; seccion: string };

function parseArgs(argv: string[]) {
  let file = DEFAULT_FILE;
  let out = "";
  let minRegistros = 10;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--file") file = path.resolve(argv[++i] ?? "");
    else if (arg === "--out") out = path.resolve(argv[++i] ?? "");
    else if (arg === "--min") minRegistros = Number(argv[++i] ?? "10");
  }

  if (!out) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    out = path.join(
      os.homedir(),
      "Desktop",
      `secciones-sin-cobertura-menos-${minRegistros}-${stamp}.xlsx`,
    );
  }

  return { file, out, minRegistros };
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findColumn(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const exact = normalized.findIndex((h) => h === target);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    if (target.length < 4) continue;
    const partial = normalized.findIndex((h) => h.includes(target));
    if (partial >= 0) return partial;
  }
  return -1;
}

/** Columna de siembra/asignación (SECCION), no "SECCION VIVE" ni similares. */
function findColumnSeccionAsignada(headers: string[]): number {
  const normalized = headers.map(normalizeHeader);
  const exact = normalized.findIndex((h) => h === "seccion" || h === "seccion electoral");
  if (exact >= 0) return exact;
  return -1;
}

function parseId(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const n = Number(raw);
  if (Number.isFinite(n) && Number.isInteger(n)) return String(n);
  return raw;
}

function parseSeccion(value: unknown): string {
  if (value == null || value === "") return "";
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return "";
  return String(n);
}

function leerFilasExcel(file: string): FilaExcel[] {
  const workbook = XLSX.readFile(file);
  let sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("El Excel no tiene hojas.");

  for (const name of workbook.SheetNames) {
    const candidate = workbook.Sheets[name];
    if (!candidate) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(candidate, { header: 1, defval: "" });
    const headerRow = matrix.find(
      (row) =>
        Array.isArray(row) &&
        findColumn(row.map(String), ["id", "id dirigente"]) >= 0 &&
        findColumnSeccionAsignada(row.map(String)) >= 0,
    );
    if (headerRow && Array.isArray(headerRow)) {
      sheet = candidate;
      break;
    }
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headerRow = matrix.find(
    (row) =>
      Array.isArray(row) &&
      findColumn(row.map(String), ["id", "id dirigente"]) >= 0 &&
      findColumnSeccionAsignada(row.map(String)) >= 0,
  );
  if (!headerRow || !Array.isArray(headerRow)) {
    throw new Error("No se encontraron columnas ID y SECCION en el Excel.");
  }

  const headers = headerRow.map(String);
  const idxId = findColumn(headers, ["id", "id dirigente"]);
  const idxSeccion = findColumnSeccionAsignada(headers);
  if (idxId < 0 || idxSeccion < 0) {
    throw new Error('Faltan columnas ID o SECCION (exacta, no "SECCION VIVE").');
  }

  const filas: FilaExcel[] = [];
  for (const row of matrix.slice(matrix.indexOf(headerRow) + 1)) {
    if (!Array.isArray(row)) continue;
    const id = parseId(row[idxId]);
    const seccion = parseSeccion(row[idxSeccion]);
    if (!id || !seccion) continue;
    filas.push({ id, seccion });
  }
  return filas;
}

function contarPorSeccion(filas: FilaExcel[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const f of filas) {
    mapa.set(f.seccion, (mapa.get(f.seccion) ?? 0) + 1);
  }
  return mapa;
}

function main() {
  const { file, out, minRegistros } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(file)) {
    throw new Error(`Archivo no encontrado: ${file}`);
  }

  const filas = leerFilasExcel(file);
  const porSeccion = contarPorSeccion(filas);
  const seccionesEnArchivo = [...porSeccion.keys()].sort((a, b) => Number(a) - Number(b));

  type ReporteFila = {
    Sección: string;
    "Distrito local": number | "";
    "Registros en Excel": number;
    "En catálogo 403": string;
    Situación: string;
  };

  const reporte: ReporteFila[] = [];

  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    const count = porSeccion.get(seccion) ?? 0;
    if (count >= minRegistros) continue;

    reporte.push({
      Sección: seccion,
      "Distrito local": distritoLocalDeSeccion(seccion) ?? "",
      "Registros en Excel": count,
      "En catálogo 403": "Sí",
      Situación: count === 0 ? "Sin registros en el archivo" : `Menos de ${minRegistros} registros`,
    });
  }

  const seccionesArchivoFueraCatalogo = seccionesEnArchivo.filter(
    (s) => !SECCIONES_ELECTORALES_COYOACAN.includes(s),
  );

  const resumen = [
    { Métrica: "Archivo origen", Valor: file },
    { Métrica: "Filas con ID y sección", Valor: filas.length },
    { Métrica: "Secciones distintas en archivo", Valor: seccionesEnArchivo.length },
    { Métrica: "Catálogo Coyoacán", Valor: TOTAL_SECCIONES_COYOACAN },
    {
      Métrica: `Secciones con 0 registros en archivo`,
      Valor: SECCIONES_ELECTORALES_COYOACAN.filter((s) => (porSeccion.get(s) ?? 0) === 0).length,
    },
    {
      Métrica: `Secciones con 1–${minRegistros - 1} registros`,
      Valor: SECCIONES_ELECTORALES_COYOACAN.filter((s) => {
        const c = porSeccion.get(s) ?? 0;
        return c > 0 && c < minRegistros;
      }).length,
    },
    {
      Métrica: `Total a reportar (< ${minRegistros})`,
      Valor: reporte.length,
    },
    {
      Métrica: "Secciones en archivo fuera del catálogo",
      Valor: seccionesArchivoFueraCatalogo.length,
    },
  ];

  const hojaReporte = XLSX.utils.json_to_sheet(reporte);
  hojaReporte["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 28 }];

  const hojaResumen = XLSX.utils.json_to_sheet(resumen);
  hojaResumen["!cols"] = [{ wch: 36 }, { wch: 80 }];

  const hojaFuera =
    seccionesArchivoFueraCatalogo.length > 0
      ? XLSX.utils.json_to_sheet(
          seccionesArchivoFueraCatalogo.map((s) => ({
            Sección: s,
            "Registros en Excel": porSeccion.get(s) ?? 0,
            Nota: "No está en el catálogo de 403 secciones",
          })),
        )
      : null;

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen");
  XLSX.utils.book_append_sheet(libro, hojaReporte, "Secciones bajo meta");
  if (hojaFuera) {
    XLSX.utils.book_append_sheet(libro, hojaFuera, "Fuera catálogo");
  }
  XLSX.writeFile(libro, out);

  console.log(`Archivo origen: ${file}`);
  console.log(`Registros leídos: ${filas.length}`);
  console.log(`Catálogo: ${TOTAL_SECCIONES_COYOACAN} secciones`);
  console.log(`Secciones en Excel: ${seccionesEnArchivo.length}`);
  console.log(`Reporte (< ${minRegistros} registros): ${reporte.length} secciones`);
  console.log(`Salida: ${out}`);
}

main();
