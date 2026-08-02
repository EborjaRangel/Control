/**
 * Importa unidades territoriales de Coyoacán desde el catálogo IECM 2025.
 *
 * Fuente: https://geoutcdmx.iecm.mx/api-proxy.php?endpoint=geometries/participacion_uts
 * Acuerdo: IECM/ACU-CG-100/2025
 *
 * Uso: npm run geo:import-uts -w control-back
 */

import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { COLONIAS_COYOACAN } from "../src/lib/colonias.js";
import { utsParaColonia } from "../src/lib/unidades-territoriales-match.js";
import { parseSeccionesIecm } from "../src/lib/secciones-iecm.js";
import { prisma } from "../src/lib/prisma.js";
import { ensureIecmUtsGeoJson } from "../src/lib/iecm-uts-geojson.js";

const rootDir = path.join(import.meta.dirname, "..");
const CVE_DEMARC_COYOACAN = 3;

type Feature = {
  properties: {
    cve_ut: string;
    nombre: string;
    tipo_ut?: string;
    cve_demarc: number;
    dtto_loc?: number;
    latitud?: number;
    longitud?: number;
    secciones?: string;
    secciones1?: string;
  };
};

type GeoJson = { features: Feature[] };

async function ensureGeoJson(): Promise<GeoJson> {
  const jsonPath = await ensureIecmUtsGeoJson(rootDir);
  return JSON.parse(readFileSync(jsonPath, "utf8")) as GeoJson;
}

async function main() {
  const geojson = await ensureGeoJson();
  const coyoacan = geojson.features
    .filter((f) => parseInt(String(f.properties.cve_demarc), 10) === CVE_DEMARC_COYOACAN)
    .map((f) => ({
      clave: f.properties.cve_ut,
      nombre: f.properties.nombre.replace(/\s+UT$/i, "").trim(),
      tipoUt: f.properties.tipo_ut ?? null,
      distritoLocal: f.properties.dtto_loc ?? null,
      lat: f.properties.latitud ?? null,
      lng: f.properties.longitud ?? null,
      seccionesElectorales: parseSeccionesIecm(
        f.properties.secciones,
        f.properties.secciones1,
      ),
    }));

  console.log(`UT en Coyoacán (IECM): ${coyoacan.length}`);

  await prisma.$transaction(async (tx) => {
    await tx.coloniaUnidadTerritorial.deleteMany();
    await tx.unidadTerritorial.deleteMany();

    for (const ut of coyoacan) {
      await tx.unidadTerritorial.create({ data: ut });
    }

    const utRows = await tx.unidadTerritorial.findMany({
      orderBy: [{ clave: "asc" }],
    });

    const coloniasUnicas = [...new Set(COLONIAS_COYOACAN.map((c) => c.nombre))];
    let enlaces = 0;
    let sinUt = 0;
    let multiples = 0;

    for (const coloniaNombre of coloniasUnicas) {
      const matches = utsParaColonia(coloniaNombre, utRows);
      if (matches.length === 0) {
        sinUt++;
        continue;
      }
      if (matches.length > 1) multiples++;
      for (const ut of matches) {
        await tx.coloniaUnidadTerritorial.create({
          data: { coloniaNombre, unidadTerritorialId: ut.id },
        });
        enlaces++;
      }
    }

    console.log(`Colonias SEPOMEX: ${coloniasUnicas.length}`);
    console.log(`Enlaces colonia↔UT: ${enlaces}`);
    console.log(`Colonias con varias UT: ${multiples}`);
    console.log(`Colonias sin UT emparejada: ${sinUt}`);
  });

  const santo = await prisma.coloniaUnidadTerritorial.findMany({
    where: { coloniaNombre: "Pedregal de Santo Domingo" },
    include: { unidadTerritorial: true },
    orderBy: { unidadTerritorial: { clave: "asc" } },
  });
  console.log(
    `Ejemplo Pedregal de Santo Domingo → ${santo.length} UT:`,
    santo.map((r) => r.unidadTerritorial.clave).join(", "),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
