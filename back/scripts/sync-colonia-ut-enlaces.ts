/**
 * Sincroniza enlaces colonia↔UT desde COLONIA_UT_CLAVES.
 * Crea faltantes y elimina enlaces que ya no están autorizados.
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
  const claveById = new Map(uts.map((ut) => [ut.id, ut.clave]));

  const autorizados = new Set<string>();
  let creados = 0;
  let omitidos = 0;
  let borrados = 0;

  for (const [coloniaNombre, claves] of Object.entries(COLONIA_UT_CLAVES)) {
    for (const clave of claves) {
      const utId = utByClave.get(clave);
      if (!utId) {
        console.warn(`UT ${clave} no encontrada (colonia: ${coloniaNombre})`);
        continue;
      }
      autorizados.add(`${coloniaNombre}::${utId}`);

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

  const enlaces = await prisma.coloniaUnidadTerritorial.findMany({
    select: { id: true, coloniaNombre: true, unidadTerritorialId: true },
  });
  for (const enlace of enlaces) {
    if (autorizados.has(`${enlace.coloniaNombre}::${enlace.unidadTerritorialId}`)) continue;
    const clave = claveById.get(enlace.unidadTerritorialId) ?? "?";
    await prisma.coloniaUnidadTerritorial.delete({ where: { id: enlace.id } });
    borrados++;
    console.log(`- ${enlace.coloniaNombre} → ${clave}`);
  }

  console.log(`Enlaces nuevos: ${creados}; ya existían: ${omitidos}; eliminados: ${borrados}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
