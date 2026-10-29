"use client";

import { useEffect, useState } from "react";
import { reverseGeocodeMapbox } from "@/lib/mapbox-geocode";

type Props = {
  lat: number;
  lng: number;
};

export function RegistroDifusionDireccion({ lat, lng }: Props) {
  const [direccion, setDireccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDireccion(null);
    setError(null);
    void reverseGeocodeMapbox(lng, lat)
      .then((texto) => {
        if (!cancelled) setDireccion(texto.trim() || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo obtener la dirección");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (error) {
    return (
      <p className="text-sm text-ink-secondary">
        Ubicación:{" "}
        <span className="font-mono text-xs text-ink">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
      </p>
    );
  }

  if (!direccion) {
    return <p className="text-sm text-ink-secondary">Obteniendo dirección del pin…</p>;
  }

  return (
    <p className="text-sm text-ink-secondary">
      Dirección: <strong className="text-ink">{direccion}</strong>
    </p>
  );
}
