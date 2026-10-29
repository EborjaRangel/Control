/**
 * Cuenta cuántas veces aparece cada valor en la columna SECCION (no SECCION VIVE).
 *
 * Uso:
 *   npx tsx scripts/conteo-frecuencia-seccion.ts
 *   npx tsx scripts/conteo-frecuencia-seccion.ts --file "C:/Users/.../Mi_Red.csv" --out "C:/Users/.../salida.xlsx"
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import {
  SECCIONES_ELECTORALES_COYOACAN,
  distritoLocalDeSeccion,
  esSeccionValida,
} from "../src/lib/secciones-electorales.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve(
  "C:/Users/Administrador/Downloads/Mi_Red_2026-09-30_05_41.csv",
);

function parseArgs(argv: string[]) {
  let file = DEFAULT_FILE;
  let out = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file") file = path.resolve(argv[++i] ?? "");
    else if (argv[i] === "--out") out = path.resolve(argv[++i] ?? "");
  }
  if (!out) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    out = path.join(os.homedir(), "Desktop", `frecuencia-seccion-${stamp}.xlsx`);
  }
  return { file, out };
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseSeccion(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

function detectDelimiter(line: string): string {
  if (line.includes("|")) return "|";
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  return ",";
}

function leerCsv(file: string): { headers: string[]; rows: string[][] } {
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV vacío o sin datos.");

  const delim = detectDelimiter(lines[0]!);
  const headers = lines[0]!.split(delim).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(delim).map((c) => c.trim()));
  return { headers, rows };
}

function indiceColumnaSeccion(headers: string[]): number {
  const normalized = headers.map(normalizeHeader);
  const idx = normalized.findIndex((h) => h === "seccion");
  if (idx < 0) {
    throw new Error(
      `No se encontró la columna SECCION. Encabezados: ${headers.slice(0, 20).join(", ")}`,
    );
  }
  return idx;
}

function main() {
  const { file, out } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(file)) throw new Error(`Archivo no encontrado: ${file}`);

  const { headers, rows } = leerCsv(file);
  const idxSec = indiceColumnaSeccion(headers);

  const frecuencia = new Map<string, number>();
  let filasSinSeccion = 0;

  for (const row of rows) {
    const sec = parseSeccion(row[idxSec] ?? "");
    if (!sec) {
      filasSinSeccion += 1;
      continue;
    }
    frecuencia.set(sec, (frecuencia.get(sec) ?? 0) + 1);
  }

  const totalFilas = rows.length;
  const totalConSeccion = totalFilas - filasSinSeccion;

  type FilaFreq = {
    Sección: string;
    Registros: number;
    "En catálogo Coyoacán (403)": string;
    "Distrito local": number | "";
  };

  const todas: FilaFreq[] = [...frecuencia.entries()]
    .map(([seccion, registros]) => ({
      Sección: seccion,
      Registros: registros,
      "En catálogo Coyoacán (403)": esSeccionValida(seccion) ? "Sí" : "No",
      "Distrito local": esSeccionValida(seccion) ? (distritoLocalDeSeccion(seccion) ?? "") : "",
    }))
    .sort((a, b) => b.Registros - a.Registros || Number(a.Sección) - Number(b.Sección));

  const conRegistro403 = SECCIONES_ELECTORALES_COYOACAN.filter(
    (s) => (frecuencia.get(s) ?? 0) > 0,
  ).length;
  const sinRegistro403 = SECCIONES_ELECTORALES_COYOACAN.filter(
    (s) => (frecuencia.get(s) ?? 0) === 0,
  );

  let masDe10 = 0;
  let de5a9 = 0;
  let de1a4 = 0;
  let fueraCatalogo = 0;
  for (const [seccion, count] of frecuencia) {
    if (!esSeccionValida(seccion)) fueraCatalogo += 1;
    if (count > 10) masDe10 += 1;
    else if (count >= 5) de5a9 += 1;
    else de1a4 += 1;
  }

  const resumen = [
    { Métrica: "Archivo", Valor: file },
    { Métrica: "Columna usada", Valor: headers[idxSec] },
    { Métrica: "Total filas de datos", Valor: totalFilas },
    { Métrica: "Filas con SECCION válida", Valor: totalConSeccion },
    { Métrica: "Filas sin SECCION", Valor: filasSinSeccion },
    { Métrica: "Secciones distintas (valores únicos)", Valor: frecuencia.size },
    { Métrica: "Catálogo Coyoacán (403) con al menos 1 registro", Valor: conRegistro403 },
    { Métrica: "Catálogo Coyoacán (403) sin ningún registro", Valor: sinRegistro403.length },
    { Métrica: "Valores SECCION fuera del catálogo 403", Valor: fueraCatalogo },
    { Métrica: "Secciones con más de 10 registros", Valor: masDe10 },
    { Métrica: "Secciones con 5 a 9 registros", Valor: de5a9 },
    { Métrica: "Secciones con 1 a 4 registros", Valor: de1a4 },
  ];

  const hojaSin403 = sinRegistro403.map((seccion) => ({
    Sección: seccion,
    "Distrito local": distritoLocalDeSeccion(seccion) ?? "",
    Registros: 0,
  }));

  const hojaFreq = XLSX.utils.json_to_sheet(todas);
  hojaFreq["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 14 }];
  const hojaResumen = XLSX.utils.json_to_sheet(resumen);
  hojaResumen["!cols"] = [{ wch: 42 }, { wch: 90 }];
  const hoja403Vacias = XLSX.utils.json_to_sheet(hojaSin403);
  hoja403Vacias["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 12 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen");
  XLSX.utils.book_append_sheet(libro, hojaFreq, "Frecuencia por sección");
  XLSX.utils.book_append_sheet(libro, hoja403Vacias, "403 sin registro");
  XLSX.writeFile(libro, out);

  console.log(`Archivo: ${file}`);
  console.log(`Columna: ${headers[idxSec]} (ignora SECCION VIVE)`);
  console.log(`Registros: ${totalFilas}`);
  console.log(`Secciones distintas: ${frecuencia.size}`);
  console.log(`403 con registro: ${conRegistro403} | 403 sin registro: ${sinRegistro403.length}`);
  console.log(`>10: ${masDe10} | 5-9: ${de5a9} | 1-4: ${de1a4}`);
  console.log(`Top 10:`);
  for (const f of todas.slice(0, 10)) {
    console.log(`  ${f.Sección}: ${f.Registros}`);
  }
  console.log(`403 sin registro: ${sinRegistro403.join(", ")}`);
  console.log(`Salida: ${out}`);
}

main();
