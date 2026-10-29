/**
 * Excel de dirigentes: nombre, apellidos y distrito local, ordenado por apellido paterno.
 *
 * Uso:
 *   npx tsx scripts/export-dirigentes-distrito-local.ts
 *   railway run --service Control -- npx tsx scripts/export-dirigentes-distrito-local.ts
 */

import "dotenv/config";
import path from "path";
import os from "os";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/prisma.js";
import { compararDirigentePorApellidosNombre } from "../src/lib/dirigentes.js";

function fechaArchivo() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function rutaSalida(argv: string[]) {
  const idx = argv.indexOf("--out");
  if (idx >= 0 && argv[idx + 1]) return path.resolve(argv[idx + 1]);
  return path.join(
    os.homedir(),
    "Desktop",
    `dirigentes-alta-distrito-local-${fechaArchivo()}.xlsx`,
  );
}

async function main() {
  const archivo = rutaSalida(process.argv.slice(2));

  const dirigentes = await prisma.dirigente.findMany({
    where: { status: "ACTIVO", activo: true },
    select: {
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
      distritoLocal: true,
    },
  });

  dirigentes.sort(compararDirigentePorApellidosNombre);

  const filas = dirigentes.map((d) => ({
    Nombre: d.nombre,
    "Apellido paterno": d.primerApellido,
    "Apellido materno": d.segundoApellido?.trim() || "",
    "Distrito local": d.distritoLocal ?? "",
  }));

  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 16 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Dirigentes");
  XLSX.writeFile(libro, archivo);

  console.log(`Registros (estatus alta): ${filas.length}`);
  console.log(`Archivo: ${archivo}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
