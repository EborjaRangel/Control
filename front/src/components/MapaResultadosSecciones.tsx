"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import { apiFetch } from "@/lib/api";
import { boundsFromCollection } from "@/lib/mapa-bounds";
import type {
  AnioMapaResultadosDTO,
  MapaResultadosResponse,
  SeccionMapaResultadosDTO,
} from "@/lib/mapa-resultados";
import type { CoberturaSeccionesResponse, SeccionCoberturaMapa } from "@/lib/mapa-secciones";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import { theme } from "@/lib/theme";
import { cn } from "@/lib/cn";
import { MAPBOX_STYLE, MAPBOX_TOKEN } from "@/lib/mapbox-config";

type Modo = "partido" | "coalicion";

type Props = {
  modo: Modo;
};

type TooltipState = {
  x: number;
  y: number;
  seccion: string;
  etiqueta: string;
  color: string;
  votos: number;
  porcentaje: number;
  participacionPct: number;
  colonias: string;
  nombres: string;
  asignada: boolean;
};

function coberturaDe(
  cobertura: CoberturaSeccionesResponse | null,
  seccion: string | null,
): SeccionCoberturaMapa | null {
  if (!cobertura || !seccion) return null;
  return cobertura.porSeccion[seccion] ?? null;
}

function actualizarResaltado(map: import("mapbox-gl").Map, seccion: string | null) {
  if (!map.getLayer("secciones-selected")) return;
  map.setFilter("secciones-selected", ["==", ["get", "seccion"], seccion ?? ""]);
}

function ganadorDe(info: SeccionMapaResultadosDTO | undefined, modo: Modo) {
  if (!info) return null;
  return modo === "partido" ? info.partido : info.coalicion;
}

function enrichGeoJson(
  geojson: FeatureCollection,
  anioData: AnioMapaResultadosDTO | undefined,
  modo: Modo,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: geojson.features.map((feature) => {
      const seccion = String(feature.properties?.seccion ?? "");
      const info = anioData?.porSeccion[seccion];
      const ganador = ganadorDe(info, modo);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          fillColor: ganador?.color ?? "#E8E8E8",
          ganadorEtiqueta: ganador?.etiqueta ?? "Sin datos",
          ganadorVotos: ganador?.votos ?? 0,
          ganadorPct: ganador?.porcentaje ?? 0,
          participacionPct: info?.participacionPct ?? 0,
        },
      };
    }),
  };
}

function leyendaDelAnio(data: MapaResultadosResponse, anio: number, modo: Modo) {
  const bloque = data.porAnio[String(anio)];
  if (!bloque) return [];
  const items = modo === "partido" ? bloque.leyendaPartido : bloque.leyendaCoalicion;
  if (items?.length) {
    return items.map((item) => ({
      clave: item.clave,
      etiqueta: item.etiqueta,
      color: item.color,
      secciones: item.secciones ?? 0,
    }));
  }
  const resumen = modo === "partido" ? bloque.resumenPartido : bloque.resumenCoalicion;
  const catalogo = modo === "partido" ? data.leyendaPartido : data.leyendaCoalicion;
  const byClave = new Map(catalogo.map((item) => [item.clave, item]));
  return Object.entries(resumen)
    .filter(([clave, n]) => clave !== "SIN_DATOS" && n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([clave, n]) => ({
      clave,
      etiqueta: byClave.get(clave)?.etiqueta ?? clave,
      color: byClave.get(clave)?.color ?? "#767676",
      secciones: n,
    }));
}

