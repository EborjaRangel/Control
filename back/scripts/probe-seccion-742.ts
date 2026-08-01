import "dotenv/config";
import { cargarDatosColoniasSeccion } from "../src/lib/colonias-seccion.js";
import { fraccionSeccionEnUt } from "../src/lib/colonias-seccion-geo.js";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import { readFileSync } from "fs";
import path from "path";

const raw = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "../data/geo/raw/iecm-uts.json"), "utf8"),
) as {
  features: {
    properties: { cve_ut: string; cve_demarc: number; nombre: string };
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  }[];
};

function utFeature(clave: string) {
  const f = raw.features.find(
    (x) => x.properties.cve_ut === clave && Number(x.properties.cve_demarc) === 3,
  );
  if (!f?.geometry) return null;
  return { type: "Feature" as const, properties: {}, geometry: f.geometry };
}

function puntoEnUt(clave: string, lat: number, lng: number) {
  const ut = utFeature(clave);
  if (!ut) return false;
  return booleanPointInPolygon(point([lng, lat]), ut as GeoJSON.Feature);
}

const puntos = {
  "San Diego Churubusco": { lat: 19.355727, lng: -99.1490005 },
  "Ermita Churubusco": { lat: 19.357886, lng: -99.1230161 },
};

console.log("Punto en UT:");
for (const clave of ["03-100", "03-094", "03-012", "03-150"]) {
  console.log(`\n${clave}:`);
  for (const [nombre, p] of Object.entries(puntos)) {
    console.log(`  ${nombre}: ${puntoEnUt(clave, p.lat, p.lng) ? "sí" : "no"}`);
  }
}

console.log("\nSección 742 overlap UT:");
for (const clave of ["03-100", "03-094", "03-012"]) {
  const f = fraccionSeccionEnUt("742", clave);
  console.log(`  ${clave}: ${f != null ? (f * 100).toFixed(1) + "%" : "n/a"}`);
}

const ptPrado = point([-99.1230161, 19.357886]);
console.log("\nPrado/Ermita coords in 03-094:", booleanPointInPolygon(ptPrado, utFeature("03-094") as GeoJSON.Feature) ? "sí" : "no");

console.log("\nBuscar UT que contiene Ermita (19.357886, -99.1230161):");
const ptErmita = point([-99.1230161, 19.357886]);
for (const f of raw.features) {
  if (Number(f.properties.cve_demarc) !== 3 || !f.geometry) continue;
  const feat = { type: "Feature" as const, properties: {}, geometry: f.geometry };
  try {
    if (booleanPointInPolygon(ptErmita, feat as GeoJSON.Feature)) {
      console.log(" ", f.properties.cve_ut, f.properties.nombre);
    }
  } catch {
    /* ignore invalid rings */
  }
}

async function main() {
  const datos = await cargarDatosColoniasSeccion();
  const cols742 = [...(datos.mapa.get("742") ?? [])];
  console.log("\n742 colonias catálogo:", cols742);

  let dup = 0;
  for (const [sec, set] of datos.mapa) {
    const cols = [...set];
    if (cols.length < 2) continue;
    const uts = new Set<string>();
    for (const c of cols) {
      for (const enlace of datos.enlacesColoniaUt.filter((e) => e.coloniaNombre === c)) {
        if (datos.uts.find((u) => u.clave === enlace.utClave)?.seccionesElectorales.includes(sec)) {
          uts.add(enlace.utClave);
        }
      }
    }
    if (uts.size === 1 && cols.length > 1) {
      dup++;
      if (dup <= 15) console.log(`Sec ${sec}: 1 UT (${[...uts][0]}) pero colonias: ${cols.join(" | ")}`);
    }
  }
  console.log(`\nTotal secciones con 1 UT y 2+ colonias: ${dup}`);
}

main();
