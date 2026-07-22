"use client";

import type { ReactNode } from "react";
import {
  calcSemaforoTiempoReporte,
  etiquetaSemaforoTiempoReporte,
  semaforoBadgeClass,
  semaforoCongelado,
  semaforoDescripcion,
  type EstatusServicioUrbano,
  type SemaforoTiempoInput,
  type SemaforoTiempoReporte,
} from "@/lib/servicios-urbanos";
import { cn } from "@/lib/cn";

type Props = SemaforoTiempoInput & {
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
};

export function SemaforoTiempoReporte({
  createdAt,
  estatus,
  atendidoAt,
  showLabel = true,
  compact = false,
  className,
}: Props) {
  const input: SemaforoTiempoInput = { createdAt, estatus, atendidoAt };
  const semaforo = calcSemaforoTiempoReporte(input);
  const tiempo = etiquetaSemaforoTiempoReporte(input);
  const congelado = semaforoCongelado(input);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        semaforoBadgeClass(semaforo),
        compact && "px-2 py-0.5",
        className,
      )}
      title={
        congelado
          ? `Tiempo al atender: ${tiempo.replace(" · atendido", "")} (${semaforoDescripcion(semaforo)})`
          : `Tiempo desde el reporte: ${tiempo} (${semaforoDescripcion(semaforo)})`
      }
    >
      <SemaforoDot semaforo={semaforo} />
      {showLabel ? (
        <span>
          {tiempo}
          {!compact && !congelado ? ` · ${semaforoDescripcion(semaforo)}` : null}
        </span>
      ) : null}
    </span>
  );
}

export function SemaforoDot({ semaforo }: { semaforo: SemaforoTiempoReporte }) {
  const color =
    semaforo === "verde" ? "bg-success-text" : semaforo === "amarillo" ? "bg-warning-text" : "bg-error-text";
  return <span className={cn("size-2.5 shrink-0 rounded-full", color)} aria-hidden />;
}

export function SemaforoLeyenda() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-ink-secondary">
      <span className="inline-flex items-center gap-1.5">
        <SemaforoDot semaforo="verde" /> 0–24 h
      </span>
      <span className="inline-flex items-center gap-1.5">
        <SemaforoDot semaforo="amarillo" /> 24 h 1 min – 96 h
      </span>
      <span className="inline-flex items-center gap-1.5">
        <SemaforoDot semaforo="rojo" /> Más de 96 h
      </span>
      <span className="text-ink-muted">· Al atender, el tiempo queda congelado</span>
    </div>
  );
}

export function semaforoInputFromReporte(reporte: {
  createdAt: string;
  estatus: EstatusServicioUrbano;
  atendidoAt: string | null;
}): SemaforoTiempoInput {
  return {
    createdAt: reporte.createdAt,
    estatus: reporte.estatus,
    atendidoAt: reporte.atendidoAt,
  };
}
