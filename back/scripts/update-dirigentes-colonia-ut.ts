/**
 * Actualiza sección electoral, colonia, UT y CP de dirigentes desde Excel.
 *
 * Del Excel solo se leen ID y SECCION. Colonia y UT se toman del catálogo
 * IECM/SEPOMEX en BD (misma fuente que el formulario de dirigente).
 *
 * Uso:
 *   npx tsx scripts/update-dirigentes-colonia-ut.ts --file "C:/Users/.../control.xlsx" --dry-run
 *   npx tsx scripts/update-dirigentes-colonia-ut.ts --file "C:/Users/.../control.xlsx" --confirm
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/prisma.js";
import {
  asignarColoniaUtDesdeCatalogoSeccion,
  cargarCatalogoElectoralPorSeccion,
  type CatalogoSeccionElectoral,
} from "../src/lib/unidades-territoriales.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = "C:/Users/Administrador/Downloads/control.xlsx";

type FilaExcel = {
  id: string;
  seccion: string;
};

type UpdatePlan = {
  id: string;
  seccion: string;
  colonia: string | null;
  codigoPostal: string | null;
  unidadTerritorialId: string | null;
  unidadTerritorialClave: string | null;
  coloniasEnCatalogo: number;
  utsEnCatalogo: number;
  motivo: string;
};

function parseArgs(argv: string[]) {
  let file = DEFAULT_FILE;
  let confirm = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--confirm") confirm = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--file") file = path.resolve(argv[++i] ?? "");
  }

  return { file, confirm, dryRun };
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

function parseId(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const n = Number(raw);
  if (Number.isFinite(n) && Number.isInteger(n)) return String(n);
  return raw;
}

function parseSeccion(value: unknown): string {
  if (value == null || value === "") return "";
  return String(Number(String(value).trim()));
}

async function planificarActualizacion(
  fila: FilaExcel,
  catalogo: Map<string, CatalogoSeccionElectoral>,
): Promise<UpdatePlan> {
  const cat = catalogo.get(fila.seccion);

  if (!cat) {
    return {
      id: fila.id,
      seccion: fila.seccion,
      colonia: null,
      codigoPostal: null,
      unidadTerritorialId: null,
      unidadTerritorialClave: null,
      coloniasEnCatalogo: 0,
      utsEnCatalogo: 0,
      motivo: "sección sin catálogo en BD",
    };
  }

  const asignacion = await asignarColoniaUtDesdeCatalogoSeccion(fila.seccion, cat);

  return {
    id: fila.id,
    seccion: fila.seccion,
    colonia: asignacion.colonia,
    codigoPostal: asignacion.codigoPostal,
    unidadTerritorialId: asignacion.unidadTerritorialId,
    unidadTerritorialClave: asignacion.unidadTerritorialClave,
    coloniasEnCatalogo: cat.colonias.length,
    utsEnCatalogo: cat.unidadesTerritoriales.length,
    motivo: asignacion.motivo,
  };
}

function leerFilas(file: string): FilaExcel[] {
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("El Excel no tiene hojas.");

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headerRow = matrix.find(
    (row) =>
      Array.isArray(row) &&
      findColumn(row.map(String), ["id"]) >= 0 &&
      findColumn(row.map(String), ["seccion", "seccion electoral"]) >= 0,
  );
  if (!headerRow || !Array.isArray(headerRow)) {
    throw new Error("No se encontraron columnas ID y SECCION.");
  }

  const headers = headerRow.map(String);
  const idxId = findColumn(headers, ["id", "id dirigente"]);
  const idxSeccion = findColumn(headers, ["seccion", "seccion electoral"]);

  if (idxId < 0 || idxSeccion < 0) {
    throw new Error("Faltan columnas ID o SECCION.");
  }

  const filas: FilaExcel[] = [];
  const ids = new Set<string>();
  let omitidasSinSeccion = 0;

  for (const row of matrix.slice(matrix.indexOf(headerRow) + 1)) {
    if (!Array.isArray(row)) continue;
    const id = parseId(row[idxId]);
    const seccion = parseSeccion(row[idxSeccion]);
    if (!id && !seccion) continue;
    if (!id) continue;
    if (!seccion) {
      omitidasSinSeccion += 1;
      continue;
    }
    if (ids.has(id)) throw new Error(`ID duplicado en Excel: ${id}`);
    ids.add(id);

    filas.push({ id, seccion });
  }

  if (omitidasSinSeccion > 0) {
    console.warn(`Filas omitidas por falta de sección electoral: ${omitidasSinSeccion}`);
  }

  return filas;
}

async function main() {
  const { file, confirm, dryRun } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(file)) {
    throw new Error(`Archivo no encontrado: ${file}`);
  }

  const catalogo = await cargarCatalogoElectoralPorSeccion();
  const filas = leerFilas(file);
  console.log(`Archivo: ${file}`);
  console.log(`Filas (ID + sección): ${filas.length}`);
  console.log(`Secciones con catálogo en BD: ${catalogo.size}`);

  const idsExcel = filas.map((f) => f.id);
  const existentes = await prisma.dirigente.findMany({
    where: { id: { in: idsExcel } },
    select: { id: true },
  });
  const idsExistentes = new Set(existentes.map((d) => d.id));

  const planes: UpdatePlan[] = [];
  for (const fila of filas) {
    planes.push(await planificarActualizacion(fila, catalogo));
  }

  const sinDirigente = planes.filter((p) => !idsExistentes.has(p.id));
  const sinColonia = planes.filter((p) => !p.colonia);
  const sinUt = planes.filter((p) => !p.unidadTerritorialId);
  const ok = planes.filter((p) => p.colonia && p.unidadTerritorialId);

  console.log(`Dirigentes encontrados en BD: ${existentes.length}/${filas.length}`);
  console.log(`Sin dirigente en BD: ${sinDirigente.length}`);
  console.log(`Con colonia + UT del catálogo: ${ok.length}`);
  console.log(`Sin colonia resuelta: ${sinColonia.length}`);
  console.log(`Sin UT resuelta: ${sinUt.length}`);

  console.log("\nPrimeras 5 actualizaciones:");
  for (const plan of planes.slice(0, 5)) {
    console.log(
      `  ID ${plan.id} · sec ${plan.seccion} · ${plan.colonia ?? "—"} · UT ${plan.unidadTerritorialClave ?? "—"} · cat ${plan.coloniasEnCatalogo} col / ${plan.utsEnCatalogo} UT · ${plan.motivo}`,
    );
  }

  if (dryRun) {
    console.log("\nDry-run: no se modificó la base de datos.");
    return;
  }

  if (!confirm) {
    throw new Error("Agrega --confirm para aplicar o --dry-run para simular.");
  }

  let actualizados = 0;
  let omitidos = 0;

  for (const plan of planes) {
    if (!idsExistentes.has(plan.id)) {
      omitidos += 1;
      continue;
    }

    await prisma.dirigente.update({
      where: { id: plan.id },
      data: {
        seccionElectoral: plan.seccion,
        colonia: plan.colonia ?? "",
        codigoPostal: plan.codigoPostal ?? "",
        unidadTerritorialId: plan.unidadTerritorialId,
      },
    });
    actualizados += 1;
  }

  console.log(`\nActualizados: ${actualizados}`);
  console.log(`Omitidos (ID no encontrado): ${omitidos}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
