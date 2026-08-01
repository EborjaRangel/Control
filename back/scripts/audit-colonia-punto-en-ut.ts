import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { COLONIAS_COYOACAN } from "../src/lib/colonias.js";
import { COLONIA_UT_CLAVES } from "../src/lib/colonia-ut-claves.js";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import { readFileSync } from "fs";
import path from "path";

const raw = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "../data/geo/raw/iecm-uts.json"), "utf8"),
) as {
  features: {
    properties: { cve_ut: string; cve_demarc: number };
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  }[];
};

function utGeom(clave: string) {
  const f = raw.features.find(
    (x) => x.properties.cve_ut === clave && Number(x.properties.cve_demarc) === 3,
  );
  if (!f?.geometry) return null;
  return { type: "Feature" as const, properties: {}, geometry: f.geometry };
}

function coloniaEnUt(colonia: string, utClave: string): boolean {
  const c = COLONIAS_COYOACAN.find((x) => x.nombre === colonia);
  const g = utGeom(utClave);
  if (!c || !g) return false;
  return booleanPointInPolygon(point([c.lng, c.lat]), g as GeoJSON.Feature);
}

async function main() {
  for (const colonia of ["Ermita Churubusco", "San Diego Churubusco"]) {
    console.log(colonia, "->", COLONIA_UT_CLAVES[colonia], "en UT:", coloniaEnUt(colonia, "03-100"));
  }

  const uts = await prisma.unidadTerritorial.findMany();
  let mismatches = 0;
  for (const [colonia, claves] of Object.entries(COLONIA_UT_CLAVES)) {
    const c = COLONIAS_COYOACAN.find((x) => x.nombre === colonia);
    if (!c) continue;
    for (const clave of claves) {
      if (!coloniaEnUt(colonia, clave)) {
        mismatches++;
        if (mismatches <= 20) {
          console.log(`Fuera de UT: ${colonia} -> ${clave} (catálogo ${c.lat}, ${c.lng})`);
        }
      }
    }
  }
  console.log("Enlaces colonia-UT donde el punto SEPOMEX no cae en el polígono UT:", mismatches);
  await prisma.$disconnect();
}

main();
