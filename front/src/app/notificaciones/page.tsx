"use client";

import { useCallback, useEffect, useState } from "react";
import { BellIcon } from "@/components/BellIcon";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  formatFechaNotificacion,
  formatRelativaNotificacion,
  type NotificacionUsuarioDTO,
} from "@/lib/notificaciones";

export default function NotificacionesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificacionUsuarioDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/notificaciones/mias");
      if (!res.ok) throw new Error("No se pudieron cargar las notificaciones");
      setItems((await res.json()) as NotificacionUsuarioDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function marcarVista(id: string) {
    setMarcando(id);
    try {
      const res = await apiFetch(`/api/notificaciones/${id}/visto`, { method: "POST" });
      if (!res.ok) throw new Error("No se pudo marcar como vista");
      const updated = (await res.json()) as NotificacionUsuarioDTO;
      setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setMarcando(null);
    }
  }

  const noLeidas = items.filter((n) => !n.leida).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2 text-notif">
            <BellIcon className="size-6 sm:size-7" filled />
            Notificaciones
          </h1>
          <p className="page-subtitle text-sm">
            {loading
              ? "Cargando…"
              : noLeidas > 0
                ? `${noLeidas} sin leer`
                : items.length > 0
                  ? "Estás al día"
                  : "No tienes notificaciones"}
          </p>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          <span className="size-4 animate-pulse rounded-full bg-pin-light" />
          Cargando notificaciones…
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="card py-8 text-center text-sm text-ink-secondary">
          No hay notificaciones para tu cuenta.
        </div>
      ) : null}

      <ul className="notif-list">
        {items.map((n) => (
          <li
            key={n.id}
            className={cn("notif-item", n.leida ? "opacity-90" : "notif-item-unread")}
          >
            <div className="notif-item-head">
              {!n.leida ? (
                <span className="badge-notif-compact">Nueva</span>
              ) : (
                <span className="badge-vista-compact">Revisada</span>
              )}
              <p className="notif-meta">
                <span title={formatFechaNotificacion(n.enviadoAt)}>
                  Enviada {formatRelativaNotificacion(n.enviadoAt)}
                </span>
                <span className="notif-meta-sep"> · </span>
                <span>{n.alcanceLabel}</span>
                {n.vistoAt ? (
                  <>
                    <span className="notif-meta-sep"> · </span>
                    <span className="text-pin-dark" title={formatFechaNotificacion(n.vistoAt)}>
                      Revisada {formatRelativaNotificacion(n.vistoAt)}
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            <p className="notif-mensaje">{n.mensaje}</p>

            {!n.leida ? (
              <div className="notif-item-foot">
                <button
                  type="button"
                  className="btn-vista-compact"
                  disabled={marcando === n.id}
                  onClick={() => void marcarVista(n.id)}
                >
                  {marcando === n.id ? "Guardando…" : "Marcar como vista"}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
