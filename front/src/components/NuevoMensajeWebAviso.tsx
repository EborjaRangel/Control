"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BellIcon } from "@/components/BellIcon";
import { apiFetch } from "@/lib/api";
import {
  emitirNuevoMensajeWeb,
  emitirResumenNotificaciones,
} from "@/lib/notificaciones";
import { APP_BRAND_FULL } from "@/lib/site";

type Aviso = {
  body: string;
  url: string;
};

export function NuevoMensajeWebAviso() {
  const { user, loading } = useAuth();
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const actualizarResumen = useCallback(async () => {
    try {
      const res = await apiFetch("/api/notificaciones/resumen");
      if (res.ok) {
        const data = (await res.json()) as { noLeidas: number };
        emitirResumenNotificaciones(data.noLeidas);
        return;
      }
    } catch {
      // ignore
    }
    emitirResumenNotificaciones(0);
  }, []);

  const mostrarAviso = useCallback(
    (detail: { body?: string; url?: string }) => {
      const body =
        typeof detail.body === "string" && detail.body.trim().length > 0
          ? detail.body.trim()
          : `Tienes un nuevo mensaje en ${APP_BRAND_FULL}.`;
      const url =
        typeof detail.url === "string" && detail.url.startsWith("/")
          ? detail.url
          : "/notificaciones";
      setAviso({ body, url });
      void actualizarResumen();
      emitirNuevoMensajeWeb({ body, url });
    },
    [actualizarResumen],
  );

  useEffect(() => {
    if (loading || !user) {
      setAviso(null);
      return;
    }

    function onSwMessage(event: MessageEvent) {
      const data = event.data as { type?: string; body?: string; url?: string } | null;
      if (!data || data.type !== "control:nuevo-mensaje-web") return;
      mostrarAviso(data);
    }

    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onSwMessage);
  }, [user, loading, mostrarAviso]);

  if (!aviso) return null;

  return (
    <div
      className="fixed inset-x-0 top-[calc(var(--navbar-h,3.5rem)+env(safe-area-inset-top))] z-[45] px-3 sm:px-4"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-3xl items-start gap-3 rounded-pin border border-notif/40 bg-panel p-3 shadow-lg ring-1 ring-notif/20">
        <BellIcon className="mt-0.5 size-5 shrink-0 text-notif" filled />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-notif">
            Nuevo mensaje en {APP_BRAND_FULL}
          </p>
          <p className="mt-0.5 line-clamp-3 text-ink-secondary">{aviso.body}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={aviso.url} className="btn-primary text-xs sm:text-sm" onClick={() => setAviso(null)}>
              Ver en Notificaciones
            </Link>
            <button
              type="button"
              className="btn-secondary text-xs sm:text-sm"
              onClick={() => setAviso(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
