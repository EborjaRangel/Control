"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CENTRO_COYOACAN, MAPBOX_STYLE, MAPBOX_TOKEN, mapboxConfigError } from "@/lib/mapbox-config";
import {
  addAlcaldiaCoyoacanBoundary,
  boundsFromFeatureCollection,
  fetchAlcaldiaCoyoacanGeoJson,
  whenMapReady,
} from "@/lib/mapbox-alcaldia-coyoacan";
import {
  formatRegistroTransporteFecha,
  type RegistroTransporteAdminDTO,
} from "@/lib/transporte";
import { resolveMediaUrl } from "@/lib/media-url";

type Props = {
  registros: RegistroTransporteAdminDTO[];
  selectedId?: string | null;
  detalleHref?: (registro: RegistroTransporteAdminDTO) => string;
  heightClassName?: string;
};

function normalizarRegistros(registros: RegistroTransporteAdminDTO[]) {
  return registros.filter((r) => {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return false;
    if (Math.abs(r.lat) <= 0.0001 && Math.abs(r.lng) <= 0.0001) return false;
    return true;
  });
}

function popupHtml(registro: RegistroTransporteAdminDTO, detalleHref?: string) {
  const foto = registro.fotos[0]?.url;
  const imgSrc = foto ? resolveMediaUrl(foto) : "";
  const link = detalleHref
    ? `<a href="${detalleHref}" class="mt-2 inline-flex text-xs font-semibold text-pin hover:underline">Ver detalle</a>`
    : "";
  return `
    <div class="space-y-1 text-sm max-w-[240px]">
      <p class="font-semibold text-pin">${registro.tipoUnidadLabel} · ${registro.placas}</p>
      <p class="text-xs">${registro.dirigenteNombre}</p>
      <p class="text-xs text-ink-secondary">${registro.eventoTitulo}</p>
      <p class="text-xs text-ink-secondary">${formatRegistroTransporteFecha(registro.registradoAt)}</p>
      ${imgSrc ? `<img src="${imgSrc}" alt="" class="mt-1 max-h-24 w-full rounded-md object-cover" />` : ""}
      ${link}
    </div>
  `;
}

export function TransporteMapaRegistros({
  registros,
  selectedId,
  detalleHref,
  heightClassName = "h-[min(70vh,420px)] w-full min-h-[280px] sm:min-h-[360px]",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<import("mapbox-gl").Marker[]>([]);
  const alcaldiaBoundsRef = useRef<[[number, number], [number, number]] | null>(null);
  const alcaldiaLoadedRef = useRef(false);
  const detalleHrefRef = useRef(detalleHref);
  const [mapLoaded, setMapLoaded] = useState(false);

  detalleHrefRef.current = detalleHref;

  const registrosValidos = useMemo(() => normalizarRegistros(registros), [registros]);
  const registrosKey = useMemo(
    () => registrosValidos.map((r) => r.id).join(","),
    [registrosValidos],
  );

  const pintarMarcadores = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    void import("mapbox-gl").then((mod) => {
      const mapboxgl = mod.default;
      if (!mapRef.current) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (registrosValidos.length === 0) {
        const bounds = alcaldiaBoundsRef.current;
        if (bounds) map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 13 });
        else map.flyTo({ center: [CENTRO_COYOACAN.lng, CENTRO_COYOACAN.lat], zoom: 12, duration: 0 });
        map.resize();
        return;
      }

      const bounds = new mapboxgl.LngLatBounds();

      registrosValidos.forEach((registro) => {
        const el = document.createElement("div");
        el.className =
          registro.id === selectedId
            ? "size-4 rounded-full border-2 border-white bg-pin shadow-md"
            : "size-3 rounded-full border-2 border-white bg-pin-light shadow";

        const popup = new mapboxgl.Popup({
          offset: 12,
          closeButton: true,
          maxWidth: "260px",
        }).setHTML(popupHtml(registro, detalleHrefRef.current?.(registro)));

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([registro.lng, registro.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend([registro.lng, registro.lat]);
      });

      map.resize();
      if (registrosValidos.length === 1) {
        map.flyTo({ center: [registrosValidos[0].lng, registrosValidos[0].lat], zoom: 15, duration: 500 });
      } else {
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 600 });
      }
    });
  }, [registrosValidos, selectedId]);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;

    let cancelled = false;
    setMapLoaded(false);

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: [CENTRO_COYOACAN.lng, CENTRO_COYOACAN.lat],
        zoom: 12,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      map.once("load", () => {
        if (cancelled) return;
        map.resize();
        setMapLoaded(true);
      });

      if (!alcaldiaLoadedRef.current) {
        const alcaldia = await fetchAlcaldiaCoyoacanGeoJson();
        if (cancelled) return;
        if (alcaldia) {
          alcaldiaBoundsRef.current = boundsFromFeatureCollection(alcaldia);
          whenMapReady(map, () => {
            if (cancelled || !mapRef.current) return;
            addAlcaldiaCoyoacanBoundary(mapRef.current, alcaldia);
          });
        }
        alcaldiaLoadedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded) return;
    pintarMarcadores();
  }, [mapLoaded, pintarMarcadores, registrosKey]);

  const mapboxError = mapboxConfigError();
  if (mapboxError) {
    return <div className="alert-error">{mapboxError}</div>;
  }

  return (
    <div className={`relative overflow-hidden rounded-pin-lg border border-line ${heightClassName}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {registrosValidos.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <span className="rounded-md bg-surface/95 px-3 py-1 text-xs text-ink-secondary shadow">
            Sin ubicaciones para mostrar con los filtros actuales
          </span>
        </div>
      ) : null}
    </div>
  );
}
