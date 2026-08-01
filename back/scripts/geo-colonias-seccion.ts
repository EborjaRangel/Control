import { readFileSync, existsSync } from "fs";
import path from "path";
import { COLONIAS_COYOACAN } from "../src/lib/colonias.js";
import { SECCIONES_ELECTORALES_COYOACAN } from "../src/lib/secciones-electorales.js";

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(lng: number, lat: number, coords: number[][][]): boolean {
  if (!coords.length) return false;
  if (!pointInRing(lng, lat, coords[0])) return false;
  for (let h = 1; h < coords.length; h++) {
    if (pointInRing(lng, lat, coords[h])) return false;
  }
  return true;
}

function coloniaDentroDeSeccion(seccion: string, colonia: string): boolean | null {
  const file = path.join(process.cwd(), "data/geo/secciones", `${seccion}.geojson`);
  if (!existsSync(file)) return null;
  const feature = JSON.parse(readFileSync(file, "utf8")) as GeoJSON.Feature;
  const geom = feature.geometry;
  if (!geom) return null;

  const coloniaData = COLONIAS_COYOACAN.find((c) => c.nombre === colonia);
  if (!coloniaData) return null;

  const polys: number[][][][] =
    geom.type === "Polygon"
      ? [geom.coordinates as number[][][]]
      : (geom.coordinates as number[][][][]);

  return polys.some((poly) => pointInPolygonCoords(coloniaData.lng, coloniaData.lat, poly));
}

const seccion = process.argv[2] ?? "455";
const colonias = process.argv.slice(3);
const lista = colonias.length
  ? colonias
  : COLONIAS_COYOACAN.map((c) => c.nombre);

console.log(`Sección ${seccion} — punto de colonia dentro del polígono INE:`);
for (const colonia of lista) {
  const r = coloniaDentroDeSeccion(seccion, colonia);
  if (r === true) console.log(`  ✓ ${colonia}`);
}
