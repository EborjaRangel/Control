/**
 * Borra todos los reportes de servicios urbanos de la base conectada.
 * No toca dirigentes ni otros módulos.
 *
 * Uso:
 *   npx tsx scripts/vaciar-reportes-servicios-urbanos.ts --dry-run
 *   npx tsx scripts/vaciar-reportes-servicios-urbanos.ts --confirm
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

function parseArgs(argv: string[]) {
  return {
    confirm: argv.includes("--confirm"),
    dryRun: argv.includes("--dry-run"),
  };
}

async function main() {
  const { confirm, dryRun } = parseArgs(process.argv.slice(2));
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").hostname;
    } catch {
      return "desconocido";
    }
  })();

  const total = await prisma.reporteServicioUrbano.count();
  const porEstatus = await prisma.reporteServicioUrbano.groupBy({
    by: ["estatus"],
    _count: { _all: true },
  });

  console.log(`Base: ${host}`);
  console.log(`Reportes de servicios urbanos: ${total}`);
  for (const row of porEstatus) {
    console.log(`  ${row.estatus}: ${row._count._all}`);
  }

  if (dryRun) {
    console.log("\nDry-run: no se borró nada.");
    return;
  }

  if (!confirm) {
    throw new Error("Agrega --confirm para borrar o --dry-run para simular.");
  }

  const borrados = await prisma.reporteServicioUrbano.deleteMany();
  const quedan = await prisma.reporteServicioUrbano.count();
  console.log(`\nBorrados: ${borrados.count}`);
  console.log(`Quedan: ${quedan}`);

  if (quedan > 0) {
    throw new Error("Quedaron reportes; revisa el vaciado.");
  }

  console.log("Listo. El admin y los dirigentes quedan en cero. El siguiente folio será SU-YYYYMMDD-0001.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
