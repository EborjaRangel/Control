import { existsSync, readFileSync } from "fs";
import path from "path";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import bbox from "@turf/bbox";
import { point, polygon as turfPolygon } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";

import { COLONIA_PUNTOS_REFERENCIA, puntoReferenciaColonia } from "./colonias-puntos-referencia.js";
import { leerIecmUtsGeoJson } from "./iecm-uts-geojson.js";

const CVE_DEMARC_COYOACAN = 3;
/** Resolución de muestreo dentro del polígono de la sección (n×n). */
const GRID_RESOLUTION = 64;

type GeoFeature = Feature<Polygon | MultiPolygon>;

let utsGeoIndex: Map<string, GeoFeature> | null = null;
const seccionGeoCache = new Map<string, GeoFeature | null>();
const pesosUtCache = new Map<string, Map<string, number>>();
const pesosColoniaUtCache = new Map<string, Map<string, number>>();

function seccionPath(seccion: string): string {
  return path.join(process.cwd(), "data/geo/secciones", `${seccion}.geojson`);
}

function cargarIndiceUts(): Map<string, GeoFeature> {
  if (utsGeoIndex) return utsGeoIndex;

  const mapa = new Map<string, GeoFeature>();
  const parsed = leerIecmUtsGeoJson();
  if (!parsed) {
    utsGeoIndex = mapa;
    return mapa;
  }

  const raw = parsed as {
    features: {
      properties: { cve_ut: string; cve_demarc: number };
      geometry: Polygon | MultiPolygon | null;
    }[];
  };

  for (const feature of raw.features) {
    if (Number(feature.properties.cve_demarc) !== CVE_DEMARC_COYOACAN) continue;
    if (!feature.geometry) continue;
    mapa.set(feature.properties.cve_ut, {
      type: "Feature",
      properties: {},
      geometry: feature.geometry,
    });
  }

  utsGeoIndex = mapa;
  return mapa;
}

function cargarSeccion(seccion: string): GeoFeature | null {
  if (seccionGeoCache.has(seccion)) return seccionGeoCache.get(seccion) ?? null;

  const file = seccionPath(seccion);
  if (!existsSync(file)) {
    seccionGeoCache.set(seccion, null);
    return null;
  }

  const feature = JSON.parse(readFileSync(file, "utf8")) as GeoFeature;
  seccionGeoCache.set(seccion, feature);
  return feature;
}

function puntoEnFeature(lng: number, lat: number, feature: GeoFeature): boolean {
  const pt = point([lng, lat]);
  if (feature.geometry.type === "Polygon") {
    return booleanPointInPolygon(pt, feature as Feature<Polygon>);
  }
  for (const poly of feature.geometry.coordinates) {
    if (booleanPointInPolygon(pt, turfPolygon(poly))) return true;
  }
  return false;
}

/**
 * Fracción del área de la sección que cae dentro de la UT (muestreo IECM).
 * Valor 0–1; la suma entre UTs que comparten la sección suele ser ≈1.
 */
export function fraccionSeccionEnUt(seccion: string, utClave: string): number | null {
  const sec = cargarSeccion(seccion);
  const ut = cargarIndiceUts().get(utClave);
  if (!sec || !ut) return null;

  const box = bbox(sec);
  const [minLng, minLat, maxLng, maxLat] = box;
  let enSeccion = 0;
  let enAmbos = 0;

  for (let i = 0; i <= GRID_RESOLUTION; i += 1) {
    for (let j = 0; j <= GRID_RESOLUTION; j += 1) {
      const lng = minLng + ((maxLng - minLng) * i) / GRID_RESOLUTION;
      const lat = minLat + ((maxLat - minLat) * j) / GRID_RESOLUTION;
      if (!puntoEnFeature(lng, lat, sec)) continue;
      enSeccion += 1;
      if (puntoEnFeature(lng, lat, ut)) enAmbos += 1;
    }
  }

  if (enSeccion === 0) return null;
  return enAmbos / enSeccion;
}

