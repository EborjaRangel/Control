/**
 * Verifica ponderación geográfica IECM en secciones compartidas de referencia.
 * Uso: npx tsx scripts/verify-peso-geo-colonias.ts
 */
import "dotenv/config";
import {
  cargarDatosColoniasSeccion,
  estimarColoniasSeccion,
} from "../src/lib/colonias-seccion.js";
import { cargarCasillasCoyoacan } from "../src/lib/casillas-electorales.js";
import { prisma } from "../src/lib/prisma.js";

const REFERENCIAS: {
  seccion: string;
  colonia: string;
  minPct: number;
  maxPct: number;
}[] = [
  { seccion: "455", colonia: "Pedregal de Santa Úrsula", minPct: 85, maxPct: 95 },
  { seccion: "455", colonia: "Ajusco", minPct: 5, maxPct: 15 },
];

async function main() {
  const datos = await cargarDatosColoniasSeccion();
  const casillas = cargarCasillasCoyoacan();
  let ok = 0;
  let fail = 0;

  for (const ref of REFERENCIAS) {
    const electores =
      casillas.porSeccion[ref.seccion]?.casillas?.reduce((s, c) => s + c.listaNominal, 0) ?? 0;
    const colonias = [...(datos.mapa.get(ref.seccion) ?? [])];
    const det = estimarColoniasSeccion(
      ref.seccion,
      colonias,
      electores,
      datos.dirigentesPorSeccionColonia.get(ref.seccion) ?? new Map(),
      {
        utsPorColonia: datos.utsPorColonia,
        uts: datos.uts,
        enlacesColoniaUt: datos.enlacesColoniaUt,
      },
    );

    const row = det.colonias.find((c) => c.nombre === ref.colonia);
    const pct = row?.porcentajeEstimado ?? -1;
    const pasa = pct >= ref.minPct && pct <= ref.maxPct;

    console.log(
      `${pasa ? "OK" : "FAIL"} sección ${ref.seccion} · ${ref.colonia}: ${pct.toFixed(1)}% (esperado ${ref.minPct}–${ref.maxPct}%)`,
    );
    if (pasa) ok += 1;
    else fail += 1;
  }

  console.log(`--- ${ok} ok, ${fail} fail ---`);
  await prisma.$disconnect();
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
