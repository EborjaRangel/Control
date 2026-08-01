/**
 * Audita las 403 secciones: detecta UT duplicada o 2+ colonias con una sola UT.
 * Uso: npx tsx scripts/verify-ut-unica-secciones.ts
 */

import "dotenv/config";
import { cargarDatosColoniasSeccion, estimarColoniasSeccion } from "../src/lib/colonias-seccion.js";
import { cargarCasillasCoyoacan } from "../src/lib/casillas-electorales.js";
import { SECCIONES_ELECTORALES_COYOACAN } from "../src/lib/secciones-electorales.js";

type Problema = {
  seccion: string;
  tipo: string;
  detalle: string;
};

async function main() {
  const datos = await cargarDatosColoniasSeccion();
  const casillas = cargarCasillasCoyoacan();

  const problemas: Problema[] = [];
  let compartidas = 0;
  let unaUtVariasColonias = 0;
  let utDuplicadaEnDetalle = 0;

  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    const colonias = [...(datos.mapa.get(seccion) ?? [])].sort();
    if (!colonias.length) continue;

    const utsSec = datos.uts.filter((u) => u.seccionesElectorales.includes(seccion));
    const clavesUt = [...new Set(utsSec.map((u) => u.clave))];

    if (colonias.length > 1) compartidas += 1;

    if (clavesUt.length === 1 && colonias.length > 1) {
      unaUtVariasColonias += 1;
      problemas.push({
        seccion,
        tipo: "1_UT_varias_colonias",
        detalle: `UT ${clavesUt[0]} → ${colonias.join(" | ")}`,
      });
    }

    const electores =
      casillas.porSeccion[seccion]?.casillas?.reduce((s, c) => s + c.listaNominal, 0) ?? 0;
    const det = estimarColoniasSeccion(
      seccion,
      colonias,
      electores,
      datos.dirigentesPorSeccionColonia.get(seccion) ?? new Map(),
      {
        utsPorColonia: datos.utsPorColonia,
        uts: datos.uts,
        enlacesColoniaUt: datos.enlacesColoniaUt,
      },
    );

    const utsEnDetalle = det.colonias.map((c) => c.utClave).filter(Boolean);
    const utsUnicasDetalle = new Set(utsEnDetalle);
    if (utsEnDetalle.length > utsUnicasDetalle.size) {
      utDuplicadaEnDetalle += 1;
      const filas = det.colonias
        .map((c) => `${c.nombre} ${c.porcentajeEstimado}% (${c.utClave})`)
        .join(" | ");
      problemas.push({
        seccion,
        tipo: "UT_repetida_detalle",
        detalle: filas,
      });
    }

    if (clavesUt.length === 1 && det.colonias.length > 1) {
      problemas.push({
        seccion,
        tipo: "1_UT_detalle_compartido",
        detalle: det.colonias
          .map((c) => `${c.nombre} ${c.porcentajeEstimado}%`)
          .join(" | "),
      });
    }

    if (clavesUt.length === 1 && det.colonias.length === 1 && det.colonias[0].porcentajeEstimado !== 100) {
      problemas.push({
        seccion,
        tipo: "1_UT_no_100%",
        detalle: `${det.colonias[0].nombre} ${det.colonias[0].porcentajeEstimado}%`,
      });
    }
  }

  console.log(`Secciones revisadas: ${SECCIONES_ELECTORALES_COYOACAN.length}`);
  console.log(`Con colonia asignada: ${[...datos.mapa.keys()].length}`);
  console.log(`Compartidas (2+ colonias catálogo): ${compartidas}`);
  console.log(`Problemas detectados: ${problemas.length}`);
  console.log(`  - 1 UT pero varias colonias en catálogo: ${unaUtVariasColonias}`);
  console.log(`  - UT repetida en detalle (%): ${utDuplicadaEnDetalle}`);
  console.log("---");

  const porTipo = new Map<string, Problema[]>();
  for (const p of problemas) {
    const lista = porTipo.get(p.tipo) ?? [];
    lista.push(p);
    porTipo.set(p.tipo, lista);
  }

  for (const [tipo, lista] of porTipo) {
    console.log(`\n## ${tipo} (${lista.length})`);
    for (const p of lista.slice(0, 30)) {
      console.log(`  ${p.seccion}: ${p.detalle}`);
    }
    if (lista.length > 30) console.log(`  ... y ${lista.length - 30} más`);
  }

  if (problemas.length === 0) {
    console.log("\nOK: ninguna sección con UT duplicada o reparto incorrecto en UT única.");
  }

  process.exit(problemas.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