/**
 * Pesos normalizados (suma 1) de cada UT sobre la sección, según superposición geográfica IECM.
 */
export function pesosUtSuperposicionGeo(seccion: string, utClaves: string[]): Map<string, number> {
  const cacheKey = `${seccion}:${[...utClaves].sort().join(",")}`;
  const cached = pesosUtCache.get(cacheKey);
  if (cached) return cached;

  const raw = new Map<string, number>();
  for (const clave of utClaves) {
    const f = fraccionSeccionEnUt(seccion, clave);
    if (f != null && f > 0) raw.set(clave, f);
  }

  const suma = [...raw.values()].reduce((a, b) => a + b, 0);
  const result = new Map<string, number>();

  if (suma > 0) {
    for (const [clave, val] of raw) {
      result.set(clave, val / suma);
    }
  }

  pesosUtCache.set(cacheKey, result);
  return result;
}

function distanciaCuadrada(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const dLng = lng1 - lng2;
  const dLat = lat1 - lat2;
  return dLng * dLng + dLat * dLat;
}

function coloniaMasCercana(
  lng: number,
  lat: number,
  colonias: string[],
): string | null {
  let mejor: string | null = null;
  let minDist = Infinity;

  for (const colonia of colonias) {
    const ref = puntoReferenciaColonia(colonia);
    if (!ref) continue;
    const d = distanciaCuadrada(lng, lat, ref.lng, ref.lat);
    if (d < minDist) {
      minDist = d;
      mejor = colonia;
    }
  }

  return mejor;
}

/**
 * Reparto dentro de una UT cuando varias colonias comparten la misma clave IECM.
 * Muestrea sección ∩ UT y asigna cada punto al barrio de referencia más cercano.
 * Pesos normalizados (suma 1) entre las colonias con punto definido.
 */
export function pesosColoniasCompartenUt(
  seccion: string,
  utClave: string,
  colonias: string[],
): Map<string, number> | null {
  const conPunto = colonias.filter((c) => COLONIA_PUNTOS_REFERENCIA[c]);
  if (conPunto.length < 2) return null;

  const cacheKey = `${seccion}:${utClave}:${[...conPunto].sort().join("|")}`;
  const cached = pesosColoniaUtCache.get(cacheKey);
  if (cached) return cached;

  const sec = cargarSeccion(seccion);
  const ut = cargarIndiceUts().get(utClave);
  if (!sec || !ut) return null;

  const counts = new Map<string, number>();
  for (const colonia of conPunto) counts.set(colonia, 0);

  const box = bbox(sec);
  const [minLng, minLat, maxLng, maxLat] = box;
  let total = 0;

  for (let i = 0; i <= GRID_RESOLUTION; i += 1) {
    for (let j = 0; j <= GRID_RESOLUTION; j += 1) {
      const lng = minLng + ((maxLng - minLng) * i) / GRID_RESOLUTION;
      const lat = minLat + ((maxLat - minLat) * j) / GRID_RESOLUTION;
      if (!puntoEnFeature(lng, lat, sec) || !puntoEnFeature(lng, lat, ut)) continue;
      const colonia = coloniaMasCercana(lng, lat, conPunto);
      if (!colonia) continue;
      counts.set(colonia, (counts.get(colonia) ?? 0) + 1);
      total += 1;
    }
  }

  if (total === 0) return null;

  const result = new Map<string, number>();
  for (const [colonia, n] of counts) {
    if (n > 0) result.set(colonia, n / total);
  }

  if (result.size >= 2) {
    pesosColoniaUtCache.set(cacheKey, result);
    return result;
  }

  return null;
}

export function geometriaSeccionDisponible(seccion: string): boolean {
  return cargarSeccion(seccion) != null;
}

export function resetCachePesosGeoSeccion(): void {
  pesosUtCache.clear();
  pesosColoniaUtCache.clear();
  seccionGeoCache.clear();
}
