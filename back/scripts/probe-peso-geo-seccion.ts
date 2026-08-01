import { readFileSync, existsSync } from "fs";
import path from "path";
import area from "@turf/area";
import bbox from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon as turfPolygon } from "@turf/helpers";
import type { Feature, Polygon, MultiPolygon } from "geojson";

const CVE_DEMARC = 3;
const GRID = 40;

function loadSection(seccion: string): Feature<Polygon | MultiPolygon> | null {
  const file = path.join(process.cwd(), "data/geo/secciones", `${seccion}.geojson`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as Feature<Polygon | MultiPolygon>;
}

function loadUt(clave: string): Feature<Polygon | MultiPolygon> | null {
  const raw = JSON.parse(
    readFileSync(path.join(process.cwd(), "data/geo/raw/iecm-uts.json"), "utf8"),
  ) as { features: { properties: { cve_ut: string; cve_demarc: number }; geometry: Polygon | MultiPolygon }[] };

  const f = raw.features.find(
    (x) => x.properties.cve_ut === clave && Number(x.properties.cve_demarc) === CVE_DEMARC,
  );
  if (!f?.geometry) return null;
  return { type: "Feature", properties: {}, geometry: f.geometry };
}

function rings(feature: Feature<Polygon | MultiPolygon>): number[][][] {
  if (feature.geometry.type === "Polygon") return [feature.geometry.coordinates[0]];
  return feature.geometry.coordinates.map((p) => p[0]);
}

function pointInFeature(lng: number, lat: number, feature: Feature<Polygon | MultiPolygon>): boolean {
  const pt = point([lng, lat]);
  if (feature.geometry.type === "Polygon") {
    return booleanPointInPolygon(pt, feature as Feature<Polygon>);
  }
  for (const poly of feature.geometry.coordinates) {
    if (booleanPointInPolygon(pt, turfPolygon(poly))) return true;
  }
  return false;
}

function pesoPorMuestreo(
  seccion: Feature<Polygon | MultiPolygon>,
  uts: Feature<Polygon | MultiPolygon>[],
): number[] {
  const box = bbox(seccion);
  const [minLng, minLat, maxLng, maxLat] = box;
  const counts = uts.map(() => 0);
  let dentroSeccion = 0;

  for (let i = 0; i <= GRID; i += 1) {
    for (let j = 0; j <= GRID; j += 1) {
      const lng = minLng + ((maxLng - minLng) * i) / GRID;
      const lat = minLat + ((maxLat - minLat) * j) / GRID;
      if (!pointInFeature(lng, lat, seccion)) continue;
      dentroSeccion += 1;
      uts.forEach((ut, idx) => {
        if (pointInFeature(lng, lat, ut)) counts[idx] += 1;
      });
    }
  }

  if (!dentroSeccion) return counts.map(() => 0);
  return counts.map((c) => c / dentroSeccion);
}

function pesoPorInterseccion(
  seccion: Feature<Polygon | MultiPolygon>,
  ut: Feature<Polygon | MultiPolygon>,
): number {
  // Muestreo fino dentro de la sección limitado a puntos también en UT
  const box = bbox(seccion);
  const [minLng, minLat, maxLng, maxLat] = box;
  let enSeccion = 0;
  let enAmbos = 0;
  const n = 80;

  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= n; j += 1) {
      const lng = minLng + ((maxLng - minLng) * i) / n;
      const lat = minLat + ((maxLat - minLat) * j) / n;
      if (!pointInFeature(lng, lat, seccion)) continue;
      enSeccion += 1;
      if (pointInFeature(lng, lat, ut)) enAmbos += 1;
    }
  }

  return enSeccion > 0 ? enAmbos / enSeccion : 0;
}

const seccion = process.argv[2] ?? "455";
const utClaves = process.argv.slice(3);
const claves = utClaves.length ? utClaves : ["03-130", "03-138"];

const sec = loadSection(seccion);
if (!sec) {
  console.error("Sin geometría sección", seccion);
  process.exit(1);
}

console.log("Área sección m²:", area(sec).toFixed(0));

const utFeatures = claves.map((c) => {
  const ut = loadUt(c);
  if (!ut) throw new Error(`UT ${c} no encontrada`);
  return { clave: c, feature: ut, area: area(ut) };
});

for (const u of utFeatures) {
  const p = pesoPorInterseccion(sec, u.feature);
  console.log(`${u.clave}: overlap=${(p * 100).toFixed(1)}% areaUt=${u.area.toFixed(0)}`);
}

const pesos = pesoPorMuestreo(
  sec,
  utFeatures.map((u) => u.feature),
);
const suma = pesos.reduce((a, b) => a + b, 0);
console.log("--- normalizado ---");
utFeatures.forEach((u, i) => {
  console.log(`${u.clave}: ${suma > 0 ? ((pesos[i] / suma) * 100).toFixed(1) : 0}%`);
});
