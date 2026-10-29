/**
 * Excel: secciones del catálogo 403 con al menos 1 registro en Mi_Red (columna SECCION).
 * Orden: mayor a menor número de registros.
 *
 * Uso: npx tsx scripts/export-secciones-catalogo-con-registros.ts
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import {
  SECCIONES_ELECTORALES_COYOACAN,
  distritoLocalDeSeccion,
} from "../src/lib/secciones-electorales.js";

const DEFAULT_CSV = path.resolve(
  "C:/Users/Administrador/Downloads/Mi_Red_2026-09-30_05_41.csv",
);

function parseArgs(argv: string[]) {
  let file = DEFAULT_CSV;
  let out = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file") file = path.resolve(argv[++i] ?? "");
    else if (argv[i] === "--out") out = path.resolve(argv[++i] ?? "");
  }
  if (!out) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    out = path.join(
      os.homedir(),
      "Desktop",
      `secciones-catalogo-con-registros-${stamp}.xlsx`,
    );
  }
  return { file, out };
}

function frecuenciaSeccion(csvPath: string): Map<string, number> {
  const text = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const idx = lines[0]!
    .split("|")
    .map((h) => h.trim().toLowerCase())
    .indexOf("seccion");
  if (idx < 0) throw new Error("No se encontró columna SECCION.");

  const freq = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const n = Number(line.split("|")[idx]?.trim());
    if (!Number.isFinite(n)) continue;
    const s = String(n);
    freq.set(s, (freq.get(s) ?? 0) + 1);
  }
  return freq;
}

function main() {
  const { file, out } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(file)) throw new Error(`No existe: ${file}`);

  const freq = frecuenciaSeccion(file);
  const filas = SECCIONES_ELECTORALES_COYOACAN.map((seccion) => ({
    Sección: seccion,
    Registros: freq.get(seccion) ?? 0,
    "Distrito local": distritoLocalDeSeccion(seccion) ?? "",
  }))
    .filter((r) => r.Registros > 0)
    .sort((a, b) => b.Registros - a.Registros || Number(a.Sección) - Number(b.Sección));

  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 14 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Secciones con registro");
  XLSX.writeFile(libro, out);

  console.log(`Origen: ${file}`);
  console.log(`Secciones (catálogo con registro): ${filas.length}`);
  console.log(`Archivo: ${out}`);
}

main();
