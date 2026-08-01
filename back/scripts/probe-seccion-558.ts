import { readFileSync } from "fs";
import path from "path";
import { fraccionSeccionEnUt, geometriaSeccionDisponible, pesosColoniasCompartenUt } from "../src/lib/colonias-seccion-geo.js";

const raw = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "../data/geo/raw/iecm-uts.json"), "utf8"),
) as {
  features: {
    properties: { cve_ut: string; nombre: string; cve_demarc: number; secciones?: string };
  }[];
};

console.log("=== UTs San Francisco Culhuacán ===");
for (const f of raw.features) {
  if (Number(f.properties.cve_demarc) !== 3) continue;
  const n = f.properties.nombre.toUpperCase();
  if (n.includes("SAN FRANCISCO") || n.includes("CULHUAC") || n.includes("MAGDALENA")) {
    console.log(f.properties.cve_ut, f.properties.nombre, f.properties.latitud, f.properties.longitud);
  }
}

for (const seccion of ["558", "559", "557", "560"]) {
  console.log(`\n=== Sección ${seccion} ===`);
  console.log("Geo INE:", geometriaSeccionDisponible(seccion) ? "sí" : "no");
  for (const clave of ["03-101", "03-066"]) {
    const f = fraccionSeccionEnUt(seccion, clave);
    console.log(`Overlap ${clave}:`, f != null ? `${(f * 100).toFixed(1)}%` : "n/a");
  }
  const barrios = [
    "San Francisco Culhuacán Barrio de San Francisco",
    "San Francisco Culhuacán Barrio de San Juan",
    "San Francisco Culhuacán Barrio de Santa Ana",
  ];
  const pesos = pesosColoniasCompartenUt(seccion, "03-101", barrios);
  if (pesos) {
    console.log("Pesos barrio (03-101):");
    for (const b of barrios) {
      const p = pesos.get(b);
      if (p != null) console.log(`  ${b.split(" ").slice(-2).join(" ")}: ${(p * 100).toFixed(2)}%`);
    }
  }
}
