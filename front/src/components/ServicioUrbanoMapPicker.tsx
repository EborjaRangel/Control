"use client";

import { useEffect, useRef, useState } from "react";
import { CENTRO_COYOACAN, reverseGeocodeMapbox } from "@/lib/mapbox-geocode";
import { theme } from "@/lib/theme";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const MAPBOX_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? "mapbox://styles/mapbox/light-v11";

type Props = {
  lat: number | null;
  lng: number | null;
  direccion: string;
  onChange: (value: { lat: number; lng: number; direccion: string }) => void;
  readOnly?: boolean;
};

export function ServicioUrbanoMapPicker({
  lat,
  lng,
  direccion,
  onChange,
  readOnly = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markerRef = useRef<import("mapbox-gl").Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  onChangeRef.current = onChange;

  async function actualizarPin(nuevoLng: number, nuevoLat: number, moverMapa = true) {
    setGeoLoading(true);
    setGeoError(null);
    try {
      const nuevaDireccion = await reverseGeocodeMapbox(nuevoLng, nuevoLat);
      onChangeRef.current({ lat: nuevoLat, lng: nuevoLng, direccion: nuevaDireccion });
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
    if (!MAPBOX_TOKEN || !containerRef.current || readOnly) return;

    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;
      const centro = lat != null && lng != null ? [lng, lat] : [CENTRO_COYOACAN.lng, CENTRO_COYOACAN.lat];

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: centro as [number, number],
        zoom: lat != null && lng != null ? 16 : 12,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      const marker = new mapboxgl.Marker({ color: theme.pin, draggable: true })
        .setLngLat(centro as [number, number])
        .addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        void actualizarPin(pos.lng, pos.lat, false);
      });

      map.on("click", (event) => {
        void actualizarPin(event.lngLat.lng, event.lngLat.lat, false);
      });

      if (lat == null || lng == null) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              void actualizarPin(pos.coords.longitude, pos.coords.latitude);
            },
            () => {
              void actualizarPin(CENTRO_COYOACAN.lng, CENTRO_COYOACAN.lat);
            },
            { enableHighAccuracy: true, timeout: 15000 },
          );
        } else {
          void actualizarPin(CENTRO_COYOACAN.lng, CENTRO_COYOACAN.lat);
        }
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [readOnly]);

  useEffect(() => {
    if (!readOnly || !MAPBOX_TOKEN || !containerRef.current) return;

    let cancelled = false;

    void (async () => {
      if (lat == null || lng == null) return;
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: [lng, lat],
        zoom: 16,
        interactive: false,
      });
      mapRef.current = map;
      new mapboxgl.Marker({ color: theme.pin })
        .setLngLat([lng, lat])
        .addTo(map);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [readOnly, lat, lng]);

  if (!MAPBOX_TOKEN) {
    return (
      <p className="panel-soft text-sm text-ink-secondary">
        Configura <code className="text-xs">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> en{" "}
        <code className="text-xs">front/.env.local</code> para seleccionar la ubicación en el mapa.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!readOnly ? (
        <p className="text-sm text-ink-secondary">
          Arrastra el pin o toca el mapa para marcar la ubicación exacta del reporte.
        </p>
      ) : null}
      <div
        ref={containerRef}
        className="h-72 w-full overflow-hidden rounded-pin ring-1 ring-line sm:h-80"
      />
      {geoLoading ? (
        <p className="text-xs text-ink-secondary">Obteniendo dirección…</p>
      ) : null}
      {geoError ? <p className="field-error">{geoError}</p> : null}
      {direccion ? (
        <div className="panel-soft p-3 text-sm">
          <span className="text-xs uppercase text-ink-secondary">Dirección</span>
          <p className="mt-1 font-medium text-ink">{direccion}</p>
          {lat != null && lng != null ? (
            <p className="mt-1 text-xs text-ink-secondary">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
