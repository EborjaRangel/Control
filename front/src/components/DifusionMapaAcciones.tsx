"use client";

import { useEffect, useRef } from "react";
import { CENTRO_COYOACAN, MAPBOX_STYLE, MAPBOX_TOKEN, mapboxConfigError } from "@/lib/mapbox-config";
import { formatRegistroDifusionFecha, type RegistroDifusionDTO } from "@/lib/difusion";
import { resolveMediaUrl } from "@/lib/media-url";
import { theme } from "@/lib/theme";

type Props = {
  registros: RegistroDifusionDTO[];
  selectedId?: string | null;
  detalleHref?: (registro: RegistroDifusionDTO) => string;
  heightClassName?: string;
};

export function DifusionMapaAcciones({
  registros,
  selectedId,
  detalleHref,
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

      if (registros.length === 0) return;

      const bounds = new mapboxgl.LngLatBounds();

      for (const registro of registros) {
        const el = document.createElement("button");
        el.type = "button";
        el.className =
          "size-5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-125";
        el.style.backgroundColor = theme.pin;
        if (registro.id === selectedId) {
          el.style.boxShadow = "0 0 0 3px rgba(0,85,164,0.45)";
          el.style.transform = "scale(1.2)";
        }

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

        const popup = new mapboxgl.Popup({ offset: 16, maxWidth: "260px" }).setDOMContent(popupNode);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([registro.lng, registro.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend([registro.lng, registro.lat]);
      }

      if (registros.length === 1) {
        map.flyTo({ center: [registros[0].lng, registros[0].lat], zoom: 15 });
      } else {
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 600 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [registros, selectedId, detalleHref]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
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
