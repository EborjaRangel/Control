/**
 * Agrega la hoja "Carga Dirigentes" al Excel de especificación.
 * Uso: npm run db:prepare-dirigentes-carga -w control-back
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.resolve(
  __dirname,
  "../../analisis de datos y campos para base de dirigentes.xlsx",
);
const SHEET_NAME = "Carga Dirigentes";

const HEADERS = [
  "ID Dirigente",
  "Distrito",
  "Apellido 1",
  "Apellido 2",
  "Nombres propios",
];

function main() {
  if (!fs.existsSync(TARGET)) {
    throw new Error(`No se encontró el archivo: ${TARGET}`);
  }

  const workbook = XLSX.readFile(TARGET);
  if (workbook.Sheets[SHEET_NAME]) {
    console.log(`La hoja "${SHEET_NAME}" ya existe. No se modificó el archivo.`);
    return;
  }

  const rows = [HEADERS];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
  XLSX.writeFile(workbook, TARGET);

  console.log(`Hoja "${SHEET_NAME}" agregada en:`);
  console.log(TARGET);
  console.log("Pega tus filas (ID, Distrito, Apellido 1, Apellido 2) y ejecuta:");
  console.log("  npm run db:import-dirigentes -w control-back -- --confirm");
}

main();
