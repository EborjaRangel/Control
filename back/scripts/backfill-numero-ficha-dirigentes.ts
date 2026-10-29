/**
 * Asigna numeroFicha a todos los dirigentes:
 * - id numérico del Excel → mismo número
 * - id cuid → consecutivo desde max+1 (por createdAt)
 *
 * Uso: npx tsx scripts/backfill-numero-ficha-dirigentes.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import {
  maxNumeroFichaEnUso,
  numeroDesdeIdLegacy,
  reservarSiguienteNumeroFicha,
} from "../src/lib/numero-ficha-dirigente.js";

async function main() {
  const todos = await prisma.dirigente.findMany({
    select: { id: true, numeroFicha: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  let asignadosLegacy = 0;
  for (const d of todos) {
    if (d.numeroFicha != null) continue;
    const legacy = numeroDesdeIdLegacy(d.id);
    if (legacy == null) continue;
    await prisma.dirigente.update({
      where: { id: d.id },
      data: { numeroFicha: legacy },
    });
    asignadosLegacy++;
  }

  const sinFicha = await prisma.dirigente.findMany({
    where: { numeroFicha: null },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  let asignadosCuid = 0;
  for (const d of sinFicha) {
    const numeroFicha = await prisma.$transaction(async (tx) => reservarSiguienteNumeroFicha(tx));
    await prisma.dirigente.update({
      where: { id: d.id },
      data: { numeroFicha },
    });
    asignadosCuid++;
    console.log(`  ${d.id} → #${numeroFicha}`);
  }

  const pendientes = await prisma.dirigente.count({ where: { numeroFicha: null } });
  const max = await maxNumeroFichaEnUso(prisma);

  console.log("=== Backfill numeroFicha ===");
  console.log(`Desde id Excel: ${asignadosLegacy}`);
  console.log(`Desde cuid (nuevos): ${asignadosCuid}`);
  console.log(`Sin ficha: ${pendientes}`);
  console.log(`Máximo en uso: ${max}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
