"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { NotificacionesAdminPanel } from "@/components/NotificacionesAdminPanel";
import { apiFetch } from "@/lib/api";
import {
  ESTADO_EVENTO_LABEL,
  badgeEstadoEvento,
  formatFechaEvento,
  type EventoAsistenciaDTO,
} from "@/lib/asistencia";
import type { ConvocatoriaEstado } from "@/lib/convocatoria";

export default function ConvocatoriaPage() {
  const { canManageConvocatoria, isStaff } = useAuth();
  const [eventos, setEventos] = useState<EventoAsistenciaDTO[]>([]);
  const [config, setConfig] = useState<ConvocatoriaEstado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManageConvocatoria) return;
    setLoading(true);
    Promise.all([
      apiFetch("/api/asistencia/eventos?activos=true").then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar eventos");
        return (await res.json()) as EventoAsistenciaDTO[];
      }),
      apiFetch("/api/convocatoria/estado").then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar configuración");
        return (await res.json()) as ConvocatoriaEstado;
      }),
    ])
      .then(([ev, cfg]) => {
        setEventos(ev);
        setConfig(cfg);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [canManageConvocatoria]);

  if (!canManageConvocatoria) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Convocatoria</h1>
          <p className="page-subtitle">
            Captura un mensaje y envíalo por correo, SMS, WhatsApp o notificaciones in-app.
          </p>
        </div>
        {isStaff ? (
          <Link href="/asistencia" className="btn-ghost btn-responsive">
            Volver a asistencia
          </Link>
        ) : null}
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {config ? (
        <div className="card space-y-3">
          <h2 className="section-title">Canales de envío</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <li className="panel-soft">
              <span className="font-medium">Notificaciones in-app: </span>
              {config.notificaciones ? (
                <span className="text-success-text">Siempre disponible</span>
              ) : (
                <span className="text-ink-secondary">No disponible</span>
              )}
            </li>
            <li className="panel-soft">
              <span className="font-medium">Correo electrónico: </span>
              {config.email ? (
                <span className="text-success-text">Configurado</span>
              ) : (
                <span className="text-ink-secondary">Sin configurar</span>
              )}
            </li>
            <li className="panel-soft">
              <span className="font-medium">SMS: </span>
              {config.sms ? (
                <span className="text-success-text">Configurado</span>
              ) : (
                <span className="text-ink-secondary">Sin configurar</span>
              )}
            </li>
            <li className="panel-soft">
              <span className="font-medium">WhatsApp: </span>
              {config.whatsapp ? (
                <span className="text-success-text">Configurado</span>
              ) : (
                <span className="text-ink-secondary">Sin configurar</span>
              )}
            </li>
          </ul>
          {config.listo ? (
            <p className="text-sm text-success-text">Servidor listo para envíos reales.</p>
          ) : (
            <p className="text-sm text-ink-secondary">
              Completa las variables en <code className="text-xs">back/.env</code> para habilitar
              correo, SMS y WhatsApp: {config.faltantes.join(", ")}
            </p>
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando…
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="section-title">Eventos activos</h2>
        {eventos.length === 0 && !loading ? (
          <div className="card py-10 text-center text-sm text-ink-secondary">
            No hay eventos activos para convocar.
          </div>
        ) : null}
        {eventos.map((ev) => (
          <article
            key={ev.id}
            className="card-hover flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-ink">{ev.titulo}</h3>
                <span className={badgeEstadoEvento(ev.estado)}>{ESTADO_EVENTO_LABEL[ev.estado]}</span>
              </div>
              <p className="mt-1 text-sm text-ink-secondary">
                {formatFechaEvento(ev.fecha)} · {ev.hora} · {ev.lugar}
              </p>
              <p className="text-sm text-ink-secondary">{ev.alcanceLabel}</p>
            </div>
            <Link
              href={`/convocatoria/eventos/${ev.id}`}
              className="btn-primary btn-sm btn-responsive shrink-0"
            >
              Redactar convocatoria
            </Link>
          </article>
        ))}
      </section>

      {isStaff ? <NotificacionesAdminPanel /> : null}
    </div>
  );
}
