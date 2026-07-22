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
  const [anotacionAtencion, setAnotacionAtencion] = useState(reporte.anotacionAtencion ?? "");

  async function cambiarEstatus(
    estatus: EstatusServicioUrbano,
    payload?: { foto: string; anotacion: string },
  ) {
    setSaving(estatus);
    setError(null);
    try {
      const body: {
        estatus: EstatusServicioUrbano;
        fotoAtencionUrl?: string;
        anotacionAtencion?: string | null;
      } = { estatus };

      if (estatus === "ATENDIDO") {
        body.fotoAtencionUrl = payload?.foto.trim() ?? "";
        body.anotacionAtencion = payload?.anotacion.trim() || null;
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
              setAnotacionAtencion(reporte.anotacionAtencion ?? "");
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
        <div className="modal-backdrop" role="presentation" onClick={() => setModalAtender(false)}>
          <div
            className="modal-panel max-w-lg"
            role="dialog"
            aria-labelledby="atender-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 id="atender-title" className="section-title">
                Marcar como atendido
              </h3>
              <p className="mt-1 text-sm text-ink-secondary">
                {reporte.folio} · {reporte.tipoLabel}
              </p>
            </div>
            <div className="space-y-4">
            <ImageUploadStandalone
              label="Foto de cómo quedó (obligatoria)"
              value={fotoAtencionUrl}
              onChange={setFotoAtencionUrl}
              previewAlt="Resultado del servicio"
            />
            <label className="label">
              Anotación (opcional)
              <textarea
                className="input min-h-[96px] resize-y"
                value={anotacionAtencion}
                onChange={(e) => setAnotacionAtencion(e.target.value)}
                placeholder="Observaciones sobre la atención del servicio…"
                maxLength={2000}
              />
            </label>
            {error ? <div className="alert-error">{error}</div> : null}
            <div className="flex flex-wrap justify-end gap-3 pt-2">
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
                onClick={() =>
                  void cambiarEstatus("ATENDIDO", {
                    foto: fotoAtencionUrl,
                    anotacion: anotacionAtencion,
                  })
                }
              >
                {saving === "ATENDIDO" ? "Guardando…" : "Confirmar atención"}
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
