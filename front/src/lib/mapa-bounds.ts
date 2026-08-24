import type { FeatureCollection, Geometry } from "geojson";

export type LngLatBoundsLike = [[number, number], [number, number]];

export function boundsFromGeometry(geometry: Geometry | null | undefined): LngLatBoundsLike | null {
  if (!geometry) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  function extend(lng: number, lat: number) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  function walkCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      extend(coords[0], coords[1]);
      return;
    }
    for (const part of coords) walkCoords(part);
  }

  if (geometry.type === "GeometryCollection") {
    for (const part of geometry.geometries) {
      const nested = boundsFromGeometry(part);
      if (!nested) continue;
      extend(nested[0][0], nested[0][1]);
      extend(nested[1][0], nested[1][1]);
    }
  } else {
    walkCoords((geometry as { coordinates: unknown }).coordinates);
  }

  if (!Number.isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function boundsFromCollection(collection: FeatureCollection): LngLatBoundsLike | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const feature of collection.features) {
    const bounds = boundsFromGeometry(feature.geometry);
    if (!bounds) continue;
    minLng = Math.min(minLng, bounds[0][0]);
    minLat = Math.min(minLat, bounds[0][1]);
    maxLng = Math.max(maxLng, bounds[1][0]);
    maxLat = Math.max(maxLat, bounds[1][1]);
  }

  if (!Number.isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
