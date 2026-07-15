/**
 * Importa composición de nómina desde "matriz pagos gc.xlsx".
 * Empareja por PATERNO + MATERNO + NOMBRE(S) con el dirigente en BD.
 *
 * Columnas:
 * - H > 0        → HONORARIOS
 * - 70/30 > 0    → SETENTA_TREINTA
 * - N8 > 0       → NOMINA_8
 * - PF > 0       → PF
 *
 * Los montos del Excel están en miles: 4.70 → 4,700 MXN; 2 → 2,000 MXN.
 * Uso:
 *   npx tsx scripts/import-nomina-matriz-pagos.ts --dry-run
 *   npx tsx scripts/import-nomina-matriz-pagos.ts --confirm
 *   npx tsx scripts/import-nomina-matriz-pagos.ts --file "C:/ruta/archivo.xlsx" --confirm
 */

import "dotenv/config";
import path from "node:path";
import * as XLSX from "xlsx";
import type { ConceptoSueldo } from "../src/lib/composicion-sueldo.js";
import { upsertNomina } from "../src/lib/nomina-db.js";
import { prisma } from "../src/lib/prisma.js";

const DEFAULT_FILE = "C:/Users/Administrador/Downloads/matriz pagos gc.xlsx";

type FilaMatriz = {
  filaExcel: number;
  paterno: string;
  materno: string;
  nombre: string;
  honorarios: number;
  setentaTreinta: number;
  nomina8: number;
  pf: number;
};

type Resumen = {
  filasLeidas: number;
  sinConceptos: number;
  sinCoincidencia: FilaMatriz[];
  ambiguos: { fila: FilaMatriz; ids: string[] }[];
  actualizados: { id: string; fila: FilaMatriz; conceptos: ConceptoSueldo[] }[];
};

function parseArgs(argv: string[]) {
  let file = DEFAULT_FILE;
  let sheet = "";
  let confirm = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--confirm") confirm = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--file") file = path.resolve(argv[++i] ?? "");
    else if (arg === "--sheet") sheet = argv[++i] ?? "";
  }

  return { file, sheet, confirm, dryRun };
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
    if (target.length < 2) continue;
    const partial = normalized.findIndex((h) => h.includes(target));
    if (partial >= 0) return partial;
  }
  return -1;
}

