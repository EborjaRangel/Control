/**
 * Descarga iecm-uts.json si no existe (requerido para pesos colonia↔sección por polígonos).
 * Uso: npm run geo:ensure-iecm-uts -w control-back
 */

import { ensureIecmUtsGeoJson } from "../src/lib/iecm-uts-geojson.js";

async function main() {
  const file = await ensureIecmUtsGeoJson();
  console.log(`Geometrías UT IECM listas: ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
