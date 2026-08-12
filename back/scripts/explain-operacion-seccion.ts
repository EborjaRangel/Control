/**
 * Explica cálculo Operación para una sección.
 * Uso: npx tsx scripts/explain-operacion-seccion.ts 642
 */

import "dotenv/config";
import { analisisSeccionesElectorales } from "../src/lib/analisis-secciones.js";
import { proyectarSeccionEscenario, getEscenarioProyeccion } from "../src/lib/proyeccion-2027.js";

const SECCION = process.argv[2] ?? "642";
const META = 0.3;

async function main() {
  const data = await analisisSeccionesElectorales();
  const fila = data.filas.find((f) => f.seccion === SECCION);
  if (!fila) {
    console.log(`Sección ${SECCION} no encontrada`);
    return;
  }

  const esc = getEscenarioProyeccion("partidos_solos");
  const proy = proyectarSeccionEscenario(fila, esc);
  if (!proy) {
    console.log(`Sin proyección (historial insuficiente)`);
    return;
  }

  const pan = proy.proyeccion2027.find((b) => b.id === "PAN");
  const listaBase =
    fila.alcalde2024?.listaNominal ??
    fila.alcalde2021?.listaNominal ??
    fila.totalElectores;
  const meta = Math.round(proy.votacionEstimada2027 * META);
  const falt = Math.max(0, meta - (pan?.votos ?? 0));

  console.log(`\n=== Operación · Sección ${SECCION} ===\n`);
  console.log("Colonias:", fila.colonias);
  console.log("UTs catálogo:", fila.unidadesTerritoriales);
  console.log("\n--- Paso 1: votación estimada 2027 ---");
  console.log("Lista nominal base:", listaBase);
  console.log("Participación histórica:", proy.participacionHistorica);
  console.log("Participación proyectada 2027 (%):", proy.participacion2027);
  console.log(
    `Votación estimada = ${listaBase} × ${proy.participacion2027}% = ${proy.votacionEstimada2027} votos`,
  );

  console.log("\n--- Paso 2: PAN proyectado (partido solo, regresión 2015–2024) ---");
  console.log("Histórico % PAN por elección:");
  for (const h of proy.historico.PAN ?? []) {
    console.log(`  ${h.anio}: ${h.porcentaje}% (${h.votos} votos)`);
  }
  console.log(
    `PAN 2027 proyectado: ${pan?.porcentaje}% → ${pan?.votos} votos sobre ${proy.votacionEstimada2027}`,
  );

  console.log("\n--- Paso 3: meta operación (30%) ---");
  console.log(`Meta = ${proy.votacionEstimada2027} × 30% = ${meta} votos`);

  console.log("\n--- Paso 4: faltante ---");
  console.log(`Faltante = max(0, ${meta} − ${pan?.votos ?? 0}) = ${falt} votos`);

  if (fila.coloniasDetalle.colonias.length) {
    console.log("\n--- Colonias / UT (detalle) ---");
    for (const c of fila.coloniasDetalle.colonias) {
      console.log(
        `  ${c.nombre}: ${c.porcentajeEstimado}% · UT ${c.utClave ?? "—"} ${c.utNombre ?? ""}`,
      );
    }
  }
}

main().catch(console.error);
