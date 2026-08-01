import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { utsParaColonia } from "../src/lib/unidades-territoriales-match.js";
import {
  cargarDatosColoniasSeccion,
  estimarColoniasSeccion,
} from "../src/lib/colonias-seccion.js";
import { cargarCasillasCoyoacan } from "../src/lib/casillas-electorales.js";

async function inspectMatches() {
  const uts = await prisma.unidadTerritorial.findMany({ orderBy: { clave: "asc" } });
  for (const c of ["Ajusco", "Bosques de Tetlameya", "Pedregal de Santa Úrsula"]) {
    const m = utsParaColonia(c, uts);
    console.log(
      c,
      "->",
      m.map((u) => `${u.clave} ${u.nombre} [${u.seccionesElectorales.join(",")}]`),
    );
  }
}

async function inspect(seccion: string) {
  const datos = await cargarDatosColoniasSeccion();
  const colonias = [...(datos.mapa.get(seccion) ?? [])].sort();
  const casillas = cargarCasillasCoyoacan();
  const info = casillas.porSeccion[seccion];
  const totalElectores = info?.casillas?.reduce((s, c) => s + c.listaNominal, 0) ?? 0;
  const det = estimarColoniasSeccion(
    seccion,
    colonias,
    totalElectores,
    datos.dirigentesPorSeccionColonia.get(seccion) ?? new Map(),
    {
      utsPorColonia: datos.utsPorColonia,
      uts: datos.uts,
      enlacesColoniaUt: datos.enlacesColoniaUt,
    },
  );

  console.log(`\n=== Sección ${seccion} ===`);
  console.log("Colonias catálogo:", colonias);
  console.log("Compartida:", det.compartida);
  console.log("Detalle:", JSON.stringify(det, null, 2));

  const uts = await prisma.unidadTerritorial.findMany({
    where: { seccionesElectorales: { has: seccion } },
    select: { clave: true, nombre: true, seccionesElectorales: true },
  });
  console.log(
    `UTs con sección ${seccion}:`,
    uts.map((u) => `${u.clave} ${u.nombre} -> [${u.seccionesElectorales.join(", ")}]`),
  );

  for (const col of [
    "Bosques de Tetlameya",
    "Pedregal de Santa Úrsula",
    "Pueblo de Santa Úrsula Coapa",
    "Cantil del Pedregal",
  ]) {
    const links = await prisma.coloniaUnidadTerritorial.findMany({
      where: { coloniaNombre: col },
      include: {
        unidadTerritorial: {
          select: { clave: true, nombre: true, seccionesElectorales: true },
        },
      },
    });
    console.log(
      `Enlaces ${col}:`,
      links.map(
        (l) =>
          `${l.unidadTerritorial.clave} ${l.unidadTerritorial.nombre} secciones=[${l.unidadTerritorial.seccionesElectorales.join(", ")}]`,
      ),
    );
  }
}

async function main() {
  const seccion = process.argv[2] ?? "455";
  await inspect(seccion);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
