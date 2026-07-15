/**
 * Sincroniza dirigentes desde Excel por ID (sin borrar relaciones existentes).
 *
 * Actualiza: nombre, apellidos, distrito, tabulador y estatus.
 * Crea solo los IDs nuevos (con valores temporales en campos faltantes).
 * Conserva: detectados, RC/RG, usuario, nómina, QR, referenteId, asistencias, etc.
 *
 * Columnas esperadas (encabezados flexibles):
 * - ID / ID Dirigente
 * - NOMBRE / Nombres propios
 * - PATERNO / Apellido 1
 * - MATERNO / Apellido 2
 * - DISTRITO / Distrito local
 * - TABULADOR (opcional)
 * - ESTATUS (opcional)
 *
 * Uso:
 *   npx tsx scripts/import-dirigentes-excel.ts --file "..." --sheet REGISTROS --confirm
 *   npx tsx scripts/import-dirigentes-excel.ts --dry-run
 *   npx tsx scripts/import-dirigentes-excel.ts --reemplazar-todo --confirm  (limpia tablas vinculadas y deja solo el Excel)
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { generarCodigoQr } from "../src/lib/codigo-qr.js";
import { nominaCreateData } from "../src/lib/nomina-db.js";
import { prisma } from "../src/lib/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve(
  __dirname,
  "../../analisis de datos y campos para base de dirigentes.xlsx",
);
const DEFAULT_SHEETS = ["REGISTROS", "Carga Dirigentes", "Carga", "Dirigentes", "Hoja1"];

type TipoDirigente = "D1" | "D2" | "D3" | "D4";
type StatusImport = "ACTIVO" | "BAJA";

type CargaDirigente = {
  id: string;
  distritoLocal: number;
  primerApellido: string;
  segundoApellido: string | null;
  nombre: string;
  tipo: TipoDirigente;
  activo: boolean;
  status: StatusImport;
};

function parseArgs(argv: string[]) {
  let file = DEFAULT_FILE;
  let sheet = "";
  let confirm = false;
  let dryRun = false;
  let reemplazarTodo = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--confirm") confirm = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--reemplazar-todo") reemplazarTodo = true;
    else if (arg === "--file") file = path.resolve(argv[++i] ?? "");
    else if (arg === "--sheet") sheet = argv[++i] ?? "";
  }

  return { file, sheet, confirm, dryRun, reemplazarTodo };
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

function parseDistrito(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseText(value: unknown): string {
  return String(value ?? "").trim();
}

function parseTipo(value: unknown): TipoDirigente {
  const tipo = parseText(value).toUpperCase();
  if (tipo === "D1" || tipo === "D2" || tipo === "D3" || tipo === "D4") return tipo;
  return "D4";
}

function parseEstatus(value: unknown): { activo: boolean; status: StatusImport } {
  const estatus = parseText(value).toUpperCase();
  if (estatus === "BAJA" || estatus === "INACTIVO" || estatus === "INACTIVA") {
    return { activo: false, status: "BAJA" };
  }
  return { activo: true, status: "ACTIVO" };
}

function isHeaderLikeRow(row: unknown[]): boolean {
  const joined = row.map((c) => normalizeHeader(c)).join(" ");
  return (
    joined.includes("apellido 1") ||
    joined.includes("apellido paterno") ||
    joined.includes("id dirigente") ||
    joined.includes("nombres propios") ||
    joined === "id nombre paterno materno distrito" ||
    joined.includes("#tabla")
  );
}

function pickSheet(workbook: XLSX.WorkBook, preferred: string): XLSX.WorkSheet {
  if (preferred && workbook.Sheets[preferred]) {
    return workbook.Sheets[preferred];
  }

  for (const name of DEFAULT_SHEETS) {
    if (workbook.Sheets[name]) return workbook.Sheets[name];
  }

  for (const name of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      defval: "",
    });
    for (const row of rows.slice(0, 5)) {
      if (!Array.isArray(row)) continue;
      const idxId = findColumn(row.map(String), ["id dirigente", "id"]);
      const idxPat = findColumn(row.map(String), ["apellido 1", "apellido paterno", "paterno"]);
      if (idxId >= 0 && idxPat >= 0) {
        return workbook.Sheets[name];
      }
    }
  }

  throw new Error(
    `No se encontró una hoja con datos de carga. Agrega la hoja "Carga Dirigentes" con columnas ID, Distrito, Apellido 1 y Apellido 2.`,
  );
}

function leerFilas(sheet: XLSX.WorkSheet): CargaDirigente[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (matrix.length === 0) return [];

  let headerRowIndex = matrix.findIndex(
    (row) =>
      Array.isArray(row) &&
      findColumn(row.map(String), ["id dirigente", "id"]) >= 0 &&
      findColumn(row.map(String), ["apellido 1", "apellido paterno", "paterno"]) >= 0,
  );

  if (headerRowIndex < 0) {
    throw new Error("No se encontró fila de encabezados con ID y apellidos.");
  }

  const headers = matrix[headerRowIndex].map(String);
  const idxId = findColumn(headers, ["id dirigente", "id"]);
  const idxDistrito = findColumn(headers, ["distrito local", "distrito", "dtto local"]);
  const idxPat = findColumn(headers, ["apellido 1", "apellido paterno", "paterno", "primer apellido"]);
  const idxMat = findColumn(headers, ["apellido 2", "apellido materno", "materno", "segundo apellido"]);
  const idxNombre = findColumn(headers, ["nombres propios", "nombre", "nombres"]);
  const idxTipo = findColumn(headers, ["tabulador", "tipo", "nivel"]);
  const idxEstatus = findColumn(headers, ["estatus", "status", "estado"]);

  if (idxId < 0 || idxPat < 0) {
    throw new Error("Faltan columnas obligatorias: ID Dirigente y Apellido 1.");
  }
  if (idxDistrito < 0) {
    throw new Error('Falta la columna "Distrito" o "Distrito local".');
  }

  const filas: CargaDirigente[] = [];
  const ids = new Set<string>();

  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row) || isHeaderLikeRow(row)) continue;

    const id = parseId(row[idxId]);
    const primerApellido = parseText(row[idxPat]);
    const segundoApellido = idxMat >= 0 ? parseText(row[idxMat]) || null : null;
    const nombre = idxNombre >= 0 ? parseText(row[idxNombre]) : "";
    const distritoLocal = parseDistrito(row[idxDistrito]);
    const tipo = idxTipo >= 0 ? parseTipo(row[idxTipo]) : "D4";
    const { activo, status } = idxEstatus >= 0 ? parseEstatus(row[idxEstatus]) : parseEstatus("ALTA");

    if (!id && !primerApellido && !segundoApellido) continue;
    if (!id) {
      throw new Error(`Fila ${i + 1}: falta ID Dirigente.`);
    }
    if (!primerApellido) {
      throw new Error(`Fila ${i + 1}: falta apellido paterno.`);
    }
    if (!nombre) {
      throw new Error(`Fila ${i + 1}: falta nombre.`);
    }
    if (distritoLocal == null) {
      throw new Error(`Fila ${i + 1}: falta distrito.`);
    }
    if (ids.has(id)) {
      throw new Error(`ID duplicado en Excel: ${id}`);
    }
    ids.add(id);

    filas.push({
      id,
      distritoLocal,
      primerApellido,
      segundoApellido,
      nombre,
      tipo,
      activo,
      status,
    });
  }

  return filas;
}

function datosDesdeExcel(fila: CargaDirigente) {
  return {
    nombre: fila.nombre,
    primerApellido: fila.primerApellido,
    segundoApellido: fila.segundoApellido,
    distritoLocal: fila.distritoLocal,
    tipo: fila.tipo,
    activo: fila.activo,
    status: fila.status,
  };
}

function defaultsParaFila(fila: CargaDirigente) {
  return {
    id: fila.id,
    ...datosDesdeExcel(fila),
    fechaNacimiento: new Date("1990-01-01"),
    telefonoCelular: "",
    correo: `dirigente.${fila.id}@pendiente.local`,
    seccionElectoral: "",
    colonia: "",
    calle: "PENDIENTE",
    numeroExterior: "S/N",
    codigoPostal: "",
    codigoQr: generarCodigoQr(),
  };
}

async function main() {
  const { file, sheet, confirm, dryRun, reemplazarTodo } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(file)) {
    throw new Error(`Archivo no encontrado: ${file}`);
  }

  const workbook = XLSX.readFile(file);
  const selectedSheet = pickSheet(workbook, sheet);
  const sheetName =
    sheet ||
    workbook.SheetNames.find((name) => workbook.Sheets[name] === selectedSheet) ||
    "desconocida";
  const filas = leerFilas(selectedSheet);

  if (filas.length === 0) {
    throw new Error(
      `No hay filas de carga en "${path.basename(file)}" (${sheetName}). ` +
        'Agrega datos en la hoja "Carga Dirigentes" con columnas: ID Dirigente, Distrito, Apellido 1, Apellido 2.',
    );
  }

  const actuales = await prisma.dirigente.count();
  console.log(`Archivo: ${file}`);
  console.log(`Hoja: ${sheetName}`);
  console.log(`Dirigentes actuales en BD: ${actuales}`);
  console.log(`Filas a importar: ${filas.length}`);
  console.log("Primeras 3 filas:");
  filas.slice(0, 3).forEach((f) => {
    console.log(
      `  ID ${f.id} · D${f.distritoLocal} · ${f.tipo} · ${f.status} · ${f.nombre} ${f.primerApellido} ${f.segundoApellido ?? ""}`,
    );
  });
  const altas = filas.filter((f) => f.activo).length;
  const bajas = filas.length - altas;
  console.log(`Altas en Excel: ${altas} · Bajas en Excel: ${bajas}`);
  console.log(
    reemplazarTodo
      ? "Modo: limpiar vinculados y recargar solo desde Excel"
      : "Modo: sincronizar por ID (conserva relaciones y registros no incluidos en el Excel)",
  );

  if (dryRun) {
    if (reemplazarTodo) {
      console.log("\nDry-run: se eliminarían todos los dirigentes y sus tablas vinculadas.");
      console.log(`Luego se crearían ${filas.length} registros desde el Excel.`);
    } else {
      console.log("\nDry-run: no se modificó la base de datos.");
    }
    return;
  }

  if (!confirm) {
    throw new Error("Agrega --confirm para aplicar la importación.");
  }

  let creados = 0;
  let actualizados = 0;
  let eliminados = 0;

  await prisma.$transaction(async (tx) => {
    if (reemplazarTodo) {
      await tx.dirigente.updateMany({ data: { referenteId: null } });
      const deleted = await tx.dirigente.deleteMany({});
      eliminados = deleted.count;
      console.log(
        `Tablas vinculadas limpiadas (detectados, RC/RG, usuarios, nómina, asistencias, etc.) · Dirigentes eliminados: ${eliminados}`,
      );

      for (const fila of filas) {
        await tx.dirigente.create({
          data: {
            ...defaultsParaFila(fila),
            nomina: {
              create: nominaCreateData({ conceptosComposicion: [] }),
            },
          },
        });
        creados++;
      }
      return;
    }

    for (const fila of filas) {
      const existing = await tx.dirigente.findUnique({
        where: { id: fila.id },
        select: { id: true },
      });

      if (existing) {
        await tx.dirigente.update({
          where: { id: fila.id },
          data: datosDesdeExcel(fila),
        });
        actualizados++;
        continue;
      }

      await tx.dirigente.create({
        data: {
          ...defaultsParaFila(fila),
          nomina: {
            create: nominaCreateData({ conceptosComposicion: [] }),
          },
        },
      });
      creados++;
    }
  });

  const total = await prisma.dirigente.count();
  console.log(`Importación completada.`);
  console.log(`  Creados: ${creados}`);
  console.log(`  Actualizados: ${actualizados}`);
  if (reemplazarTodo) {
    console.log(`  Dirigentes eliminados (con vinculados): ${eliminados}`);
  } else if (eliminados > 0) {
    console.log(`  Eliminados (fuera del Excel): ${eliminados}`);
  }
  console.log(`  Total en BD: ${total}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
