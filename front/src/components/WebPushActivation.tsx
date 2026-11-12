"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { pushWebSoportado, suscribirPushWeb, type PushWebEstado } from "@/lib/web-push";

const STORAGE_KEY = "control-push-prompt-dismissed";

export function WebPushActivation() {
  const { user, loading } = useAuth();
  const [estado, setEstado] = useState<PushWebEstado | "idle">("idle");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user || !pushWebSoportado()) {
      setVisible(false);
      return;
    }
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      void suscribirPushWeb().then((s) => setEstado(s));
      return;
    }
    if (Notification.permission === "denied") {
      setEstado("denied");
      return;
    }
    if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    const t = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(t);
  }, [user, loading]);

  const activar = useCallback(async () => {
    setBusy(true);
    try {
      const s = await suscribirPushWeb();
      setEstado(s);
      if (s === "active") setVisible(false);
    } finally {
      setBusy(false);
    }
  }, []);

  if (!visible || estado === "active") return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-pin border border-pin-medium bg-panel shadow-lg sm:left-auto sm:right-6"
      role="dialog"
      aria-label="Activar avisos en el celular"
    >
      <div className="p-4 text-sm">
        <p className="font-semibold text-pin-dark">Avisos en tu celular</p>
        <p className="mt-1 text-ink-secondary">
          Te avisamos en el teléfono y dentro de Control AXIS cuando llegue un mensaje nuevo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={busy}
            onClick={() => void activar()}
          >
            {busy ? "Activando…" : "Activar"}
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => {
              sessionStorage.setItem(STORAGE_KEY, "1");
              setVisible(false);
            }}
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
