/**
 * Verifica las 403 secciones: enlaces colonia↔UT solo por clave autorizada.
 * Uso: npx tsx scripts/verify-claves-todas-secciones.ts
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { cargarDatosColoniasSeccion } from "../src/lib/colonias-seccion.js";
import { COLONIA_UT_CLAVES, enlaceColoniaUtValido } from "../src/lib/colonia-ut-claves.js";
import { SECCIONES_ELECTORALES_COYOACAN } from "../src/lib/secciones-electorales.js";

async function main() {
  const coloniasCatalogo = Object.keys(COLONIA_UT_CLAVES).length;
  const datos = await cargarDatosColoniasSeccion();

  const enlacesDb = await prisma.coloniaUnidadTerritorial.findMany({
    include: { unidadTerritorial: { select: { clave: true } } },
  });

  const enlacesInvalidos = enlacesDb.filter(
    (e) => !enlaceColoniaUtValido(e.coloniaNombre, e.unidadTerritorial.clave),
  );

  let sinColonias = 0;
  const listasSinColonias: string[] = [];
  let compartidas = 0;

  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    const n = datos.mapa.get(seccion)?.size ?? 0;
    if (!n) {
      sinColonias += 1;
      listasSinColonias.push(seccion);
    } else if (n > 1) compartidas += 1;
  }

  console.log(`Colonias en COLONIA_UT_CLAVES: ${coloniasCatalogo}`);
  console.log(`Secciones revisadas: ${SECCIONES_ELECTORALES_COYOACAN.length}`);
  console.log(`Secciones con colonia asignada: ${SECCIONES_ELECTORALES_COYOACAN.length - sinColonias}`);
  console.log(`Secciones compartidas (2+ colonias): ${compartidas}`);
  console.log(`Secciones sin colonia: ${sinColonias}`);
  console.log(`Enlaces DB inválidos (sin clave autorizada): ${enlacesInvalidos.length}`);

  if (enlacesInvalidos.length) {
    console.log("--- Enlaces inválidos ---");
    for (const e of enlacesInvalidos.slice(0, 20)) {
      console.log(`  ${e.coloniaNombre} → ${e.unidadTerritorial.clave}`);
    }
  }

  if (listasSinColonias.length) {
    console.log("--- Secciones sin colonia ---");
    console.log(listasSinColonias.join(", "));
  }

  // Muestras clave
  for (const sec of ["617", "455", "703"]) {
    const cols = [...(datos.mapa.get(sec) ?? [])].sort();
    console.log(`Sección ${sec}: ${cols.join(", ") || "—"}`);
  }

  await prisma.$disconnect();
  if (enlacesInvalidos.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
