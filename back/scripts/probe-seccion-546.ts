import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { COLONIA_UT_CLAVES } from "../src/lib/colonia-ut-claves.js";
import { fraccionSeccionEnUt, pesosUtSuperposicionGeo } from "../src/lib/colonias-seccion-geo.js";
import { pesosColoniasPorUtEnSeccion } from "../src/lib/colonias-seccion-filtro.js";

const SECCION = "546";
const UTS = ["03-012", "03-108", "03-134", "03-150"];

async function main() {
  console.log(`=== Sección ${SECCION} — overlap UT ∩ sección ===`);
  for (const clave of UTS) {
    const f = fraccionSeccionEnUt(SECCION, clave);
    console.log(`  ${clave}: ${f != null ? `${(f * 100).toFixed(2)}%` : "n/a"}`);
  }

  const pesosGeo = pesosUtSuperposicionGeo(SECCION, UTS);
  console.log("\nPesos geo normalizados:");
  for (const [k, v] of pesosGeo) console.log(`  ${k}: ${(v * 100).toFixed(2)}%`);

  const uts = await prisma.unidadTerritorial.findMany({
    where: { clave: { in: UTS } },
    select: { clave: true, nombre: true, seccionesElectorales: true },
  });

  const enlacesDb = await prisma.coloniaUnidadTerritorial.findMany({
    where: { unidadTerritorial: { clave: { in: UTS } } },
    include: { unidadTerritorial: { select: { clave: true, nombre: true } } },
  });

  console.log("\nColonias enlazadas a UTs de la sección:");
  for (const clave of UTS) {
    const cols = enlacesDb
      .filter((e) => e.unidadTerritorial.clave === clave)
      .map((e) => e.coloniaNombre);
    console.log(`  ${clave}: ${cols.join(", ") || "(sin enlace)"}`);
  }

  console.log("\nCOLONIA_UT_CLAVES para colonias mostradas:");
  for (const c of [
    "Campestre Churubusco",
    "Paseos de Taxqueña",
    "Santa Martha del Sur Quetzalcoatl",
    "Ex-Ejido de Churubusco",
  ]) {
    console.log(`  ${c}: ${COLONIA_UT_CLAVES[c]?.join(", ") ?? "—"}`);
  }

  const enlacesColoniaUt = enlacesDb.map((e) => ({
    coloniaNombre: e.coloniaNombre,
    utClave: e.unidadTerritorial.clave,
  }));

  const { pesos } = pesosColoniasPorUtEnSeccion(SECCION, uts, enlacesColoniaUt);
  console.log("\nPesos finales colonias:");
  for (const [colonia, meta] of [...pesos.entries()].sort()) {
    console.log(
      `  ${colonia}: ${(meta.peso * 100).toFixed(2)}% · ${meta.utClave} ${meta.utNombre}`,
    );
  }

  await prisma.$disconnect();
}

main();
