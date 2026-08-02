/**
 * Explica cálculo Operación para una sección.
 * Uso:
 *   set OPERACION_TOKEN=... (JWT admin)
 *   npx tsx scripts/explain-operacion-seccion.ts 642
 */

import type { AnalisisSeccionesResponse } from "../src/lib/analisis.js";
import {
  ANIOS_OPERACION,
  calcularOperacionPan,
  META_OPERACION_PCT,
} from "../src/lib/operacion-pan.js";
import { getEscenarioProyeccion, proyectarSeccionEscenario } from "../src/lib/proyeccion-2027.js";

const SECCION = process.argv[2] ?? "642";

async function main() {
  const base = process.env.OPERACION_API ?? "https://control-production-b69d.up.railway.app";
  const token = process.env.OPERACION_TOKEN;
  if (!token) {
    console.error("Define OPERACION_TOKEN (JWT admin)");
    process.exit(1);
  }

  const res = await fetch(`${base}/api/analisis/secciones`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = (await res.json()) as AnalisisSeccionesResponse;

  const fila = data.filas.find((f) => f.seccion === SECCION);
  if (!fila) {
    console.log(`Sección ${SECCION} no encontrada`);
    return;
  }

  const esc = getEscenarioProyeccion("partidos_solos");
  const proy = proyectarSeccionEscenario(fila, esc, { aniosRegresion: ANIOS_OPERACION });
  if (!proy) {
    console.log("Sin proyección (menos de 2 elecciones con datos)");
    return;
  }

  const op = calcularOperacionPan(data.filas).filas.find((f) => f.seccion === SECCION);
  const pan = proy.proyeccion2027.find((b) => b.id === "PAN");
  const listaBase =
    fila.alcalde2024?.listaNominal ??
    fila.alcalde2021?.listaNominal ??
    fila.totalElectores;

  console.log(`\n=== Operación · Sección ${SECCION} ===\n`);
  console.log("Colonias:", fila.colonias);
  console.log("UTs:", op?.unidadesTerritoriales ?? fila.unidadesTerritoriales);
  console.log(`\nRegresión OLS solo en elecciones intermedias: ${ANIOS_OPERACION.join(", ")}`);
  console.log("\n--- 1) Votación estimada 2027 ---");
  console.log("Lista nominal (2024 o fallback):", listaBase);
  for (const p of proy.participacionHistorica) {
    console.log(`  Participación ${p.anio}: ${p.pct}%`);
  }
  console.log(`Participación proyectada 2027: ${proy.participacion2027}%`);
  console.log(
    `Votación estimada = round(${listaBase} × ${proy.participacion2027} / 100) = ${proy.votacionEstimada2027} votos`,
  );

  console.log("\n--- 2) PAN proyectado (escenario partidos en solitario) ---");
  for (const h of proy.historico.PAN ?? []) {
    console.log(`  ${h.anio}: ${h.porcentaje}% del voto (${h.votos} votos)`);
  }
  console.log(
    `Regresión lineal → PAN 2027: ${pan?.porcentaje}% = ${pan?.votos} votos`,
  );

  console.log(`\n--- 3) Meta operación (${META_OPERACION_PCT}%) ---`);
  console.log(
    `Meta = round(${proy.votacionEstimada2027} × 0.30) = ${op?.metaOperacionVotos} votos`,
  );

  console.log("\n--- 4) Faltante (para ordenar la tabla) ---");
  console.log(
    `Faltante = max(0, meta − PAN) = max(0, ${op?.metaOperacionVotos} − ${op?.votosPanProyectados}) = ${op?.faltanteVotos} votos`,
  );

  if (fila.coloniasDetalle.colonias.length) {
    console.log("\n--- Colonias / UT ---");
    for (const c of fila.coloniasDetalle.colonias) {
      console.log(
        `  ${c.nombre}: ~${c.porcentajeEstimado}% sección · UT ${c.utClave} — ${c.utNombre ?? ""}`,
      );
    }
  }
}

main().catch(console.error);
