import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import {
  cargarDatosColoniasSeccion,
  estimarColoniasSeccion,
} from "../src/lib/colonias-seccion.js";
import {
  coloniasPorUtEnSeccion,
  pesosColoniasPorUtEnSeccion,
} from "../src/lib/colonias-seccion-filtro.js";
import { cargarCasillasCoyoacan } from "../src/lib/casillas-electorales.js";
import { SECCIONES_ELECTORALES_COYOACAN } from "../src/lib/secciones-electorales.js";

async function coloniasSinFiltro() {
  const [enlaces, uts] = await Promise.all([
    prisma.coloniaUnidadTerritorial.findMany({
      include: {
        unidadTerritorial: { select: { clave: true, nombre: true, seccionesElectorales: true } },
      },
    }),
    prisma.unidadTerritorial.findMany({
      select: { clave: true, nombre: true, seccionesElectorales: true },
    }),
  ]);

  const enlacesColoniaUt = enlaces.map((e) => ({
    coloniaNombre: e.coloniaNombre,
    utClave: e.unidadTerritorial.clave,
  }));

  const mapa = new Map<string, Set<string>>();
  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    const set = new Set<string>();
    for (const enlace of enlaces) {
      if (enlace.unidadTerritorial.seccionesElectorales.includes(seccion)) {
        set.add(enlace.coloniaNombre);
      }
    }
    if (set.size) mapa.set(seccion, set);
  }

  return { mapa, uts, enlacesColoniaUt };
}

async function main() {
  const [{ mapa: antesMapa, uts, enlacesColoniaUt }, datos] = await Promise.all([
    coloniasSinFiltro(),
    cargarDatosColoniasSeccion(),
  ]);

  const casillas = cargarCasillasCoyoacan();
  let compartidas = 0;
  let ajustadas = 0;
  const cambios: string[] = [];

  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    const antes = [...(antesMapa.get(seccion) ?? [])].sort((a, b) => a.localeCompare(b, "es"));
    const despues = [...(datos.mapa.get(seccion) ?? [])].sort((a, b) => a.localeCompare(b, "es"));

    if (despues.length > 1) compartidas += 1;

    const antesKey = antes.join("|");
    const despuesKey = despues.join("|");
    if (antesKey !== despuesKey) {
      ajustadas += 1;
      const electores = info?.casillas?.reduce((s, c) => s + c.listaNominal, 0) ?? 0;
      const det = estimarColoniasSeccion(
        seccion,
        despues,
        electores,
        datos.dirigentesPorSeccionColonia.get(seccion) ?? new Map(),
        {
          utsPorColonia: datos.utsPorColonia,
          uts: datos.uts,
          enlacesColoniaUt: datos.enlacesColoniaUt,
        },
      );

      cambios.push(
        `${seccion}: [${antes.join(", ") || "—"}] → [${despues.join(", ") || "—"}]` +
          (det.compartida ? ` (${det.colonias.map((c) => `${c.nombre} ${c.porcentajeEstimado}%`).join(", ")})` : ""),
      );
    }
  }

  console.log(`Secciones revisadas: ${SECCIONES_ELECTORALES_COYOACAN.length}`);
  console.log(`Secciones compartidas (2+ colonias): ${compartidas}`);
  console.log(`Secciones ajustadas por filtro: ${ajustadas}`);

  let sinColonias = 0;
  const listasSinColonias: string[] = [];
  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    if (!(datos.mapa.get(seccion)?.size ?? 0)) {
      sinColonias += 1;
      listasSinColonias.push(seccion);
    }
  }
  console.log(`Secciones sin colonia asignada: ${sinColonias}`);
  if (listasSinColonias.length) {
    console.log(`  ${listasSinColonias.join(", ")}`);
  }
  console.log("---");

  for (const linea of cambios) {
    console.log(linea);
  }

  const s455 = datos.mapa.get("455");
  console.log("---");
  console.log("455 final:", s455 ? [...s455].join(", ") : "—");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
