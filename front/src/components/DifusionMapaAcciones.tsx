"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CENTRO_COYOACAN, MAPBOX_STYLE, MAPBOX_TOKEN, mapboxConfigError } from "@/lib/mapbox-config";
import {
  addAlcaldiaCoyoacanBoundary,
  boundsFromFeatureCollection,
  fetchAlcaldiaCoyoacanGeoJson,
  whenMapReady,
} from "@/lib/mapbox-alcaldia-coyoacan";
import { formatRegistroDifusionFecha, type RegistroDifusionDTO } from "@/lib/difusion";
import {
  bindStableHoverPopup,
  createDifusionGloboElement,
  registrosMapaKey,
} from "@/lib/difusion-mapa-markers";
import { resolveMediaUrl } from "@/lib/media-url";

type Props = {
  registros: RegistroDifusionDTO[];
  selectedId?: string | null;
  detalleHref?: (registro: RegistroDifusionDTO) => string;
  heightClassName?: string;
};

function buildPopupContent(
  registro: RegistroDifusionDTO,
  detalleHref: ((registro: RegistroDifusionDTO) => string) | undefined,
): HTMLDivElement {
  const popupNode = document.createElement("div");
  popupNode.className = "space-y-2 text-sm max-w-[220px]";
  const imgSrc = resolveMediaUrl(registro.fotoUrl);
  popupNode.innerHTML = `
    <p class="font-semibold text-pin">${registro.campanaTitulo ?? "Difusión"}</p>
    ${registro.dirigenteNombre ? `<p class="text-xs">${registro.dirigenteNombre}</p>` : ""}
    <p class="text-xs text-ink-secondary">${formatRegistroDifusionFecha(registro.registradoAt)}</p>
    ${imgSrc ? `<img src="${imgSrc}" alt="" class="mt-1 max-h-28 w-full rounded-md object-cover" />` : ""}
  `;
  if (detalleHref) {
    const link = document.createElement("a");
    link.href = detalleHref(registro);
    link.className = "inline-flex text-xs font-semibold text-pin hover:underline";
    link.textContent = "Ver detalle";
    popupNode.appendChild(link);
  }
  return popupNode;
}

export function DifusionMapaAcciones({
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
  const animatedIdsRef = useRef<Set<string>>(new Set());
  const detalleHrefRef = useRef(detalleHref);
  const [mapReady, setMapReady] = useState(false);

  detalleHrefRef.current = detalleHref;

  const registrosKey = useMemo(() => registrosMapaKey(registros), [registros]);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;

    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: MAPBOX_STYLE,
          center: [CENTRO_COYOACAN.lng, CENTRO_COYOACAN.lat],
          zoom: 12,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        setMapReady(true);
      }

      const map = mapRef.current;
      if (!map) return;

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
    };
  }, []);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapRef.current || !mapReady) return;

    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !mapRef.current) return;

      const map = mapRef.current;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (registros.length === 0) {
        const bounds = alcaldiaBoundsRef.current;
        whenMapReady(map, () => {
          if (bounds) {
            map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 13 });
          } else {
            map.flyTo({ center: [CENTRO_COYOACAN.lng, CENTRO_COYOACAN.lat], zoom: 12, duration: 0 });
          }
        });
        return;
      }

      const bounds = new mapboxgl.LngLatBounds();

      registros.forEach((registro, index) => {
        const animateDrop = !animatedIdsRef.current.has(registro.id);
        if (animateDrop) animatedIdsRef.current.add(registro.id);

        const el = createDifusionGloboElement({
          selected: registro.id === selectedId,
          animateDrop,
          staggerIndex: index,
        });

        const popup = new mapboxgl.Popup({
          offset: [0, -36],
          closeButton: false,
          closeOnClick: false,
          closeOnMove: false,
          maxWidth: "260px",
          className: "difusion-mapa-popup",
        }).setDOMContent(buildPopupContent(registro, detalleHrefRef.current));

        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([registro.lng, registro.lat])
          .addTo(map);

        bindStableHoverPopup(marker, el, popup);

        markersRef.current.push(marker);
        bounds.extend([registro.lng, registro.lat]);
      });

      whenMapReady(map, () => {
        if (registros.length === 1) {
          map.flyTo({ center: [registros[0].lng, registros[0].lat], zoom: 15 });
        } else {
          map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 600 });
        }
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [registrosKey, selectedId, mapReady, registros]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      alcaldiaLoadedRef.current = false;
      animatedIdsRef.current.clear();
    };
  }, []);

  const configError = mapboxConfigError();

  return (
    <div className="space-y-2">
      {configError ? (
        <p className="text-sm text-ink-secondary">{configError}</p>
      ) : null}
      <div ref={containerRef} className={`card overflow-hidden p-0 ${heightClassName}`} />
      {registros.length === 0 ? (
        <p className="text-sm text-ink-secondary">Aún no hay acciones en el mapa.</p>
      ) : null}
    </div>
  );
}
