"use client";

import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection } from "geojson";
import { apiFetch } from "@/lib/api";
import { CENTRO_COYOACAN, MAPBOX_STYLE, MAPBOX_TOKEN, mapboxConfigError } from "@/lib/mapbox-config";
import { reverseGeocodeMapbox } from "@/lib/mapbox-geocode";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import { theme } from "@/lib/theme";

type MapaResponse = {
  seccion: string;
  centro: { lat: number; lng: number };
  geometria: Feature;
  alcaldia: FeatureCollection;
};

type Props = {
  seccionElectoral: string;
  colonia?: string;
  lat: number | null;
  lng: number | null;
  lugar: string;
  onChange: (value: { lat: number; lng: number; lugar: string }) => void;
  readOnly?: boolean;
};

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

export function AsambleaSeccionMapPicker({
  seccionElectoral,
  colonia,
  lat,
  lng,
  lugar,
  onChange,
  readOnly = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markerRef = useRef<import("mapbox-gl").Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [data, setData] = useState<MapaResponse | null>(null);
  const [todasSecciones, setTodasSecciones] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  onChangeRef.current = onChange;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch("/api/secciones/coyoacan/geojson", { signal: controller.signal })
        .then(async (res) => (res.ok ? ((await res.json()) as FeatureCollection) : null))
        .catch(() => null),
      (() => {
        const params = new URLSearchParams();
        if (colonia) params.set("colonia", colonia);
        return apiFetch(
          `/api/secciones/${encodeURIComponent(seccionElectoral)}/mapa?${params.toString()}`,
          { signal: controller.signal },
        )
          .then(async (res) => {
            if (!res.ok) {
              const body = (await res.json()) as { error?: string };
              throw new Error(body.error ?? "No se pudo cargar el mapa");
            }
            return (await res.json()) as MapaResponse;
          });
      })(),
    ])
      .then(([geojson, mapa]) => {
        setTodasSecciones(geojson);
        setData(mapa);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error al cargar mapa");
        setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [seccionElectoral, colonia]);

  async function actualizarPin(nuevoLng: number, nuevoLat: number, moverMapa = false) {
    if (readOnly) return;
    setGeoLoading(true);
    setGeoError(null);
    try {
      const nuevaDireccion = await reverseGeocodeMapbox(nuevoLng, nuevoLat);
      onChangeRef.current({ lat: nuevoLat, lng: nuevoLng, lugar: nuevaDireccion });
      markerRef.current?.setLngLat([nuevoLng, nuevoLat]);
      if (moverMapa) {
        mapRef.current?.flyTo({ center: [nuevoLng, nuevoLat], zoom: 16 });
      }
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : "Error al geocodificar");
    } finally {
      setGeoLoading(false);
    }
  }

  useEffect(() => {
    if (!MAPBOX_TOKEN || !data || !containerRef.current) return;

    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const centro = esCentroValido(data.centro) ? data.centro : CENTRO_COYOACAN;
      const pinLng = lng ?? centro.lng;
      const pinLat = lat ?? centro.lat;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current?.remove();
        markerRef.current = null;
      }

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: [pinLng, pinLat],
        zoom: lat != null && lng != null ? 16 : 13,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      const paintLayers = () => {
        const seccionActiva = data.seccion;
        const filtroOtras: import("mapbox-gl").FilterSpecification = [
          "!=",
          ["get", "seccion"],
          seccionActiva,
        ];

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

        map.addSource("alcaldia", { type: "geojson", data: data.alcaldia });
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

        map.addSource("seccion-activa", { type: "geojson", data: data.geometria });
        map.addLayer({
          id: "seccion-activa-fill",
          type: "fill",
          source: "seccion-activa",
          paint: { "fill-color": theme.pin, "fill-opacity": 0.25 },
        });
        map.addLayer({
          id: "seccion-activa-line",
          type: "line",
          source: "seccion-activa",
          paint: { "line-color": theme.pin, "line-width": 3 },
        });

        markerRef.current?.remove();
        const marker = new mapboxgl.Marker({ color: theme.pin, draggable: !readOnly })
          .setLngLat([pinLng, pinLat])
          .addTo(map);
        markerRef.current = marker;

        if (!readOnly) {
          marker.on("dragend", () => {
            const pos = marker.getLngLat();
            void actualizarPin(pos.lng, pos.lat, false);
          });
          map.on("click", (event) => {
            void actualizarPin(event.lngLat.lng, event.lngLat.lat, false);
          });
        }
      };

      if (map.isStyleLoaded()) paintLayers();
      else map.once("load", paintLayers);
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [data, todasSecciones, readOnly]);

  useEffect(() => {
    if (lat == null || lng == null || !markerRef.current) return;
    markerRef.current.setLngLat([lng, lat]);
  }, [lat, lng]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="alert-error">
        {mapboxConfigError() ??
          "Configura NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN para ubicar la asamblea en el mapa."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">
          Lugar en {etiquetaSeccion(seccionElectoral)}
        </h3>
        {!readOnly ? (
          <span className="text-xs text-ink-secondary">Toca el mapa o arrastra el pin</span>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-pin-lg border border-line bg-surface shadow-pin">
        <div ref={containerRef} className="h-[260px] w-full sm:h-[340px]" />
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

      {lugar ? (
        <p className="text-sm text-ink">
          <span className="font-medium">Dirección:</span> {lugar}
        </p>
      ) : null}

      {geoLoading ? <p className="text-xs text-ink-secondary">Obteniendo dirección…</p> : null}
      {geoError ? <div className="alert-error">{geoError}</div> : null}
    </div>
  );
}
