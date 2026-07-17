"use client";

import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { apiFetch } from "@/lib/api";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import { theme } from "@/lib/theme";

function esCentroValido(centro: { lat: number; lng: number }) {
  return (
    Number.isFinite(centro.lat) &&
    Number.isFinite(centro.lng) &&
    centro.lat >= -90 &&
    centro.lat <= 90 &&
    centro.lng >= -180 &&
    centro.lng <= 180
  );
}

const CENTRO_COYOACAN = { lat: 19.346, lng: -99.162 };
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const MAPBOX_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? "mapbox://styles/mapbox/light-v11";

type MapaResponse = {
  seccion: string;
  distritoLocal: number | null;
  centro: { lat: number; lng: number };
  fuenteCentro: string;
  fuenteGeometria: "ine-oficial" | "aproximada";
  colonia: string | null;
  geometria: Feature;
  alcaldia: FeatureCollection;
  nota: string;
};

type Props = {
  seccion: string;
  colonia?: string;
};

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

export function SeccionElectoralMap({ seccion, colonia }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markerRef = useRef<import("mapbox-gl").Marker | null>(null);
  const clickHandlerRef = useRef<((event: import("mapbox-gl").MapLayerMouseEvent) => void) | null>(
    null,
  );
  const enterHandlerRef = useRef<(() => void) | null>(null);
  const leaveHandlerRef = useRef<(() => void) | null>(null);
  const [todasSecciones, setTodasSecciones] = useState<FeatureCollection | null>(null);
  const [data, setData] = useState<MapaResponse | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingMapa, setLoadingMapa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingGeo(true);

    apiFetch("/api/secciones/coyoacan/geojson", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as FeatureCollection;
      })
      .then(setTodasSecciones)
      .catch(() => {
        if (!controller.signal.aborted) setTodasSecciones(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingGeo(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!seccion) {
      setData(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoadingMapa(true);
    setError(null);

    const params = new URLSearchParams();
    if (colonia) params.set("colonia", colonia);

    apiFetch(`/api/secciones/${encodeURIComponent(seccion)}/mapa?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "No se pudo cargar el mapa");
        }
        return (await res.json()) as MapaResponse;
      })
      .then(setData)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error al cargar el mapa");
        setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMapa(false);
      });

    return () => controller.abort();
  }, [seccion, colonia]);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !data || !seccion) return;

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    async function renderMap() {
      const mapa = data;
      if (!mapa) return;

      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");

      if (cancelled) return;

      const mapContainer = containerRef.current;
      if (!mapContainer || !(mapContainer instanceof HTMLElement)) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const centro = esCentroValido(mapa.centro) ? mapa.centro : CENTRO_COYOACAN;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current?.remove();
        markerRef.current = null;
      }

      mapRef.current = new mapboxgl.Map({
        container: mapContainer,
        style: MAPBOX_STYLE,
        center: [centro.lng, centro.lat],
        zoom: 13,
        scrollZoom: false,
        attributionControl: true,
      });
      mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      const map = mapRef.current;
      const seccionActiva = mapa.seccion;
      const filtroOtras: import("mapbox-gl").FilterSpecification = [
        "!=",
        ["get", "seccion"],
        seccionActiva,
      ];

      const paintLayers = () => {
        for (const id of [
          "seccion-activa-line",
          "seccion-activa-fill",
          "secciones-line",
          "secciones-fill",
          "alcaldia-line",
          "alcaldia-fill",
        ]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        for (const id of ["seccion-activa", "secciones", "alcaldia"]) {
          if (map.getSource(id)) map.removeSource(id);
        }

        map.addSource("alcaldia", { type: "geojson", data: mapa.alcaldia });
        map.addLayer({
          id: "alcaldia-fill",
          type: "fill",
          source: "alcaldia",
          paint: {
            "fill-color": theme.map.alcaldiaFill,
            "fill-opacity": theme.map.alcaldiaFillOpacity,
          },
        });
        map.addLayer({
          id: "alcaldia-line",
          type: "line",
          source: "alcaldia",
          paint: { "line-color": theme.map.alcaldiaLine, "line-width": 2 },
        });

        if (todasSecciones?.features.length) {
          map.addSource("secciones", { type: "geojson", data: todasSecciones });
          map.addLayer({
            id: "secciones-fill",
            type: "fill",
            source: "secciones",
            filter: filtroOtras,
            paint: {
              "fill-color": theme.map.seccionFill,
              "fill-opacity": theme.map.seccionFillOpacity,
            },
          });
          map.addLayer({
            id: "secciones-line",
            type: "line",
            source: "secciones",
            filter: filtroOtras,
            paint: {
              "line-color": theme.map.seccionLine,
              "line-width": 0.6,
              "line-opacity": theme.map.seccionLineOpacity,
            },
          });
        }

        map.addSource("seccion-activa", { type: "geojson", data: mapa.geometria });
        map.addLayer({
          id: "seccion-activa-fill",
          type: "fill",
          source: "seccion-activa",
          paint: {
            "fill-color": theme.pin,
            "fill-opacity": mapa.fuenteGeometria === "ine-oficial" ? 0.35 : 0.25,
          },
        });
        map.addLayer({
          id: "seccion-activa-line",
          type: "line",
          source: "seccion-activa",
          paint: { "line-color": theme.pin, "line-width": 3 },
        });

        if (clickHandlerRef.current) {
          map.off("click", "seccion-activa-fill", clickHandlerRef.current);
        }
        if (enterHandlerRef.current) {
          map.off("mouseenter", "seccion-activa-fill", enterHandlerRef.current);
        }
        if (leaveHandlerRef.current) {
          map.off("mouseleave", "seccion-activa-fill", leaveHandlerRef.current);
        }

        const onClick = (event: import("mapbox-gl").MapLayerMouseEvent) => {
          const html = [
            `<strong>${etiquetaSeccion(mapa.seccion)}</strong>`,
            mapa.fuenteGeometria === "ine-oficial" ? "Polígono oficial" : "Área aproximada",
            mapa.distritoLocal ? `Distrito local ${mapa.distritoLocal}` : "",
            mapa.colonia ?? "",
          ]
            .filter(Boolean)
            .join("<br/>");

          new mapboxgl.Popup({ closeButton: true, maxWidth: "260px" })
            .setLngLat(event.lngLat)
            .setHTML(html)
            .addTo(map);
        };

        const onEnter = () => {
          map.getCanvas().style.cursor = "pointer";
        };
        const onLeave = () => {
          map.getCanvas().style.cursor = "";
        };

        clickHandlerRef.current = onClick;
        enterHandlerRef.current = onEnter;
        leaveHandlerRef.current = onLeave;

        map.on("click", "seccion-activa-fill", onClick);
        map.on("mouseenter", "seccion-activa-fill", onEnter);
        map.on("mouseleave", "seccion-activa-fill", onLeave);

        markerRef.current?.remove();
        const label = document.createElement("div");
        label.className = "seccion-map-marker";
        label.textContent = etiquetaSeccion(mapa.seccion);
        markerRef.current = new mapboxgl.Marker({ element: label, anchor: "bottom" })
          .setLngLat([centro.lng, centro.lat])
          .addTo(map);

        const bounds = boundsFromGeometry(mapa.geometria.geometry);
        if (bounds) {
          map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 600 });
        }
      };

      if (map.isStyleLoaded()) paintLayers();
      else map.once("load", paintLayers);
    }

    void renderMap();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [data, todasSecciones, seccion]);

  const loading = loadingGeo || loadingMapa;

  if (!seccion) {
    return (
      <div className="panel-soft flex min-h-[220px] items-center justify-center text-sm text-ink-secondary sm:min-h-[280px]">
        Selecciona una sección electoral para ver su ubicación en el mapa.
      </div>
    );
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-ink">Mapa de la sección electoral</h3>
        <div className="alert-error">
          Configura <code className="text-xs">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> en{" "}
          <code className="text-xs">front/.env.local</code> para mostrar el mapa con Mapbox.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">Mapa de la sección electoral</h3>
        <div className="flex flex-wrap gap-2">
          {data?.fuenteGeometria === "ine-oficial" ? (
            <span className="badge-pin">Polígono oficial</span>
          ) : null}
          {data?.distritoLocal ? (
            <span className="badge-pin">Distrito local {data.distritoLocal}</span>
          ) : null}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-pin-lg border border-line bg-surface shadow-pin">
        <div
          ref={containerRef}
          className="h-[220px] w-full min-h-[200px] touch-pan-x touch-pan-y sm:h-[320px] lg:h-[360px]"
          aria-hidden={Boolean(error)}
        />
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 text-sm text-ink-secondary">
            Cargando mapa…
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-x-0 bottom-0 z-10 m-3">
            <div className="alert-error">{error}</div>
          </div>
        ) : null}
      </div>

      {data ? (
        <p className="text-xs leading-relaxed text-ink-secondary">{data.nota}</p>
      ) : null}
    </div>
  );
}
