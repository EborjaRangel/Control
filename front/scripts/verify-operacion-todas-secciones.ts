/**
 * Verifica que Operación proyecte las 403 secciones con regresión 2015+2021.
 * Uso: OPERACION_TOKEN=... npx tsx scripts/verify-operacion-todas-secciones.ts
 */

import type { AnalisisSeccionesResponse } from "../src/lib/analisis.js";
import { ANIOS_OPERACION, calcularOperacionPan } from "../src/lib/operacion-pan.js";
import { getEscenarioProyeccion, proyectarSeccionEscenario } from "../src/lib/proyeccion-2027.js";

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

  const esc = getEscenarioProyeccion("partidos_solos");
  const sin2015: string[] = [];
  const sin2021: string[] = [];
  const sinAmbos: string[] = [];

  for (const fila of data.filas) {
    const tiene2015 = Boolean(fila.alcalde2015);
    const tiene2021 = Boolean(fila.alcalde2021);
    if (!tiene2015 && !tiene2021) sinAmbos.push(fila.seccion);
    else if (!tiene2015) sin2015.push(fila.seccion);
    else if (!tiene2021) sin2021.push(fila.seccion);
  }

  const { filas, resumen } = calcularOperacionPan(data.filas);
  const faltan = data.filas.filter((f) => !filas.some((o) => o.seccion === f.seccion));

  console.log("\n=== Verificación Operación (2015 + 2021) ===\n");
  console.log("Años regresión:", ANIOS_OPERACION.join(", "));
  console.log("Secciones en API:", data.filas.length);
  console.log("Secciones proyectadas:", filas.length);
  console.log("Meta esperada: 403");
  console.log("\nResumen agregado:");
  console.log(`  Votación estimada: ${resumen.votacionEstimadaTotal.toLocaleString("es-MX")}`);
  console.log(`  PAN proyectado: ${resumen.votosPanProyectadosTotal.toLocaleString("es-MX")} (${resumen.porcentajePanAgregado}%)`);
  console.log(`  Meta 30%: ${resumen.metaOperacionTotal.toLocaleString("es-MX")}`);
  console.log(`  Faltante total: ${resumen.faltanteTotal.toLocaleString("es-MX")}`);

  if (sin2015.length) console.log("\nSin datos 2015:", sin2015.length, sin2015.slice(0, 10).join(", "));
  if (sin2021.length) console.log("Sin datos 2021:", sin2021.length, sin2021.slice(0, 10).join(", "));
  if (sinAmbos.length) console.log("Sin 2015 ni 2021:", sinAmbos.length, sinAmbos.join(", "));

  if (faltan.length) {
    console.log("\nSecciones sin proyección Operación:", faltan.length);
    for (const f of faltan) {
      const proy = proyectarSeccionEscenario(f, esc, { aniosRegresion: ANIOS_OPERACION });
      console.log(`  ${f.seccion}: alcalde2015=${Boolean(f.alcalde2015)} alcalde2021=${Boolean(f.alcalde2021)} proy=${proy != null}`);
    }
    process.exit(1);
  }

  if (filas.length !== 403) {
    console.warn(`\nAdvertencia: se proyectaron ${filas.length} secciones, no 403.`);
  } else {
    console.log("\nOK: las 403 secciones tienen proyección Operación con regresión 2015+2021.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