function normalizeNombre(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function clavePersona(paterno: string, materno: string, nombre: string) {
  return [
    normalizeNombre(paterno),
    normalizeNombre(materno),
    normalizeNombre(nombre),
  ].join("|");
}

function parseText(value: unknown): string {
  return String(value ?? "").trim();
}

function parseMonto(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim().replace(/,/g, "");
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** En la matriz, 4.70 = $4,700 y 2 = $2,000 (miles de pesos). */
function montoMatrizEnPesos(value: unknown): number {
  const miles = parseMonto(value);
  if (miles <= 0) return 0;
  return Math.round(miles * 1000 * 100) / 100;
}

function leerFilas(file: string, sheetName: string): FilaMatriz[] {
  const wb = XLSX.readFile(file);
  const hoja = sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[hoja];
  if (!ws) throw new Error(`Hoja no encontrada: ${hoja}`);

  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  if (matrix.length < 2) return [];

  const headers = matrix[0].map((c) => String(c ?? ""));
  const idxPaterno = findColumn(headers, ["paterno", "apellido paterno", "apellido 1"]);
  const idxMaterno = findColumn(headers, ["materno", "apellido materno", "apellido 2"]);
  const idxNombre = findColumn(headers, ["nombre(s)", "nombre", "nombres"]);
  const idxHonorarios = findColumn(headers, ["h", "honorarios"]);
  const idxSetentaTreinta = findColumn(headers, ["70/30", "7030", "setenta treinta"]);
  const idxNomina8 = findColumn(headers, ["n8", "nomina 8", "nomina8"]);
  const idxPf = findColumn(headers, ["pf"]);

  if (idxPaterno < 0 || idxMaterno < 0 || idxNombre < 0) {
    throw new Error("Faltan columnas PATERNO, MATERNO o NOMBRE(S) en el Excel");
  }
  if (idxHonorarios < 0 || idxSetentaTreinta < 0 || idxNomina8 < 0 || idxPf < 0) {
    throw new Error("Faltan columnas H, 70/30, N8 o PF en el Excel");
  }

  const filas: FilaMatriz[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    const paterno = parseText(row[idxPaterno]);
    const materno = parseText(row[idxMaterno]);
    const nombre = parseText(row[idxNombre]);
    if (!paterno && !materno && !nombre) continue;

    filas.push({
      filaExcel: i + 1,
      paterno,
      materno,
      nombre,
      honorarios: montoMatrizEnPesos(row[idxHonorarios]),
      setentaTreinta: montoMatrizEnPesos(row[idxSetentaTreinta]),
      nomina8: montoMatrizEnPesos(row[idxNomina8]),
      pf: montoMatrizEnPesos(row[idxPf]),
    });
  }

  return filas;
}

function conceptosDesdeFila(fila: FilaMatriz) {
  const conceptos: {
    concepto: ConceptoSueldo;
    monto: number;
    nombre: string | null;
    tipoDetalle: string | null;
  }[] = [];

  if (fila.honorarios > 0) {
    conceptos.push({
      concepto: "HONORARIOS",
      monto: fila.honorarios,
      nombre: null,
      tipoDetalle: null,
    });
  }
  if (fila.setentaTreinta > 0) {
    conceptos.push({
      concepto: "SETENTA_TREINTA",
      monto: fila.setentaTreinta,
      nombre: null,
      tipoDetalle: null,
    });
  }
  if (fila.nomina8 > 0) {
    conceptos.push({
      concepto: "NOMINA_8",
      monto: fila.nomina8,
      nombre: null,
      tipoDetalle: null,
    });
  }
  if (fila.pf > 0) {
    conceptos.push({
      concepto: "PF",
      monto: fila.pf,
      nombre: null,
      tipoDetalle: null,
    });
  }

  return conceptos;
}

async function main() {
  const { file, sheet, confirm, dryRun } = parseArgs(process.argv.slice(2));

  console.log(`Archivo: ${file}`);
  const filas = leerFilas(file, sheet);
  console.log(`Filas con datos: ${filas.length}`);

  const dirigentes = await prisma.dirigente.findMany({
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
    },
  });

  const indice = new Map<string, string[]>();
  for (const d of dirigentes) {
    const key = clavePersona(
      d.primerApellido,
      d.segundoApellido ?? "",
      d.nombre,
    );
    const lista = indice.get(key) ?? [];
    lista.push(d.id);
    indice.set(key, lista);
  }

  const resumen: Resumen = {
    filasLeidas: filas.length,
    sinConceptos: 0,
    sinCoincidencia: [],
    ambiguos: [],
    actualizados: [],
  };

  for (const fila of filas) {
    const conceptos = conceptosDesdeFila(fila);
    if (conceptos.length === 0) {
      resumen.sinConceptos += 1;
      continue;
    }

    const key = clavePersona(fila.paterno, fila.materno, fila.nombre);
    const ids = indice.get(key) ?? [];

    if (ids.length === 0) {
      resumen.sinCoincidencia.push(fila);
      continue;
    }
    if (ids.length > 1) {
      resumen.ambiguos.push({ fila, ids });
      continue;
    }

    resumen.actualizados.push({
      id: ids[0],
      fila,
      conceptos: conceptos.map((c) => c.concepto),
    });

    if (!dryRun && confirm) {
      await prisma.$transaction(async (tx) => {
        await upsertNomina(tx, ids[0], { conceptosComposicion: conceptos });
      });
    }
  }

  console.log("\n--- Resumen ---");
  console.log(`Filas leídas: ${resumen.filasLeidas}`);
  console.log(`Sin montos (>0): ${resumen.sinConceptos}`);
  console.log(`Actualizables: ${resumen.actualizados.length}`);
  console.log(`Sin coincidencia en BD: ${resumen.sinCoincidencia.length}`);
  console.log(`Ambiguos (varios IDs): ${resumen.ambiguos.length}`);

  if (resumen.actualizados.length > 0) {
    console.log("\nMuestra (primeros 10):");
    for (const item of resumen.actualizados.slice(0, 10)) {
      const f = item.fila;
      console.log(
        `  ID ${item.id} · ${f.paterno} ${f.materno} ${f.nombre} · ${item.conceptos.join(", ")}`,
      );
    }
  }

  if (resumen.sinCoincidencia.length > 0) {
    console.log("\nSin coincidencia (primeros 15):");
    for (const f of resumen.sinCoincidencia.slice(0, 15)) {
      console.log(`  Fila ${f.filaExcel}: ${f.paterno} ${f.materno} ${f.nombre}`);
    }
    if (resumen.sinCoincidencia.length > 15) {
      console.log(`  ... y ${resumen.sinCoincidencia.length - 15} más`);
    }
  }

  if (resumen.ambiguos.length > 0) {
    console.log("\nAmbiguos:");
    for (const a of resumen.ambiguos.slice(0, 10)) {
      const f = a.fila;
      console.log(
        `  Fila ${f.filaExcel}: ${f.paterno} ${f.materno} ${f.nombre} → IDs ${a.ids.join(", ")}`,
      );
    }
  }

  if (dryRun) {
    console.log("\nDry-run: no se guardó nada. Usa --confirm para aplicar.");
    return;
  }

  if (!confirm) {
    throw new Error("Agrega --confirm para aplicar o --dry-run para simular.");
  }

  console.log(`\nListo: ${resumen.actualizados.length} nóminas actualizadas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
