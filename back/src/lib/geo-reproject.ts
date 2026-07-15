/**
 * Reproyección de coordenadas del marco geográfico electoral INE (Lambert Conformal Cónica)
 * a WGS84 (EPSG:4326) para uso en Mapbox / GeoJSON web.
 *
 * Fuente .prj del shapefile SECCION cob_2024.
 */

import proj4 from "proj4";

export const INE_LCC =
  "+proj=lcc +lat_1=17.5 +lat_2=29.5 +lat_0=12 +lon_0=-102 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs";
export const WGS84 = "EPSG:4326";

proj4.defs("INE_LCC", INE_LCC);

function esCoordenadaProyectada(lng: number, lat: number) {
  return Math.abs(lng) > 180 || Math.abs(lat) > 90;
}

export function reproyectarPunto(x: number, y: number): [number, number] {
  const [lng, lat] = proj4("INE_LCC", WGS84, [x, y]) as [number, number];
  return [lng, lat];
}

function reproyectarCoords(coords: unknown): unknown {
  if (!Array.isArray(coords)) return coords;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    const [x, y] = coords as [number, number];
    if (esCoordenadaProyectada(x, y)) {
      return reproyectarPunto(x, y);
    }
    return coords;
  }
  return coords.map(reproyectarCoords);
}

export function reproyectarGeometria<T extends GeoJSON.Geometry>(geometry: T): T {
  if (!geometry || geometry.type === "GeometryCollection") return geometry;
  const coords = reproyectarCoords((geometry as GeoJSON.Point | GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates);
  return { ...geometry, coordinates: coords } as T;
}

export function reproyectarFeature(feature: GeoJSON.Feature): GeoJSON.Feature {
  if (!feature.geometry) return feature;
  return {
    ...feature,
    geometry: reproyectarGeometria(feature.geometry),
  };
}

export function reproyectarCollection(
  collection: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  return {
    ...collection,
    features: collection.features.map(reproyectarFeature),
  };
}

/** Centro aproximado [lng, lat] de una geometría ya en WGS84. */
export function centroDeGeometriaWgs84(feature: GeoJSON.Feature): { lat: number; lng: number } {
  const g = feature.geometry;
  if (!g) return { lat: 19.346, lng: -99.162 };

  if (g.type === "Point") {
    const [lng, lat] = g.coordinates as [number, number];
    return { lat, lng };
  }

  if (g.type === "Polygon") {
    const ring = g.coordinates[0] as [number, number][];
    return promedioCoordenadas(ring);
  }

  if (g.type === "MultiPolygon") {
    const ring = g.coordinates[0]?.[0] as [number, number][];
    if (ring) return promedioCoordenadas(ring);
  }

  return { lat: 19.346, lng: -99.162 };
}

function promedioCoordenadas(coords: [number, number][]) {
  let lat = 0;
  let lng = 0;
  for (const [x, y] of coords) {
    lng += x;
    lat += y;
  }
  const n = coords.length || 1;
  return { lat: lat / n, lng: lng / n };
}
