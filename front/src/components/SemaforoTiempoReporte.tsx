"use client";

import {
  calcSemaforoTiempoReporte,
  etiquetaSemaforoTiempoReporte,
  semaforoBadgeClass,
  semaforoDescripcion,
  type SemaforoTiempoReporte,
} from "@/lib/servicios-urbanos";
import { cn } from "@/lib/cn";

type Props = {
  createdAt: string;
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
};

export function SemaforoTiempoReporte({
  createdAt,
  showLabel = true,
  compact = false,
  className,
}: Props) {
  const semaforo = calcSemaforoTiempoReporte(createdAt);
  const tiempo = etiquetaSemaforoTiempoReporte(createdAt);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        semaforoBadgeClass(semaforo),
        compact && "px-2 py-0.5",
        className,
      )}
      title={`Tiempo desde el reporte: ${tiempo} (${semaforoDescripcion(semaforo)})`}
    >
      <SemaforoDot semaforo={semaforo} />
      {showLabel ? (
        <span>
          {tiempo}
          {!compact ? ` · ${semaforoDescripcion(semaforo)}` : null}
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
    </div>
  );
}
