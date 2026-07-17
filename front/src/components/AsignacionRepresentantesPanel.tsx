"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { etiquetaSeccion } from "@/lib/secciones-electorales";

export type RepresentanteAsignacionDTO = {
  id: string;
  nombreCompleto: string;
  seccionElectoral: string;
  colonia: string;
  capturado: boolean;
  validado: boolean;
  operador: {
    tipo: "RC" | "RG";
    id: string;
    nombreCompleto: string;
    colonia?: string;
    distritoLocal?: number | null;
  } | null;
  asignable: boolean;
  motivoNoAsignable: string | null;
};

type Props = {
  seccionElectoral: string;
  onAsignado?: () => void;
};

export function AsignacionRepresentantesPanel({ seccionElectoral, onAsignado }: Props) {
  const [representantes, setRepresentantes] = useState<RepresentanteAsignacionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [accionando, setAccionando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/electoral/asignacion/representantes?seccion=${encodeURIComponent(seccionElectoral)}`,
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "No se pudieron cargar representantes");
      }
      const data = (await res.json()) as { representantes: RepresentanteAsignacionDTO[] };
      setRepresentantes(data.representantes);
      setSeleccionados(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
      setRepresentantes([]);
    } finally {
      setLoading(false);
    }
  }, [seccionElectoral]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string, asignable: boolean) {
    if (!asignable) return;
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function validar(id: string) {
    setAccionando(true);
    setMensaje(null);
    try {
      const res = await apiFetch(`/api/electoral/asignacion/representantes/${id}/validado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validado: true }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo validar");
      setMensaje("Representante validado.");
      await load();
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error al validar");
    } finally {
      setAccionando(false);
    }
  }

  async function asignar() {
    if (seleccionados.size === 0) return;
    setAccionando(true);
    setMensaje(null);
    try {
      const res = await apiFetch("/api/electoral/asignacion/representantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seccionElectoral,
          representanteIds: [...seleccionados],
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        asignados?: number;
        total?: number;
        resultados?: Array<{ id: string; ok: boolean; error?: string }>;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo asignar");
      const fallos = (data.resultados ?? []).filter((r) => !r.ok);
      if (fallos.length > 0) {
        setMensaje(
          `Asignados ${data.asignados ?? 0} de ${data.total ?? seleccionados.size}. ${fallos[0]?.error ?? ""}`,
        );
      } else {
        setMensaje(
          `Sección ${etiquetaSeccion(seccionElectoral)} asignada a ${data.asignados ?? seleccionados.size} representante(s).`,
        );
      }
      await load();
      onAsignado?.();
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error al asignar");
    } finally {
      setAccionando(false);
    }
  }

  const validados = representantes.filter((r) => r.validado);
  const pendientes = representantes.filter((r) => r.capturado && !r.validado);

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <div>
        <h3 className="text-sm font-bold text-ink">Asignar a representantes</h3>
        <p className="mt-1 text-xs text-ink-secondary">
          Sección fijada: {etiquetaSeccion(seccionElectoral)}. Elige representantes capturados y
          validados compatibles con esta sección.
        </p>
      </div>

      {error ? <div className="alert-error text-sm">{error}</div> : null}
      {mensaje ? (
        <div
          className={
            mensaje.toLowerCase().includes("error") || mensaje.includes("No ")
              ? "alert-error text-sm"
              : "panel-pin text-sm font-medium text-pin-dark"
          }
        >
          {mensaje}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-ink-secondary">Cargando representantes…</p>
      ) : representantes.length === 0 ? (
        <p className="text-sm text-ink-secondary">No hay representantes activos registrados.</p>
      ) : (
        <>
          {validados.length > 0 ? (
            <ul className="max-h-64 space-y-2 overflow-auto">
              {validados.map((r) => (
                <li key={r.id} className="list-card text-sm">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={seleccionados.has(r.id)}
                      disabled={!r.asignable || accionando}
                      onChange={() => toggle(r.id, r.asignable)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-ink">{r.nombreCompleto}</span>
                      <span className="mt-0.5 block text-xs text-ink-secondary">
                        Sección actual: {etiquetaSeccion(r.seccionElectoral)} · {r.colonia}
                      </span>
                      {r.operador ? (
                        <span className="mt-0.5 block text-xs text-ink-secondary">
                          {r.operador.tipo === "RC" ? "Rep. Casilla" : "Rep. General"}:{" "}
                          {r.operador.nombreCompleto}
                        </span>
                      ) : null}
                      {!r.asignable && r.motivoNoAsignable ? (
                        <span className="mt-1 block text-xs text-warning-text">{r.motivoNoAsignable}</span>
                      ) : null}
                    </span>
                    <span className="badge-pin shrink-0 text-[10px]">Validado</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-secondary">No hay representantes validados aún.</p>
          )}

          {pendientes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink-secondary">Pendientes de validar</p>
              <ul className="space-y-2">
                {pendientes.map((r) => (
                  <li
                    key={r.id}
                    className="panel-soft flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{r.nombreCompleto}</p>
                      <p className="text-xs text-ink-secondary">{r.colonia}</p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={accionando}
                      onClick={() => void validar(r.id)}
                    >
                      Validar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={accionando || seleccionados.size === 0}
              onClick={() => void asignar()}
            >
              {accionando ? "Asignando…" : `Asignar sección (${seleccionados.size})`}
            </button>
            <Link href="/rc" className="btn-ghost btn-sm">
              Ver representantes
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
