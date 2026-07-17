"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import { useAuth } from "@/components/AuthProvider";
import { AsignacionRepresentantesPanel } from "@/components/AsignacionRepresentantesPanel";
import { apiFetch } from "@/lib/api";
import type { CasillasCatalogoResponse, SeccionCasillasResumenDTO } from "@/lib/mapa-electoral";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import { theme } from "@/lib/theme";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const MAPBOX_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? "mapbox://styles/mapbox/light-v11";

type LngLatBoundsLike = [[number, number], [number, number]];

function boundsFromGeometry(geometry: GeoJSON.Geometry | null | undefined): LngLatBoundsLike | null {
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
  catalogo: CasillasCatalogoResponse,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: geojson.features.map((feature) => {
      const seccion = String(feature.properties?.seccion ?? "");
      const info = catalogo.porSeccion[seccion];
      return {
        ...feature,
        properties: {
          ...feature.properties,
          basicas: info?.basicas ?? 0,
          contiguas: info?.contiguas ?? 0,
          totalCasillas: info?.total ?? 0,
        },
      };
    }),
  };
}

type TooltipState = {
  x: number;
  y: number;
  seccion: string;
  basicas: number;
  contiguas: number;
};

function CasillasList({ detalle }: { detalle: SeccionCasillasResumenDTO }) {
  if ((detalle.casillas?.length ?? 0) === 0) {
    return (
      <p className="text-sm text-ink-secondary">
        {etiquetaSeccion(detalle.seccion)}: sin casillas en el catálogo.
      </p>
    );
  }

  return (
    <>
      <div>
        <p className="font-semibold text-ink">{etiquetaSeccion(detalle.seccion)}</p>
        <p className="text-xs text-ink-secondary">
          {detalle.basicas} básica(s) · {detalle.contiguas} contigua(s)
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(detalle.casillas ?? []).map((c) => (
          <li key={c.id} className="panel-soft p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ink">
                  Casilla {c.numero} · {c.tipoLabel}
                </p>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  Lista nominal: {c.listaNominal.toLocaleString("es-MX")} electores
                </p>
              </div>
              <span
                className={
                  c.tipo === "BASICA"
                    ? "badge-pin shrink-0 text-[10px]"
                    : "badge-muted shrink-0 text-[10px]"
                }
              >
                {c.tipo === "BASICA" ? "Básica" : "Contigua"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function MapaElectoralSecciones() {
  const { isStaff } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const seccionFijadaRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<CasillasCatalogoResponse | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [seccionHover, setSeccionHover] = useState<string | null>(null);
  const [seccionFijada, setSeccionFijada] = useState<string | null>(null);

  seccionFijadaRef.current = seccionFijada;

  const detalleHover =
    seccionHover && catalogo ? (catalogo.porSeccion[seccionHover] ?? null) : null;
  const detalleFijada =
    seccionFijada && catalogo ? (catalogo.porSeccion[seccionFijada] ?? null) : null;
  const detallePanel = detalleFijada ?? detalleHover;

  function actualizarResaltado(map: import("mapbox-gl").Map, seccion: string | null) {
    map.setFilter("secciones-selected", ["==", ["get", "seccion"], seccion ?? ""]);
  }

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
      apiFetch("/api/electoral/casillas/catalogo", { signal: controller.signal }).then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "No se pudo cargar el catálogo de casillas");
        }
        return (await res.json()) as CasillasCatalogoResponse;
      }),
      apiFetch("/api/secciones/coyoacan/alcaldia", { signal: controller.signal }).then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as FeatureCollection;
      }),
    ])
      .then(([geojson, cat, alcaldia]) => {
        if (controller.signal.aborted || cancelled) return;
        setCatalogo(cat);
        void initMap(geojson, cat, alcaldia);
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
      cat: CasillasCatalogoResponse,
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
      const enriched = enrichGeoJson(geojson, cat);

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
        for (const id of [
          "secciones-line",
          "secciones-fill",
          "secciones-selected",
          "alcaldia-line",
          "alcaldia-fill",
        ]) {
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
              ["==", ["get", "totalCasillas"], 0],
              "#ffffff",
              theme.pin,
            ],
            "fill-opacity": [
              "case",
              ["==", ["get", "totalCasillas"], 0],
              0.92,
              0.55,
            ],
          },
        });
        map.addLayer({
          id: "secciones-line",
          type: "line",
          source: "secciones",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "totalCasillas"], 0],
              "#d4d4d4",
              theme.pinDark,
            ],
            "line-width": [
              "case",
              ["==", ["get", "totalCasillas"], 0],
              0.8,
              1.2,
            ],
            "line-opacity": 0.9,
          },
        });
        map.addLayer({
          id: "secciones-selected",
          type: "line",
          source: "secciones",
          paint: {
            "line-color": theme.pinDark,
            "line-width": 3,
          },
          filter: ["==", ["get", "seccion"], ""],
        });

        map.on("mousemove", "secciones-fill", (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const seccion = String(feature.properties?.seccion ?? "");
          if (!seccion) return;
          map.getCanvas().style.cursor = "pointer";
          const resaltar = seccionFijadaRef.current ?? seccion;
          actualizarResaltado(map, resaltar);
          setSeccionHover(seccion);
          setTooltip({
            x: event.point.x,
            y: event.point.y,
            seccion,
            basicas: Number(feature.properties?.basicas ?? 0),
            contiguas: Number(feature.properties?.contiguas ?? 0),
          });
        });

        map.on("mouseleave", "secciones-fill", () => {
          map.getCanvas().style.cursor = "";
          setSeccionHover(null);
          setTooltip(null);
          actualizarResaltado(map, seccionFijadaRef.current);
        });

        map.on("click", "secciones-fill", (event) => {
          const feature = event.features?.[0];
          const seccion = String(feature?.properties?.seccion ?? "");
          if (!seccion) return;
          setSeccionFijada((actual) => {
            const siguiente = actual === seccion ? null : seccion;
            seccionFijadaRef.current = siguiente;
            actualizarResaltado(map, siguiente);
            return siguiente;
          });
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

  useEffect(() => {
    if (mapRef.current?.getLayer("secciones-selected")) {
      actualizarResaltado(mapRef.current, seccionFijada ?? seccionHover);
    }
  }, [seccionFijada, seccionHover]);

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
      {catalogo ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="badge-pin">{catalogo.totalCasillas} casillas B/C</span>
          <span className="rounded-full border border-line bg-surface px-3 py-1 text-ink-secondary">
            {catalogo.totalSecciones} secciones electorales
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-secondary">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block size-4 rounded border border-[#003366]"
            style={{ backgroundColor: theme.pin, opacity: 0.7 }}
          />
          Sección con casillas registradas
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-4 rounded border border-[#d4d4d4] bg-white" />
          Sección sin casillas en catálogo
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
            className="pointer-events-none absolute z-20 max-w-xs rounded-pin border border-line bg-surface px-3 py-2 text-sm shadow-pin"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            <p className="font-semibold text-ink">{etiquetaSeccion(tooltip.seccion)}</p>
            <p className="mt-1 text-ink-secondary">
              {tooltip.basicas} básica(s) · {tooltip.contiguas} contigua(s)
            </p>
            {!seccionFijada ? (
              <p className="mt-1 text-xs text-ink-secondary">Clic para fijar la sección</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="card-section space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Casillas de la sección</h2>
          {seccionFijada ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge-pin">Sección fijada: {etiquetaSeccion(seccionFijada)}</span>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setSeccionFijada(null);
                  if (mapRef.current) actualizarResaltado(mapRef.current, seccionHover);
                }}
              >
                Quitar selección
              </button>
            </div>
          ) : null}
        </div>

        {!detallePanel ? (
          <p className="text-sm text-ink-secondary">
            Pasa el cursor sobre una sección para ver sus casillas. Haz clic en el mapa para fijar
            la sección y asignarla a representantes validados.
          </p>
        ) : (
          <CasillasList detalle={detallePanel} />
        )}

        {isStaff && seccionFijada ? (
          <AsignacionRepresentantesPanel seccionElectoral={seccionFijada} />
        ) : null}
      </section>

      <p className="text-xs text-ink-secondary">
        Pasa el cursor para explorar. Clic en una sección para fijarla y asignar representantes
        capturados y validados. Solo staff puede validar y asignar.
      </p>
    </div>
  );
}
