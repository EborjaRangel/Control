"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { pushWebSoportado, suscribirPushWeb, type PushWebEstado } from "@/lib/web-push";

export function WebPushAvisosEnCelular() {
  const [estado, setEstado] = useState<PushWebEstado | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [prueba, setPrueba] = useState<string | null>(null);

  useEffect(() => {
    if (!pushWebSoportado()) {
      setEstado("unsupported");
      return;
    }
    if (typeof Notification === "undefined") {
      setEstado("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setEstado("denied");
      return;
    }
    if (Notification.permission === "granted") {
      void suscribirPushWeb().then(setEstado);
      return;
    }
    setEstado("off");
  }, []);

  const activar = useCallback(async () => {
    setBusy(true);
    try {
      setEstado(await suscribirPushWeb());
    } finally {
      setBusy(false);
    }
  }, []);

  const probarPush = useCallback(async () => {
    setPrueba(null);
    setBusy(true);
    try {
      const res = await apiFetch("/api/push-web/probar", { method: "POST" });
      const data = (await res.json()) as {
        enviados?: number;
        omitidos?: number;
        error?: string;
      };
      if (!res.ok) {
        setPrueba(data.error ?? "No se pudo enviar la prueba");
        return;
      }
      if ((data.enviados ?? 0) > 0) {
        setPrueba("Push de prueba enviado. Revisa la notificación del sistema.");
      } else {
        setPrueba(
          "No hay suscripción en este dispositivo. Pulsa Activar avisos y vuelve a probar.",
        );
      }
    } catch {
      setPrueba("Error de red al enviar la prueba");
    } finally {
      setBusy(false);
    }
  }, []);

  if (estado === "loading" || estado === "unsupported") return null;

  if (estado === "active") {
    return (
      <section className="card border-pin-medium/60 bg-pin-light/30 p-4 text-sm">
        <p className="font-semibold text-pin-dark">Avisos en celular: activos</p>
        <p className="mt-1 text-ink-secondary">
          Este dispositivo recibirá push de Control AXIS cuando te incluyan en el alcance (celular en
          ficha de dirigente).
        </p>
        <button
          type="button"
          className="btn-secondary mt-3 text-sm"
          disabled={busy}
          onClick={() => void probarPush()}
        >
          {busy ? "Enviando…" : "Enviar push de prueba"}
        </button>
        {prueba ? <p className="mt-2 text-ink-secondary">{prueba}</p> : null}
      </section>
    );
  }

  return (
    <section className="card border-pin-medium/60 bg-pin-light/30 p-4 text-sm">
      <p className="font-semibold text-pin-dark">Avisos en la pantalla del celular</p>
      {estado === "denied" ? (
        <p className="mt-1 text-ink-secondary">
          Los avisos están bloqueados en el navegador. Actívalos en ajustes del sitio (icono del
          candado o de la página) para recibir cada notificación web aquí.
        </p>
      ) : (
        <>
          <p className="mt-1 text-ink-secondary">
            Activa una vez en el teléfono donde usas Control con tu usuario (el mismo que está ligado
            al dirigente y su celular en ficha). En iPhone, Safari → Agregar a pantalla de inicio.
          </p>
          <button
            type="button"
            className="btn-primary mt-3 text-sm"
            disabled={busy}
            onClick={() => void activar()}
          >
            {busy ? "Activando…" : "Activar avisos en celular"}
          </button>
        </>
      )}
    </section>
  );
}
