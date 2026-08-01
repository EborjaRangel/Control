import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const secciones = process.argv.slice(2);
  const enlaces = await prisma.coloniaUnidadTerritorial.findMany({
    include: {
      unidadTerritorial: { select: { clave: true, nombre: true, seccionesElectorales: true } },
    },
  });

  for (const seccion of secciones) {
    const colonias = new Set<string>();
    const utsSec: string[] = [];
    for (const e of enlaces) {
      if (e.unidadTerritorial.seccionesElectorales.includes(seccion)) {
        colonias.add(e.coloniaNombre);
        utsSec.push(`${e.unidadTerritorial.clave} ${e.unidadTerritorial.nombre}`);
      }
    }
    console.log(`\n${seccion}:`);
    console.log("  colonias:", [...colonias].join(", ") || "—");
    console.log("  uts:", [...new Set(utsSec)].join(" | ") || "—");
  }

  await prisma.$disconnect();
}

main();
