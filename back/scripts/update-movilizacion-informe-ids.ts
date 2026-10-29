/**
 * Rellena la columna #ID en MOVILIZACION INFORME 2027.xlsx con el ID numérico del dirigente en BD.
 * Empareja por PATERNO + MATERNO + NOMBRE(S).
 * Si hay varios en BD, usa solo status ALTA (ACTIVO + activo); ignora BAJA.
 * Ñ/ñ se trata igual que N/n al comparar apellidos y nombres.
 *
 * Uso:
 *   npx tsx scripts/update-movilizacion-informe-ids.ts --file "C:\...\MOVILIZACION INFORME 2027.xlsx"
 *   railway run npx tsx scripts/update-movilizacion-informe-ids.ts --file "..." --in-place
 *   npx tsx scripts/update-movilizacion-informe-ids.ts --dry-run
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/prisma.js";

const DEFAULT_FILE = path.resolve(
  "C:/Users/Administrador/Downloads/MOVILIZACION INFORME 2027.xlsx",
);

function parseArgs(argv: string[]) {
  let file = DEFAULT_FILE;
  let sheet = "Hoja1";
  let dryRun = false;
  let inPlace = false;
  let out = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--in-place") inPlace = true;
    else if (arg === "--file") file = path.resolve(argv[++i] ?? "");
    else if (arg === "--sheet") sheet = argv[++i] ?? "Hoja1";
    else if (arg === "--out") out = path.resolve(argv[++i] ?? "");
  }

  if (!out) {
    out = inPlace
      ? file
      : file.replace(/\.xlsx$/i, "") + " — IDs actualizados.xlsx";
  }

  return { file, sheet, dryRun, inPlace, out };
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNombre(value: unknown): string {
  return String(value ?? "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function clavePersona(paterno: string, materno: string, nombre: string): string {
  return [normalizeNombre(paterno), normalizeNombre(materno), normalizeNombre(nombre)].join("|");
}

function clavePaternoNombre(paterno: string, nombre: string): string {
  return [normalizeNombre(paterno), normalizeNombre(nombre)].join("|");
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
    if (target.length < 3) continue;
    const partial = normalized.findIndex((h) => h.includes(target));
    if (partial >= 0) return partial;
  }
  return -1;
}

function parseIdDirigente(id: string): string {
  const n = Number(id);
  if (Number.isFinite(n) && Number.isInteger(n)) return String(n);
  return id;
}

type DirigenteFila = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  status: string;
  activo: boolean;
};

/** ALTA en Excel/import = ACTIVO y activo true; se descartan BAJA. */
function esDirigenteAlta(d: { status: string; activo: boolean }): boolean {
  return d.status === "ACTIVO" && d.activo === true;
}

function soloAlta(dirigentes: DirigenteFila[]): DirigenteFila[] {
  return dirigentes.filter(esDirigenteAlta);
}

