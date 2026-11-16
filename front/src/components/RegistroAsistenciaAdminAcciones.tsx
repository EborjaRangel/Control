"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Props = {
  registroId: string;
  cantidadInicial: number;
  esMovilizacion: boolean;
  compact?: boolean;
  onHecho: () => void | Promise<void>;
};

export function RegistroAsistenciaAdminAcciones({
  registroId,
  cantidadInicial,
  esMovilizacion,
  compact = false,
  onHecho,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [cantidad, setCantidad] = useState(String(cantidadInicial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardarCantidad() {
    const n = Number.parseInt(cantidad.trim(), 10);
    if (!Number.isFinite(n) || n < 1) {
      setError("Indica un número entero mayor que cero");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/asistencia/registros/${registroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: n }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo guardar");
      setEditando(false);
      await onHecho();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function eliminar() {
    if (
      !confirm(
        "¿Eliminar este escaneo? El total del dirigente en el evento se actualizará en la base de datos.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/asistencia/registros/${registroId}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo eliminar");
      await onHecho();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (editando && esMovilizacion) {
    return (
      <div className={compact ? "space-y-1" : "mt-2 space-y-1"}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            className="input w-24 text-sm"
            value={cantidad}
            disabled={busy}
            onChange={(e) => setCantidad(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={busy}
            onClick={() => void guardarCantidad()}
          >
            Guardar
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={busy}
            onClick={() => {
              setEditando(false);
              setCantidad(String(cantidadInicial));
              setError(null);
            }}
          >
            Cancelar
          </button>
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1" : "mt-2 space-y-1"}>
      <div className="flex flex-wrap gap-2">
        {esMovilizacion ? (
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={busy}
            onClick={() => setEditando(true)}
          >
            Cambiar personas
          </button>
        ) : null}
        <button
          type="button"
          className="btn-danger btn-sm"
          disabled={busy}
          onClick={() => void eliminar()}
        >
          {busy ? "…" : "Eliminar escaneo"}
        </button>
      </div>
      {!editando && error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}