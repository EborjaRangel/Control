"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CENTRO_COYOACAN, MAPBOX_STYLE, MAPBOX_TOKEN, mapboxConfigError } from "@/lib/mapbox-config";
import {
  addAlcaldiaCoyoacanBoundary,
  boundsFromFeatureCollection,
  fetchAlcaldiaCoyoacanGeoJson,
  whenMapReady,
} from "@/lib/mapbox-alcaldia-coyoacan";
import { formatRegistroDifusionFecha, type RegistroDifusionDTO } from "@/lib/difusion";
import { numerosAccionPorRegistro } from "@/lib/difusion-numeracion";
import {
  bindStableHoverPopup,
  createDifusionGloboElement,
  registrosMapaKey,
} from "@/lib/difusion-mapa-markers";
import { resolveMediaUrl } from "@/lib/media-url";

type Props = {
  registros: RegistroDifusionDTO[];
  selectedId?: string | null;
  mostrarNumerosGlobo?: boolean;
  /** Al cambiar (p. ej. campaña), los globos vuelven a animarse desde arriba. */
  animacionAlCambiarKey?: string;
  detalleHref?: (registro: RegistroDifusionDTO) => string;
  heightClassName?: string;
};

type RegistroMapa = RegistroDifusionDTO & { lat: number; lng: number };

function parseCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizarRegistrosMapa(registros: RegistroDifusionDTO[]): RegistroMapa[] {
  const out: RegistroMapa[] = [];
  for (const r of registros) {
    const lat = parseCoord(r.lat);
    const lng = parseCoord(r.lng);
    if (lat == null || lng == null) continue;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    if (Math.abs(lat) <= 0.0001 && Math.abs(lng) <= 0.0001) continue;
    out.push({ ...r, lat, lng });
  }
  return out;
}

function buildPopupContent(
  registro: RegistroDifusionDTO,
  detalleHref: ((registro: RegistroDifusionDTO) => string) | undefined,
  numeroAccion: number | null,
): HTMLDivElement {
  const popupNode = document.createElement("div");
  popupNode.className = "space-y-2 text-sm max-w-[220px]";
  const imgSrc = resolveMediaUrl(registro.fotoUrl);
  popupNode.innerHTML = `
    ${numeroAccion != null ? `<p class="text-xs font-bold text-pin">Acción #${numeroAccion}</p>` : ""}
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
  mostrarNumerosGlobo = false,
  animacionAlCambiarKey,
  detalleHref,
  heightClassName = "h-[min(70vh,420px)] w-full min-h-[280px] sm:min-h-[360px]",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<import("mapbox-gl").Marker[]>([]);
  const alcaldiaBoundsRef = useRef<[[number, number], [number, number]] | null>(null);
  const alcaldiaLoadedRef = useRef(false);
  const animatedIdsRef = useRef<Set<string>>(new Set());
  const lastPaintKeyRef = useRef("");
  const detalleHrefRef = useRef(detalleHref);
  const [mapLoaded, setMapLoaded] = useState(false);

  detalleHrefRef.current = detalleHref;

  const registrosValidos = useMemo(() => normalizarRegistrosMapa(registros), [registros]);

  const registrosKey = useMemo(
    () =>
      `${animacionAlCambiarKey ?? ""}|${registrosMapaKey(registrosValidos)}|nums:${mostrarNumerosGlobo ? 1 : 0}`,
    [registrosValidos, mostrarNumerosGlobo, animacionAlCambiarKey],
  );

  const numerosPorRegistro = useMemo(
    () => numerosAccionPorRegistro(registrosValidos),
    [registrosValidos],
  );

  const pintarMarcadores = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const paintKey = registrosKey;
    if (lastPaintKeyRef.current !== paintKey) {
      lastPaintKeyRef.current = paintKey;
      animatedIdsRef.current.clear();
    }

    void import("mapbox-gl").then((mod) => {
      const mapboxgl = mod.default;
      if (!mapRef.current) return;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (registrosValidos.length === 0) {
        const bounds = alcaldiaBoundsRef.current;
        if (bounds) {
          map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 13 });
        } else {
          map.flyTo({ center: [CENTRO_COYOACAN.lng, CENTRO_COYOACAN.lat], zoom: 12, duration: 0 });
        }
        map.resize();
        return;
      }

      const bounds = new mapboxgl.LngLatBounds();
      const animScope = animacionAlCambiarKey ?? "global";

      registrosValidos.forEach((registro, index) => {
        const animId = `${animScope}:${registro.id}`;
        const animateDrop = !animatedIdsRef.current.has(animId);
        if (animateDrop) animatedIdsRef.current.add(animId);

        const numero = mostrarNumerosGlobo ? numerosPorRegistro.get(registro.id) ?? null : null;

        const root = createDifusionGloboElement({
          selected: registro.id === selectedId,
          animateDrop,
          staggerIndex: index,
          numero,
        });
        const trigger = root.querySelector("button");
        if (!trigger) return;

        const popup = new mapboxgl.Popup({
          offset: [0, -36],
          closeButton: false,
          closeOnClick: false,
          closeOnMove: false,
          maxWidth: "260px",
          className: "difusion-mapa-popup",
        }).setDOMContent(
          buildPopupContent(registro, detalleHrefRef.current, numero),
        );

        const marker = new mapboxgl.Marker({ element: root, anchor: "bottom" })
          .setLngLat([registro.lng, registro.lat])
          .addTo(map);

        bindStableHoverPopup(marker, trigger, popup);

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
  }, [registrosValidos, selectedId, mostrarNumerosGlobo, numerosPorRegistro, animacionAlCambiarKey, registrosKey]);

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
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      alcaldiaLoadedRef.current = false;
      lastPaintKeyRef.current = "";
      animatedIdsRef.current.clear();
      setMapLoaded(false);
    };
  }, [animacionAlCambiarKey ?? "default-map"]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    whenMapReady(mapRef.current, () => {
      requestAnimationFrame(() => {
        pintarMarcadores();
      });
    });
  }, [mapLoaded, registrosKey, pintarMarcadores]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
      if (mapLoaded) pintarMarcadores();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapLoaded, pintarMarcadores]);

  const configError = mapboxConfigError();

  return (
    <div className="space-y-2">
      {configError ? (
        <p className="text-sm text-ink-secondary">{configError}</p>
      ) : null}
      <div
        ref={containerRef}
        className={`card overflow-hidden p-0 ${heightClassName}`}
      />
      {registros.length === 0 ? (
        <p className="text-sm text-ink-secondary">Aún no hay acciones en el mapa.</p>
      ) : registrosValidos.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          Hay registros sin ubicación válida en el mapa. Vuelve a marcar el pin al registrar.
        </p>
      ) : null}
    </div>
  );
}