async function main() {
  const { file, sheet, dryRun, inPlace, out } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(file)) {
    throw new Error(`No existe el archivo: ${file}`);
  }

  const dirigentes = await prisma.dirigente.findMany({
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
      status: true,
      activo: true,
    },
  });

  if (dirigentes.length === 0) {
    throw new Error("La base de datos no tiene dirigentes. Usa DATABASE_URL de Railway (railway run …).");
  }

  const porClave = new Map<string, DirigenteFila[]>();
  const porPaternoNombre = new Map<string, DirigenteFila[]>();
  for (const d of dirigentes) {
    const key = clavePersona(d.primerApellido, d.segundoApellido ?? "", d.nombre);
    const list = porClave.get(key) ?? [];
    list.push(d);
    porClave.set(key, list);

    const keyPn = clavePaternoNombre(d.primerApellido, d.nombre);
    const listPn = porPaternoNombre.get(keyPn) ?? [];
    listPn.push(d);
    porPaternoNombre.set(keyPn, listPn);
  }

  function resolverMatch(paterno: string, materno: string, nombre: string) {
    const key = clavePersona(paterno, materno, nombre);
    let raw = porClave.get(key) ?? [];
    let via: "completo" | "paterno-nombre" = "completo";

    if (raw.length === 0) {
      raw = porPaternoNombre.get(clavePaternoNombre(paterno, nombre)) ?? [];
      via = "paterno-nombre";
    }

    const matches = soloAlta(raw);
    return { matches, via, descartadosBaja: raw.length - matches.length };
  }

  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[sheet];
  if (!ws) {
    throw new Error(`No existe la hoja «${sheet}». Hojas: ${wb.SheetNames.join(", ")}`);
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  if (matrix.length === 0) throw new Error("Hoja vacía");

  const headerRowIndex = matrix.findIndex(
    (row) =>
      Array.isArray(row) &&
      findColumn(row.map(String), ["#id", "id"]) >= 0 &&
      findColumn(row.map(String), ["paterno"]) >= 0,
  );
  if (headerRowIndex < 0) {
    throw new Error("No se encontró fila de encabezados con #ID, PATERNO, MATERNO y NOMBRE(S).");
  }

  const headers = matrix[headerRowIndex]!.map(String);
  const idxId = findColumn(headers, ["#id", "id"]);
  const idxPat = findColumn(headers, ["paterno", "apellido paterno"]);
  const idxMat = findColumn(headers, ["materno", "apellido materno"]);
  const idxNombre = findColumn(headers, ["nombre(s)", "nombre", "nombres"]);

  if (idxId < 0 || idxPat < 0 || idxMat < 0 || idxNombre < 0) {
    throw new Error("Faltan columnas #ID, PATERNO, MATERNO o NOMBRE(S).");
  }

  let actualizados = 0;
  let sinMatch = 0;
  let ambiguos = 0;
  let resueltosPorAlta = 0;
  const reporteSinMatch: string[] = [];
  const reporteAmbiguos: string[] = [];

  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;

    const paterno = String(row[idxPat] ?? "").trim();
    const materno = String(row[idxMat] ?? "").trim();
    const nombre = String(row[idxNombre] ?? "").trim();
    if (!paterno && !materno && !nombre) continue;

    const { matches, via, descartadosBaja } = resolverMatch(paterno, materno, nombre);
    if (descartadosBaja > 0 && matches.length === 1) resueltosPorAlta++;

    if (matches.length === 0) {
      sinMatch++;
      if (reporteSinMatch.length < 50) {
        const nota = descartadosBaja > 0 ? " (solo coincidencias BAJA en BD)" : "";
        reporteSinMatch.push(`Fila ${i + 1}: ${paterno} | ${materno} | ${nombre}${nota}`);
      }
      continue;
    }

    if (matches.length > 1) {
      ambiguos++;
      if (reporteAmbiguos.length < 20) {
        reporteAmbiguos.push(
          `Fila ${i + 1}: ${paterno} ${materno} ${nombre} → IDs ALTA ${matches.map((m) => m.id).join(", ")} (${via})`,
        );
      }
      continue;
    }

    const idExcel = parseIdDirigente(matches[0]!.id);
    const prev = String(row[idxId] ?? "").trim();
    if (prev !== idExcel) {
      row[idxId] = Number(idExcel);
      actualizados++;
    }
  }

  console.log(JSON.stringify({
    archivo: file,
    hoja: sheet,
    dirigentesEnBd: dirigentes.length,
    filasActualizadas: actualizados,
    resueltosDescartandoBaja: resueltosPorAlta,
    sinCoincidencia: sinMatch,
    ambiguos,
    salida: dryRun ? "(dry-run, no se escribió archivo)" : out,
  }, null, 2));

  if (reporteSinMatch.length) {
    console.log("\nSin coincidencia (primeras filas):");
    for (const line of reporteSinMatch) console.log("  ", line);
  }
  if (reporteAmbiguos.length) {
    console.log("\nAmbiguos (no se actualizó #ID):");
    for (const line of reporteAmbiguos) console.log("  ", line);
  }

  if (dryRun) return;

  wb.Sheets[sheet] = XLSX.utils.aoa_to_sheet(matrix);
  if (inPlace && out === file) {
    const backup = file.replace(/\.xlsx$/i, "") + `.backup-${Date.now()}.xlsx`;
    fs.copyFileSync(file, backup);
    console.log(`Respaldo: ${backup}`);
  }
  XLSX.writeFile(wb, out);
  console.log(`\nArchivo guardado: ${out}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
