"use client";

import { useState } from "react";
import { ImageUploadStandalone } from "@/components/ImageUploadStandalone";
import { apiFetch } from "@/lib/api";
import type { EstatusServicioUrbano, ReporteServicioUrbanoDTO } from "@/lib/servicios-urbanos";

type Props = {
  reporte: ReporteServicioUrbanoDTO;
  onUpdated: () => void | Promise<void>;
  compact?: boolean;
};

export function ReporteEstatusStaffActions({ reporte, onUpdated, compact = false }: Props) {
  const [saving, setSaving] = useState<EstatusServicioUrbano | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalAtender, setModalAtender] = useState(false);
  const [fotoAtencionUrl, setFotoAtencionUrl] = useState(reporte.fotoAtencionUrl ?? "");

  async function cambiarEstatus(
    estatus: EstatusServicioUrbano,
    foto?: string,
  ) {
    setSaving(estatus);
    setError(null);
    try {
      const body: { estatus: EstatusServicioUrbano; fotoAtencionUrl?: string } = { estatus };
      if (estatus === "ATENDIDO") {
        body.fotoAtencionUrl = foto?.trim() ?? "";
      }
      const res = await apiFetch(`/api/servicios-urbanos/${reporte.id}/estatus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string; detalles?: string[] };
        throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al actualizar estatus");
      }
      setModalAtender(false);
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar estatus");
    } finally {
      setSaving(null);
    }
  }

  const puedeRecibir = reporte.estatus === "ENVIADO";
  const puedeAtender = reporte.estatus === "ENVIADO" || reporte.estatus === "RECIBIDO";

  if (!puedeRecibir && !puedeAtender) {
    return null;
  }

  return (
    <>
      <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap items-center gap-3"}>
        {puedeRecibir ? (
          <button
            type="button"
            className={compact ? "btn-secondary btn-sm" : "btn-secondary btn-responsive"}
            disabled={saving != null}
            onClick={() => void cambiarEstatus("RECIBIDO")}
          >
            {saving === "RECIBIDO" ? "Guardando…" : "Marcar recibido"}
          </button>
        ) : null}
        {puedeAtender ? (
          <button
            type="button"
            className={compact ? "btn-primary btn-sm" : "btn-primary btn-responsive"}
            disabled={saving != null}
            onClick={() => {
              setFotoAtencionUrl(reporte.fotoAtencionUrl ?? "");
              setError(null);
              setModalAtender(true);
            }}
          >
            Marcar atendido
          </button>
        ) : null}
      </div>
      {!compact && error ? <div className="alert-error mt-3">{error}</div> : null}

      {modalAtender ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div
            className="card-section w-full max-w-lg space-y-4 shadow-xl"
            role="dialog"
            aria-labelledby="atender-title"
          >
            <div>
              <h3 id="atender-title" className="section-title">
                Marcar como atendido
              </h3>
              <p className="mt-1 text-sm text-ink-secondary">
                {reporte.folio} · {reporte.tipoLabel}
              </p>
            </div>
            <ImageUploadStandalone
              label="Foto de atención (obligatoria)"
              value={fotoAtencionUrl}
              onChange={setFotoAtencionUrl}
              previewAlt="Atención del servicio"
            />
            {error ? <div className="alert-error">{error}</div> : null}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="btn-ghost btn-responsive"
                disabled={saving != null}
                onClick={() => setModalAtender(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary btn-responsive"
                disabled={saving != null || !fotoAtencionUrl.trim()}
                onClick={() => void cambiarEstatus("ATENDIDO", fotoAtencionUrl)}
              >
                {saving === "ATENDIDO" ? "Guardando…" : "Confirmar atención"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
