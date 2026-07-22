"use client";

import { useEffect, useRef } from "react";
import { CENTRO_COYOACAN } from "@/lib/mapbox-geocode";
import {
  calcSemaforoTiempoReporte,
  semaforoMarkerColor,
  type ReporteServicioUrbanoDTO,
} from "@/lib/servicios-urbanos";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const MAPBOX_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? "mapbox://styles/mapbox/light-v11";

type Props = {
  reportes: ReporteServicioUrbanoDTO[];
  selectedId?: string | null;
  onSelect?: (reporte: ReporteServicioUrbanoDTO) => void;
  heightClassName?: string;
};

export function ServiciosUrbanosMapa({
  reportes,
  selectedId,
  onSelect,
  heightClassName = "h-[min(70vh,420px)] w-full min-h-[280px] sm:min-h-[360px]",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<import("mapbox-gl").Marker[]>([]);

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
      }

      const map = mapRef.current;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (reportes.length === 0) return;

      const bounds = new mapboxgl.LngLatBounds();

      for (const reporte of reportes) {
        const semaforo = calcSemaforoTiempoReporte({
          createdAt: reporte.createdAt,
          estatus: reporte.estatus,
          atendidoAt: reporte.atendidoAt,
        });
        const el = document.createElement("button");
        el.type = "button";
        el.className =
          "size-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-125";
        el.style.backgroundColor = semaforoMarkerColor(semaforo);
        if (reporte.id === selectedId) {
          el.style.boxShadow = "0 0 0 3px rgba(0,85,164,0.45)";
          el.style.transform = "scale(1.25)";
        }

        const popupNode = document.createElement("div");
        popupNode.className = "space-y-2 text-sm";
        popupNode.innerHTML = `
          <p class="font-mono font-semibold text-pin">${reporte.folio}</p>
          <p class="font-medium">${reporte.tipoLabel}</p>
          <p class="text-xs text-ink-secondary">${reporte.estatusLabel}</p>
          <p class="text-xs text-ink-secondary">${reporte.direccion}</p>
        `;
        const link = document.createElement("a");
        link.href = `/servicios-urbanos/${reporte.id}`;
        link.className = "inline-flex text-xs font-semibold text-pin hover:underline";
        link.textContent = "Ver detalle";
        popupNode.appendChild(link);

        const popup = new mapboxgl.Popup({ offset: 16, maxWidth: "260px" }).setDOMContent(popupNode);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([reporte.lng, reporte.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", () => {
          onSelect?.(reporte);
        });

        markersRef.current.push(marker);
        bounds.extend([reporte.lng, reporte.lat]);
      }

      if (reportes.length === 1) {
        map.flyTo({ center: [reportes[0].lng, reportes[0].lat], zoom: 15 });
      } else {
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 600 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reportes, selectedId, onSelect]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`card flex items-center justify-center ${heightClassName}`}>
        <p className="text-sm text-ink-secondary">
          Configura <code className="text-xs">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> para ver el mapa.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-pin ring-1 ring-line ${heightClassName}`}>
      <div ref={containerRef} className="h-full w-full" />
      {reportes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface/70">
          <p className="text-sm text-ink-secondary">No hay reportes con los filtros actuales.</p>
        </div>
      ) : null}
    </div>
  );
}
