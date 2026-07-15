"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const { isAdmin } = useAuth();
  const [eventos, setEventos] = useState<EventoAsistenciaDTO[]>([]);
  const [filtro, setFiltro] = useState<FiltroEventosLista>("activos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    void apiFetch(urlEventos(filtro))
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los eventos");
        return (await res.json()) as EventoAsistenciaDTO[];
      })
      .then(setEventos)
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [isAdmin, filtro]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pase de asistencia</h1>
          <p className="page-subtitle">
            Captura eventos, envía convocatorias y consulta asistencias por dirigente.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/convocatoria" className="btn-secondary btn-responsive">
            Convocatoria
          </Link>
          <Link href="/asistencia/dashboard" className="btn-secondary btn-responsive">
            Dashboard
          </Link>
          <Link href="/asistencia/eventos/nuevo" className="btn-primary btn-responsive">
            + Nuevo evento
          </Link>
        </div>
      </div>

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

      {error ? <div className="alert-error">{error}</div> : null}

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
            {filtro === "activos"
              ? "Crea un evento o cambia el filtro para ver programados, abiertos o cerrados."
              : "Crea un evento para iniciar el pase de lista por colonia, sección o unidad territorial."}
          </p>
          {filtro === "activos" || filtro === "todos" ? (
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
            <Link
              href={`/asistencia/eventos/${ev.id}`}
              className="btn-primary btn-sm btn-responsive shrink-0"
            >
              {ev.estado === "ABIERTO" ? "Pase de lista" : "Ver evento"}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
