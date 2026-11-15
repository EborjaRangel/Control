"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  tituloEvento?: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (codigoCierre: string) => void | Promise<void>;
};

export function CerrarEventoAsistenciaModal({
  open,
  tituloEvento,
  busy = false,
  error,
  onClose,
  onConfirm,
}: Props) {
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    if (!open) setCodigo("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !busy && onClose()}>
      <div
        className="modal-panel max-w-md"
        role="dialog"
        aria-labelledby="cerrar-evento-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="cerrar-evento-title" className="section-title text-danger">
          Cerrar evento
        </h3>
        {tituloEvento ? (
          <p className="mt-1 text-sm font-medium text-ink">{tituloEvento}</p>
        ) : null}
        <p className="mt-3 text-sm text-ink-secondary">
          Solo el developer puede autorizar el cierre con el código. Ingresa el código en el campo
          para cerrar definitivamente este evento; ya no se podrán registrar más escaneos.
        </p>
        <label className="label mt-4 block">
          Código de cierre
          <input
            type="password"
            className="input mt-1"
            value={codigo}
            autoComplete="off"
            inputMode="numeric"
            disabled={busy}
            placeholder="Código proporcionado por el developer"
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && codigo.trim() && !busy) {
                void onConfirm(codigo.trim());
              }
            }}
          />
        </label>
        {error ? <div className="alert-error mt-3 text-sm">{error}</div> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost btn-responsive" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger btn-responsive"
            disabled={busy || !codigo.trim()}
            onClick={() => void onConfirm(codigo.trim())}
          >
            {busy ? "Cerrando…" : "Cerrar evento"}
          </button>
        </div>
      </div>
    </div>
  );
}