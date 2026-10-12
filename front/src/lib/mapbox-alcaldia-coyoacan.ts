import type { FeatureCollection } from "geojson";
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import { apiFetch } from "@/lib/api";
import { theme } from "@/lib/theme";

export const ALCALDIA_COYOACAN_SOURCE = "alcaldia-coyoacan";
export const ALCALDIA_COYOACAN_FILL_LAYER = "alcaldia-coyoacan-fill";
export const ALCALDIA_COYOACAN_LINE_LAYER = "alcaldia-coyoacan-line";

export type AlcaldiaBoundaryPaint = {
  fillColor: string;
  fillOpacity: number;
  lineColor: string;
  lineWidth: number;
};

export const ALCALDIA_BOUNDARY_PAINT_AZUL: AlcaldiaBoundaryPaint = {
  fillColor: theme.pin,
  fillOpacity: 0.1,
  lineColor: theme.pin,
  lineWidth: 2,
};

export async function fetchAlcaldiaCoyoacanGeoJson(): Promise<FeatureCollection | null> {
  try {
    const res = await apiFetch("/api/secciones/coyoacan/alcaldia");
    if (!res.ok) return null;
    const data = (await res.json()) as FeatureCollection;
    return data?.features?.length ? data : null;
  } catch {
    return null;
  }
}

export function addAlcaldiaCoyoacanBoundary(
  map: MapboxMap,
  alcaldia: FeatureCollection,
  paint: AlcaldiaBoundaryPaint = ALCALDIA_BOUNDARY_PAINT_AZUL,
) {
  if (!alcaldia.features.length) return;

  const source = map.getSource(ALCALDIA_COYOACAN_SOURCE);
  if (source && source.type === "geojson") {
    (source as GeoJSONSource).setData(alcaldia);
  } else if (!source) {
    map.addSource(ALCALDIA_COYOACAN_SOURCE, { type: "geojson", data: alcaldia });
  }

  if (!map.getLayer(ALCALDIA_COYOACAN_FILL_LAYER)) {
    map.addLayer({
      id: ALCALDIA_COYOACAN_FILL_LAYER,
      type: "fill",
      source: ALCALDIA_COYOACAN_SOURCE,
      paint: {
        "fill-color": paint.fillColor,
        "fill-opacity": paint.fillOpacity,
      },
    });
  }

  if (!map.getLayer(ALCALDIA_COYOACAN_LINE_LAYER)) {
    map.addLayer({
      id: ALCALDIA_COYOACAN_LINE_LAYER,
      type: "line",
      source: ALCALDIA_COYOACAN_SOURCE,
      paint: {
        "line-color": paint.lineColor,
        "line-width": paint.lineWidth,
      },
    });
  }
}

export function whenMapReady(map: MapboxMap, fn: () => void) {
  if (map.isStyleLoaded()) fn();
  else map.once("load", fn);
}

export function boundsFromFeatureCollection(
  geojson: FeatureCollection,
): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  function visitCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const lng = coords[0];
      const lat = coords[1];
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
      return;
    }
    for (const part of coords) visitCoords(part);
  }

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (geom && "coordinates" in geom) visitCoords(geom.coordinates);
  }

  if (!Number.isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