export function MapaResultadosSecciones({ modo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const geojsonRef = useRef<FeatureCollection | null>(null);
  const coberturaRef = useRef<CoberturaSeccionesResponse | null>(null);
  const seccionFijadaRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<MapaResultadosResponse | null>(null);
  const [cobertura, setCobertura] = useState<CoberturaSeccionesResponse | null>(null);
  const [anio, setAnio] = useState<number>(2024);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [seccionHover, setSeccionHover] = useState<string | null>(null);
  const [seccionFijada, setSeccionFijada] = useState<string | null>(null);

  seccionFijadaRef.current = seccionFijada;
  coberturaRef.current = cobertura;

  const seccionActiva = seccionFijada ?? seccionHover;
  const coberturaActiva = coberturaDe(cobertura, seccionActiva);

  const anioData = resultados?.porAnio[String(anio)];
  const leyenda = useMemo(
    () => (resultados ? leyendaDelAnio(resultados, anio, modo) : []),
    [resultados, anio, modo],
  );

  useEffect(() => {
    if (!resultados?.anios.length) return;
    if (!resultados.anios.includes(anio as 2015 | 2018 | 2021 | 2024)) {
      setAnio(resultados.anios[resultados.anios.length - 1]!);
    }
  }, [resultados, anio]);

  useEffect(() => {
    const map = mapRef.current;
    const geojson = geojsonRef.current;
    if (!map || !geojson || !anioData) return;
    const source = map.getSource("secciones") as import("mapbox-gl").GeoJSONSource | undefined;
    if (!source) return;
    source.setData(enrichGeoJson(geojson, anioData, modo));
  }, [anioData, modo]);

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
      apiFetch("/api/secciones/coyoacan/resultados-mapa", { signal: controller.signal }).then(
        async (res) => {
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error ?? "No se pudieron cargar los resultados");
          }
          return (await res.json()) as MapaResultadosResponse;
        },
      ),
      apiFetch("/api/secciones/coyoacan/alcaldia", { signal: controller.signal }).then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as FeatureCollection;
      }),
      apiFetch("/api/secciones/coyoacan/cobertura", { signal: controller.signal }).then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as CoberturaSeccionesResponse;
      }),
    ])
      .then(([geojson, data, alcaldia, cov]) => {
        if (controller.signal.aborted || cancelled) return;
        geojsonRef.current = geojson;
        coberturaRef.current = cov;
        setCobertura(cov);
        setResultados(data);
        const inicial = data.anios.includes(2024) ? 2024 : (data.anios[data.anios.length - 1] ?? 2024);
        setAnio(inicial);
        void initMap(geojson, data, alcaldia, inicial);
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
      data: MapaResultadosResponse,
      alcaldia: FeatureCollection | null,
      anioInicial: number,
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

        const enriched = enrichGeoJson(geojson, data.porAnio[String(anioInicial)], modo);
        map.addSource("secciones", { type: "geojson", data: enriched });
        map.addLayer({
          id: "secciones-fill",
          type: "fill",
          source: "secciones",
          paint: {
            "fill-color": ["coalesce", ["get", "fillColor"], "#E8E8E8"],
            "fill-opacity": 0.72,
          },
        });
        map.addLayer({
          id: "secciones-line",
          type: "line",
          source: "secciones",
          paint: {
            "line-color": "#ffffff",
            "line-width": 0.7,
            "line-opacity": 0.85,
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
          filter: ["==", ["get", "seccion"], seccionFijadaRef.current ?? ""],
        });

        map.on("mousemove", "secciones-fill", (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const seccion = String(feature.properties?.seccion ?? "");
          if (!seccion) return;
          map.getCanvas().style.cursor = "pointer";
          const info = coberturaDe(coberturaRef.current, seccion);
          actualizarResaltado(map, seccionFijadaRef.current ?? seccion);
          setSeccionHover(seccion);
          setTooltip({
            x: event.point.x,
            y: event.point.y,
            seccion,
            etiqueta: String(feature.properties?.ganadorEtiqueta ?? "Sin datos"),
            color: String(feature.properties?.fillColor ?? "#E8E8E8"),
            votos: Number(feature.properties?.ganadorVotos ?? 0),
            porcentaje: Number(feature.properties?.ganadorPct ?? 0),
            participacionPct: Number(feature.properties?.participacionPct ?? 0),
            colonias: info?.colonias ?? "",
            nombres: info?.nombres ?? "",
            asignada: Boolean(info?.asignada),
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
    // El mapa se crea una vez; año/modo se actualizan con setData.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  useEffect(() => {
    if (mapRef.current) {
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
      <div className="flex flex-wrap gap-2">
        {(resultados?.anios ?? [2015, 2018, 2021, 2024]).map((valor) => (
          <button
            key={valor}
            type="button"
            className={cn("btn-responsive", anio === valor ? "btn-primary" : "btn-secondary")}
            onClick={() => setAnio(valor)}
          >
            {valor === 2015 ? "2015 (delegacional)" : String(valor)}
          </button>
        ))}
      </div>

      {anioData?.notaPartido && modo === "partido" ? (
        <p className="text-sm text-ink-secondary">{anioData.notaPartido}</p>
      ) : null}

      {anioData?.notaCoalicion && modo === "coalicion" ? (
        <p className="text-sm text-ink-secondary">{anioData.notaCoalicion}</p>
      ) : null}

      {modo === "partido" ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-secondary">
          {[
            { clave: "PRI", etiqueta: "PRI", color: "#E30613" },
            { clave: "PVEM", etiqueta: "Verde", color: "#009A44" },
            { clave: "PAN", etiqueta: "PAN", color: "#0055A4" },
            { clave: "PRD", etiqueta: "PRD", color: "#FFD100" },
            { clave: "MORENA", etiqueta: "MORENA", color: "#9F2241" },
            { clave: "PT", etiqueta: "PT", color: "#5C0A1A" },
            { clave: "MC", etiqueta: "MC", color: "#F58220" },
          ].map((item) => (
            <span key={item.clave} className="inline-flex items-center gap-2">
              <span
                className="inline-block size-3 rounded-sm border border-black/10"
                style={{ backgroundColor: item.color }}
              />
              {item.etiqueta}
            </span>
          ))}
        </div>
      ) : null}

      {leyenda.length ? (
        <div className="flex flex-wrap gap-3 text-sm">
          {leyenda.map((item) => (
            <span
              key={item.clave}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-ink-secondary"
            >
              <span
                className="inline-block size-3 rounded-sm border border-black/10"
                style={{ backgroundColor: item.color }}
              />
              {item.etiqueta}
              <span className="text-ink">{item.secciones}</span>
            </span>
          ))}
        </div>
      ) : null}

      <section className="card-section space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">
            {seccionActiva ? etiquetaSeccion(seccionActiva) : "Colonia y dirigentes"}
          </h2>
          {seccionFijada ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge-pin">Sección fijada</span>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setSeccionFijada(null);
                  seccionFijadaRef.current = null;
                  if (mapRef.current) actualizarResaltado(mapRef.current, seccionHover);
                }}
              >
                Quitar selección
              </button>
            </div>
          ) : null}
        </div>
        {!seccionActiva ? (
          <p className="text-sm text-ink-secondary">
            Pasa el cursor o haz clic en una sección para ver su colonia y los dirigentes asignados.
          </p>
        ) : (
          <div className="space-y-1 text-sm">
            <p className="text-ink-secondary">
              <span className="font-medium text-ink">
                {(coberturaActiva?.colonias ?? "").includes("(") ? "Colonias:" : "Colonia:"}
              </span>{" "}
              {coberturaActiva?.colonias || "Sin colonia registrada"}
            </p>
            {coberturaActiva?.dirigentes?.length ? (
              <ul className="text-ink-secondary">
                {coberturaActiva.dirigentes.map((d) => (
                  <li key={d.id}>
                    <span className="font-medium text-ink">{d.nombreCompleto}</span>
                    {d.tipo ? ` · ${d.tipo}` : ""}
                    {d.colonia ? ` · ${d.colonia}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-secondary">Sin dirigente asignado</p>
            )}
          </div>
        )}
      </section>

      <div className="relative overflow-hidden rounded-pin-lg border border-line bg-surface shadow-pin">
        <div ref={containerRef} className="h-[min(70vh,640px)] w-full min-h-[360px]" />
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 text-sm text-ink-secondary">
            Cargando resultados electorales…
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
            {tooltip.colonias ? (
              <p className="mt-1 text-ink-secondary">
                <span className="font-medium text-ink">
                  {tooltip.colonias.includes("(") ? "Colonias:" : "Colonia:"}
                </span>{" "}
                {tooltip.colonias}
              </p>
            ) : (
              <p className="mt-1 text-ink-secondary">Sin colonia registrada</p>
            )}
            {tooltip.asignada ? (
              <p className="mt-1 text-ink-secondary">{tooltip.nombres}</p>
            ) : (
              <p className="mt-1 text-ink-secondary">Sin dirigente asignado</p>
            )}
            <p className="mt-1 inline-flex items-center gap-2 font-medium text-ink">
              <span
                className="inline-block size-3 rounded-sm border border-black/10"
                style={{ backgroundColor: tooltip.color }}
              />
              {tooltip.etiqueta}
            </p>
            {tooltip.votos > 0 ? (
              <p className="mt-1 text-ink-secondary">
                {tooltip.votos.toLocaleString("es-MX")} votos ({tooltip.porcentaje.toFixed(1)}%)
                {tooltip.participacionPct > 0
                  ? ` · participación ${tooltip.participacionPct.toFixed(1)}%`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 text-ink-secondary">Sin resultados en este proceso</p>
            )}
            {!seccionFijada ? (
              <p className="mt-1 text-xs text-ink-secondary">Clic para fijar la sección</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-xs text-ink-secondary">
        {modo === "partido"
          ? "Cada sección se pinta con el color del partido que más votos obtuvo, sin agrupar coaliciones. PRI rojo, Verde verde, PAN azul, PRD amarillo, MORENA guinda y PT vino oscuro. Pasa el cursor o haz clic para ver colonia y dirigentes."
          : "Cada sección se pinta con el color de la coalición ganadora. Los partidos que contendieron solos conservan su color original. Pasa el cursor o haz clic para ver colonia y dirigentes."}
      </p>
    </div>
  );
}
