/**
 * Sincroniza enlaces colonia↔UT desde COLONIA_UT_CLAVES (solo crea faltantes; no borra).
 *
 * Uso: npm run geo:sync-colonia-uts -w control-back
 */

import "dotenv/config";
import { COLONIA_UT_CLAVES } from "../src/lib/colonia-ut-claves.js";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const uts = await prisma.unidadTerritorial.findMany({
    select: { id: true, clave: true },
  });
  const utByClave = new Map(uts.map((ut) => [ut.clave, ut.id]));

  let creados = 0;
  let omitidos = 0;

  for (const [coloniaNombre, claves] of Object.entries(COLONIA_UT_CLAVES)) {
    for (const clave of claves) {
      const utId = utByClave.get(clave);
      if (!utId) {
        console.warn(`UT ${clave} no encontrada (colonia: ${coloniaNombre})`);
        continue;
      }

      const existente = await prisma.coloniaUnidadTerritorial.findFirst({
        where: { coloniaNombre, unidadTerritorialId: utId },
      });
      if (existente) {
        omitidos++;
        continue;
      }

      await prisma.coloniaUnidadTerritorial.create({
        data: { coloniaNombre, unidadTerritorialId: utId },
      });
      creados++;
      console.log(`+ ${coloniaNombre} → ${clave}`);
    }
  }

  console.log(`Enlaces nuevos: ${creados}; ya existían: ${omitidos}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
