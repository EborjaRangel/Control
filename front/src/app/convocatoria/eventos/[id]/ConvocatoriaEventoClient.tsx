"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ConvocatoriaEventoPanel } from "@/components/ConvocatoriaEventoPanel";
import { apiFetch } from "@/lib/api";
import {
  ESTADO_EVENTO_LABEL,
  badgeEstadoEvento,
  formatFechaEvento,
  type EventoAsistenciaDTO,
} from "@/lib/asistencia";

export default function ConvocatoriaEventoClient() {
  const { id } = useParams<{ id: string }>();
  const { canManageConvocatoria } = useAuth();
  const [evento, setEvento] = useState<EventoAsistenciaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/asistencia/eventos/${id}`);
      if (!res.ok) throw new Error("No se pudo cargar el evento");
      setEvento((await res.json()) as EventoAsistenciaDTO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
      setEvento(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (canManageConvocatoria) void load();
  }, [canManageConvocatoria, load]);

  if (!canManageConvocatoria) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando evento…
      </div>
    );
  }

  if (error || !evento) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "Evento no encontrado"}</div>
        <Link href="/convocatoria" className="btn-secondary btn-responsive inline-flex">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title break-words">{evento.titulo}</h1>
            <span className={badgeEstadoEvento(evento.estado)}>
              {ESTADO_EVENTO_LABEL[evento.estado]}
            </span>
          </div>
          <p className="page-subtitle">
            {formatFechaEvento(evento.fecha)} · {evento.hora} · {evento.lugar}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">{evento.alcanceLabel}</p>
        </div>
        <Link href="/convocatoria" className="btn-ghost btn-responsive shrink-0">
          Volver
        </Link>
      </div>

      <ConvocatoriaEventoPanel
        eventoId={evento.id}
        totalElegibles={evento.totalElegibles ?? 0}
      />
    </div>
  );
}
