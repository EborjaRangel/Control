import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import {
  coloniasPorUtEnSeccion,
  pesosColoniasPorUtEnSeccion,
} from "../src/lib/colonias-seccion-filtro.js";

async function main() {
  const seccion = process.argv[2] ?? "455";
  const uts = await prisma.unidadTerritorial.findMany({
    select: { clave: true, nombre: true, seccionesElectorales: true },
  });
  const enlacesDb = await prisma.coloniaUnidadTerritorial.findMany({
    include: { unidadTerritorial: { select: { clave: true } } },
  });
  const enlaces = enlacesDb.map((e) => ({
    coloniaNombre: e.coloniaNombre,
    utClave: e.unidadTerritorial.clave,
  }));

  const colonias = coloniasPorUtEnSeccion(seccion, uts, enlaces);
  const { pesos } = pesosColoniasPorUtEnSeccion(seccion, uts, enlaces);

  console.log(`Sección ${seccion}:`);
  console.log("Colonias:", colonias);
  for (const [nombre, meta] of pesos) {
    console.log(`  ${nombre}: peso=${meta.peso.toFixed(4)} UT=${meta.utClave} ${meta.utNombre}`);
  }

  await prisma.$disconnect();
}

main();
