/**
 * Importa polígonos oficiales de secciones electorales del INE (cob_2024)
 * y genera GeoJSON filtrado para la alcaldía Coyoacán (CDMX).
 *
 * Fuente: https://pautas.ine.mx/transparencia/mapas/cob_2024/SECCION.zip
 *
 * Uso: npm run geo:import-secciones -w control-back
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import AdmZip from "adm-zip";
import * as shapefile from "shapefile";
import { SECCIONES_ELECTORALES_COYOACAN } from "../src/lib/secciones-electorales.js";
import { reproyectarFeature } from "../src/lib/geo-reproject.js";

const rootDir = path.join(import.meta.dirname, "..");
const rawDir = path.join(rootDir, "data/geo/raw");
const outDir = path.join(rootDir, "data/geo");
const seccionesDir = path.join(outDir, "secciones");
const zipPath = path.join(rawDir, "SECCION.zip");
const shpPath = path.join(rawDir, "SECCION/SECCION/SECCION.shp");
const INE_ZIP_URL = "https://pautas.ine.mx/transparencia/mapas/cob_2024/SECCION.zip";

const CVE_ENT = "09";
const CVE_MUN = "003";
const seccionesValidas = new Set(SECCIONES_ELECTORALES_COYOACAN);

function pad2(value: unknown) {
  return String(Number(String(value).trim())).padStart(2, "0");
}

function pad3(value: unknown) {
  return String(Number(String(value).trim())).padStart(3, "0");
}

function normalizarSeccion(value: unknown) {
  if (value == null || value === "") return "";
  return String(Number(String(value).trim()));
}

function esCoyoacan(props: Record<string, unknown>) {
  const ent = props.ENTIDAD ?? props.CVE_ENT ?? props.entidad ?? props.cve_ent;
  const mun = props.MUNICIPIO ?? props.CVE_MUN ?? props.municipio ?? props.cve_mun;
  const seccion = normalizarSeccion(props.SECCION ?? props.seccion ?? props.CVE_SECC);

  if (pad2(ent) !== CVE_ENT || pad3(mun) !== CVE_MUN) return false;
  return seccionesValidas.has(seccion);
}

function propiedadesLimpias(props: Record<string, unknown>, seccion: string) {
  return {
    seccion,
    entidad: CVE_ENT,
    municipio: CVE_MUN,
    municipioNombre: "Coyoacán",
    distritoFederal: props.DISTRITO_F ?? props.DISTRITO ?? null,
    distritoLocal: props.DISTRITO_L ?? null,
    fuente: "INE",
    vigencia: "2024",
    urlFuente: INE_ZIP_URL,
  };
}

async function ensureShapefile() {
  mkdirSync(rawDir, { recursive: true });

  if (!existsSync(zipPath)) {
    console.log("Descargando SECCION.zip del INE (~100 MB)…");
    const res = await fetch(INE_ZIP_URL);
    if (!res.ok) throw new Error(`Descarga fallida: ${res.status}`);
    if (!res.body) throw new Error("Respuesta vacía al descargar SECCION.zip");
    await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(zipPath));
  }

  if (!existsSync(shpPath)) {
    console.log("Extrayendo shapefile…");
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(path.join(rawDir, "SECCION"), true);
  }

  if (!existsSync(shpPath)) {
    throw new Error(`No se encontró ${shpPath}`);
  }
}

async function main() {
  await ensureShapefile();

  console.log("Leyendo shapefile INE SECCION…");
  const source = await shapefile.open(shpPath);
  const features: GeoJSON.Feature[] = [];
  const porSeccion = new Map<string, GeoJSON.Feature>();
  let muestraProps: Record<string, unknown> | null = null;
  let total = 0;

  while (true) {
    const result = await source.read();
    if (result.done) break;
    total++;
    const feature = result.value;
    if (!feature) continue;
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    if (!muestraProps && Object.keys(props).length) muestraProps = props;
    if (!esCoyoacan(props)) continue;

    const seccion = normalizarSeccion(props.SECCION ?? props.seccion ?? props.CVE_SECC);
    if (!seccion || porSeccion.has(seccion)) continue;

    const limpio = reproyectarFeature({
      type: "Feature",
      properties: propiedadesLimpias(props, seccion),
      geometry: feature.geometry as GeoJSON.Geometry,
    });
    features.push(limpio);
    porSeccion.set(seccion, limpio);
  }

  console.log(`Registros totales en shapefile: ${total}`);
  if (muestraProps) console.log("Campos de ejemplo:", Object.keys(muestraProps).join(", "));
  console.log(`Secciones Coyoacán en INE: ${features.length}`);
  console.log(`Secciones esperadas en catálogo: ${seccionesValidas.size}`);

  const faltantes = [...seccionesValidas].filter((s) => !porSeccion.has(s));
  if (faltantes.length) {
    console.warn("Secciones en catálogo sin polígono INE:", faltantes.join(", "));
  }

  features.sort(
    (a, b) =>
      Number((a.properties as { seccion: string }).seccion) -
      Number((b.properties as { seccion: string }).seccion),
  );

  const collection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  mkdirSync(seccionesDir, { recursive: true });
  const outFile = path.join(outDir, "coyoacan-secciones.geojson");
  writeFileSync(
    outFile,
    JSON.stringify({
      ...collection,
      name: "secciones-electorales-coyoacan-ine-2024",
      metadata: {
        fuente: "Instituto Nacional Electoral (INE)",
        dataset: "cob_2024/SECCION",
        url: INE_ZIP_URL,
        entidad: "09 Ciudad de México",
        alcaldia: "003 Coyoacán",
        totalSecciones: features.length,
        generadoEn: new Date().toISOString(),
      },
    }),
  );
  console.log(`Escrito ${outFile}`);

  for (const feature of features) {
    const id = (feature.properties as { seccion: string }).seccion;
    writeFileSync(path.join(seccionesDir, `${id}.geojson`), JSON.stringify(feature));
  }

  writeFileSync(
    path.join(outDir, "coyoacan-secciones.manifest.json"),
    JSON.stringify(
      {
        fuente: INE_ZIP_URL,
        total: features.length,
        secciones: features.map((f) => (f.properties as { seccion: string }).seccion),
        faltantes,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
