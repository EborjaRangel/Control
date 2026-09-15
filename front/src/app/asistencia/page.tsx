"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import {
  ESTADO_EVENTO_LABEL,
  badgeEstadoEvento,
  formatFechaEvento,
  type EventoAsistenciaDTO,
  type FiltroEventosLista,
} from "@/lib/asistencia";

const FILTRO_EVENTOS_LABEL: Record<FiltroEventosLista, string> = {
  activos: "Activos (programados y pase abierto)",
  todos: "Todos",
  cerrados: "Cerrados",
};

function urlEventos(filtro: FiltroEventosLista): string {
  if (filtro === "activos") return "/api/asistencia/eventos?activos=true";
  if (filtro === "cerrados") return "/api/asistencia/eventos?cerrados=true";
  return "/api/asistencia/eventos";
}

export default function AsistenciaPage() {
  const { canTakeAsistencia, isStaff, isAsistencia } = useAuth();
  const [eventos, setEventos] = useState<EventoAsistenciaDTO[]>([]);
  const [filtro, setFiltro] = useState<FiltroEventosLista>("activos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionandoId, setAccionandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canTakeAsistencia) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(urlEventos(isAsistencia ? "activos" : filtro));
      if (!res.ok) throw new Error("No se pudieron cargar los eventos");
      setEventos((await res.json()) as EventoAsistenciaDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [canTakeAsistencia, filtro, isAsistencia]);

  useEffect(() => {
    void load();
  }, [load]);

  async function abrirPase(eventoId: string) {
    setAccionandoId(eventoId);
    setMensaje(null);
    try {
      const res = await apiFetch(`/api/asistencia/eventos/${eventoId}/abrir`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo iniciar el pase");
      setMensaje("Pase de lista abierto.");
      await load();
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error");
    } finally {
      setAccionandoId(null);
    }
  }

  async function cerrarPase(eventoId: string) {
    if (!confirm("¿Cerrar el evento? Ya no se podrán registrar más asistencias.")) return;
    setAccionandoId(eventoId);
    setMensaje(null);
    try {
      const res = await apiFetch(`/api/asistencia/eventos/${eventoId}/cerrar`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo cerrar el evento");
      setMensaje("Evento cerrado.");
      await load();
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error");
    } finally {
      setAccionandoId(null);
    }
  }

  if (!canTakeAsistencia) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pase de asistencia</h1>
          <p className="page-subtitle">
            {isAsistencia
              ? "Selecciona un evento activo para registrar asistencias con QR."
              : "Captura eventos y consulta asistencias por dirigente."}
          </p>
        </div>
        {isStaff ? (
          <div className="page-actions">
            <Link href="/asistencia/dashboard" className="btn-secondary btn-responsive">
              Dashboard
            </Link>
            <Link href="/asistencia/eventos/nuevo" className="btn-primary btn-responsive">
              + Nuevo evento
            </Link>
          </div>
        ) : null}
      </div>

      {isStaff ? (
        <div className="card">
          <label className="block">
            <span className="label">Ver eventos</span>
            <select
              className="input mt-1 max-w-md"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as FiltroEventosLista)}
            >
              {(Object.keys(FILTRO_EVENTOS_LABEL) as FiltroEventosLista[]).map((key) => (
                <option key={key} value={key}>
                  {FILTRO_EVENTOS_LABEL[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {error ? <div className="alert-error">{error}</div> : null}
      {mensaje ? (
        <div
          className={
            mensaje.toLowerCase().includes("error") || mensaje.startsWith("No ")
              ? "alert-error"
              : "alert-success"
          }
        >
          {mensaje}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando eventos…
        </div>
      ) : null}

      {!loading && eventos.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="font-semibold text-ink">
            {filtro === "activos"
              ? "No hay eventos activos"
              : filtro === "cerrados"
                ? "No hay eventos cerrados"
                : "No hay eventos capturados"}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {isAsistencia
              ? "Espera a que un administrador abra el pase de lista o crea un evento nuevo."
              : filtro === "activos"
                ? "Crea un evento o cambia el filtro para ver programados, abiertos o cerrados."
                : "Crea un evento para iniciar el pase de lista por colonia, sección o unidad territorial."}
          </p>
          {isStaff && (filtro === "activos" || filtro === "todos") ? (
            <Link href="/asistencia/eventos/nuevo" className="btn-primary mt-6 inline-flex">
              Crear evento
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {eventos.map((ev) => (
          <article
            key={ev.id}
            className="card-hover flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-ink">{ev.titulo}</h2>
                <span className={badgeEstadoEvento(ev.estado)}>{ESTADO_EVENTO_LABEL[ev.estado]}</span>
              </div>
              <p className="mt-1 text-sm text-ink-secondary">
                {formatFechaEvento(ev.fecha)} · {ev.hora} · {ev.lugar}
              </p>
              <p className="mt-1 text-sm text-ink-secondary">{ev.alcanceLabel}</p>
              <p className="mt-2 text-xs text-ink-secondary">
                Asistencias: {ev.totalAsistencias ?? 0}
                {ev.totalElegibles != null ? ` / ${ev.totalElegibles} elegibles` : ""}
                {ev.totalFaltas != null ? ` · Faltas: ${ev.totalFaltas}` : ""}
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              {isStaff && ev.estado === "PROGRAMADO" ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm btn-responsive"
                  disabled={accionandoId === ev.id}
                  onClick={() => void abrirPase(ev.id)}
                >
                  {accionandoId === ev.id ? "Iniciando…" : "Iniciar pase"}
                </button>
              ) : null}
              {isStaff && ev.estado === "ABIERTO" ? (
                <button
                  type="button"
                  className="btn-danger btn-sm btn-responsive"
                  disabled={accionandoId === ev.id}
                  onClick={() => void cerrarPase(ev.id)}
                >
                  {accionandoId === ev.id ? "Cerrando…" : "Cerrar evento"}
                </button>
              ) : null}
              <Link
                href={`/asistencia/eventos/${ev.id}`}
                className="btn-primary btn-sm btn-responsive"
              >
                {ev.estado === "ABIERTO" ? "Pase de lista" : "Ver evento"}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
