"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import { apiFetch } from "@/lib/api";
import type { CoberturaSeccionesResponse } from "@/lib/mapa-secciones";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import { theme } from "@/lib/theme";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const MAPBOX_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? "mapbox://styles/mapbox/light-v11";

type LngLatBoundsLike = [[number, number], [number, number]];

function boundsFromGeometry(geometry: Geometry | null | undefined): LngLatBoundsLike | null {
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

function boundsFromCollection(collection: FeatureCollection): LngLatBoundsLike | null {
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

function enrichGeoJson(
  geojson: FeatureCollection,
  cobertura: CoberturaSeccionesResponse,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: geojson.features.map((feature) => {
      const seccion = String(feature.properties?.seccion ?? "");
      const info = cobertura.porSeccion[seccion];
      return {
        ...feature,
        properties: {
          ...feature.properties,
          asignada: info?.asignada ? 1 : 0,
          nombres: info?.nombres ?? "",
          colonias: info?.colonias ?? "",
          cantidad: info?.cantidad ?? 0,
        },
      };
    }),
  };
}

type TooltipState = {
  x: number;
  y: number;
  seccion: string;
  colonias: string;
  nombres: string;
  asignada: boolean;
};

export function MapaCoberturaSecciones() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cobertura, setCobertura] = useState<CoberturaSeccionesResponse | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    let cancelled = false;

    Promise.all([
      apiFetch("/api/secciones/coyoacan/geojson", { signal: controller.signal }).then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "No se pudieron cargar las secciones");
        }
        return (await res.json()) as FeatureCollection;
      }),
      apiFetch("/api/secciones/coyoacan/cobertura", { signal: controller.signal }).then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "No se pudo cargar la cobertura");
        }
        return (await res.json()) as CoberturaSeccionesResponse;
      }),
      apiFetch("/api/secciones/coyoacan/alcaldia", { signal: controller.signal }).then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as FeatureCollection;
      }),
    ])
      .then(([geojson, cov, alcaldia]) => {
        if (controller.signal.aborted || cancelled) return;
        setCobertura(cov);
        void initMap(geojson, cov, alcaldia);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error al cargar el mapa");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    async function initMap(
      geojson: FeatureCollection,
      cov: CoberturaSeccionesResponse,
      alcaldia: FeatureCollection | null,
    ) {
      if (!MAPBOX_TOKEN || !containerRef.current || cancelled) return;

      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");

      if (cancelled) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;
      const enriched = enrichGeoJson(geojson, cov);

      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: [-99.162, 19.346],
        zoom: 11,
        attributionControl: true,
      });

      const map = mapRef.current;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      const paint = () => {
        for (const id of ["secciones-line", "secciones-fill", "alcaldia-line", "alcaldia-fill"]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        for (const id of ["secciones", "alcaldia"]) {
          if (map.getSource(id)) map.removeSource(id);
        }

        if (alcaldia?.features.length) {
          map.addSource("alcaldia", { type: "geojson", data: alcaldia });
          map.addLayer({
            id: "alcaldia-fill",
            type: "fill",
            source: "alcaldia",
            paint: {
              "fill-color": theme.map.alcaldiaFill,
              "fill-opacity": 0.15,
            },
          });
          map.addLayer({
            id: "alcaldia-line",
            type: "line",
            source: "alcaldia",
            paint: { "line-color": theme.map.alcaldiaLine, "line-width": 2 },
          });
        }

        map.addSource("secciones", { type: "geojson", data: enriched });
        map.addLayer({
          id: "secciones-fill",
          type: "fill",
          source: "secciones",
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "asignada"], 1],
              theme.pin,
              "#ffffff",
            ],
            "fill-opacity": ["case", ["==", ["get", "asignada"], 1], 0.55, 0.92],
          },
        });
        map.addLayer({
          id: "secciones-line",
          type: "line",
          source: "secciones",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "asignada"], 1],
              theme.pinDark,
              "#d4d4d4",
            ],
            "line-width": ["case", ["==", ["get", "asignada"], 1], 1.2, 0.8],
            "line-opacity": 0.9,
          },
        });

        map.on("mousemove", "secciones-fill", (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const seccion = String(feature.properties?.seccion ?? "");
          const nombres = String(feature.properties?.nombres ?? "");
          const colonias = String(feature.properties?.colonias ?? "");
          const asignada = feature.properties?.asignada === 1;
          map.getCanvas().style.cursor = "pointer";
          setTooltip({
            x: event.point.x,
            y: event.point.y,
            seccion,
            colonias,
            nombres,
            asignada,
          });
        });

        map.on("mouseleave", "secciones-fill", () => {
          map.getCanvas().style.cursor = "";
          setTooltip(null);
        });

        const bounds = boundsFromCollection(geojson);
        if (bounds) {
          map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 13 });
        }
      };

      if (map.isStyleLoaded()) paint();
      else map.once("load", paint);
    }

    return () => {
      cancelled = true;
      controller.abort();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="alert-error">
        Configura <code className="text-xs">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> en{" "}
        <code className="text-xs">front/.env.local</code> para mostrar el mapa.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cobertura ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="badge-pin">
            {cobertura.resumen.asignadas} secciones asignadas
          </span>
          <span className="rounded-full border border-line bg-surface px-3 py-1 text-ink-secondary">
            {cobertura.resumen.sinAsignar} sin asignar
          </span>
          <span className="rounded-full border border-line bg-surface px-3 py-1 text-ink-secondary">
            {cobertura.resumen.totalDirigentes} dirigentes activos con sección
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-secondary">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block size-4 rounded border border-[#003366]"
            style={{ backgroundColor: theme.pin, opacity: 0.7 }}
          />
          Sección con dirigente asignado
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-4 rounded border border-[#d4d4d4] bg-white" />
          Sección sin asignar
        </span>
      </div>

      <div className="relative overflow-hidden rounded-pin-lg border border-line bg-surface shadow-pin">
        <div ref={containerRef} className="h-[min(70vh,640px)] w-full min-h-[360px]" />
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 text-sm text-ink-secondary">
            Cargando mapa de Coyoacán…
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-x-0 bottom-0 z-10 m-3">
            <div className="alert-error">{error}</div>
          </div>
        ) : null}
        {tooltip ? (
          <div
            ref={tooltipRef}
            className="pointer-events-none absolute z-20 max-w-xs rounded-pin border border-line bg-surface px-3 py-2 text-sm shadow-pin"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y + 12,
            }}
          >
            <p className="font-semibold text-ink">{etiquetaSeccion(tooltip.seccion)}</p>
            {tooltip.colonias ? (
              <p className="mt-1 text-ink-secondary">
                <span className="font-medium text-ink">Colonia:</span> {tooltip.colonias}
              </p>
            ) : null}
            {tooltip.asignada ? (
              <p className="mt-1 text-ink-secondary">{tooltip.nombres}</p>
            ) : (
              <p className="mt-1 text-ink-secondary">Sin dirigente asignado</p>
            )}
          </div>
        ) : null}
      </div>

      <p className="text-xs text-ink-secondary">
        Pasa el cursor sobre una sección para ver la colonia, el o los dirigentes asignados. Solo se
        muestran dirigentes activos (estatus ALTA) con sección electoral registrada.
      </p>
    </div>
  );
}
