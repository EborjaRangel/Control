"use client";

import { AxisLogo } from "@/components/AxisLogo";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type CodigoEscaneo =
  | "ASISTENCIA_TOMADA"
  | "ASISTENCIA_DUPLICADA"
  | "QR_INVALIDO"
  | "PASE_CERRADO"
  | "CLAVE_INCORRECTA";

type EventoPase = { id?: string; titulo?: string };

type RespuestaEscaneo = {
  mensaje?: string;
  error?: string;
  codigo?: CodigoEscaneo;
  dirigente?: { nombreCompleto?: string };
  evento?: EventoPase;
};

type EstadoPase = {
  abierto: boolean;
  evento: EventoPase | null;
  mensaje: string | null;
};

type Visual = "cargando" | "formulario" | "ok" | "aviso" | "error" | "cerrado";

function visualDeCodigo(codigo: CodigoEscaneo | undefined, ok: boolean): Visual {
  if (ok || codigo === "ASISTENCIA_TOMADA") return "ok";
  if (codigo === "PASE_CERRADO") return "cerrado";
  if (codigo === "ASISTENCIA_DUPLICADA") return "aviso";
  return "error";
}

function cerrarPestanaTrasLectura() {
  window.setTimeout(() => {
    try {
      window.history.replaceState(null, "", "about:blank");
    } catch {
      /* ignore */
    }
    try {
      window.open("", "_self");
      window.close();
    } catch {
      /* algunos navegadores bloquean close() */
    }
    try {
      if (!window.closed) window.location.replace("about:blank");
    } catch {
      /* ignore */
    }
  }, 3500);
}

export default function RegistrarAsistenciaClient() {
  const searchParams = useSearchParams();
  const codigoQr = searchParams.get("c")?.trim() ?? "";
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [visual, setVisual] = useState<Visual>("cargando");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [eventoTitulo, setEventoTitulo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/asistencia/pase-estado")
      .then(async (res) => (await res.json()) as EstadoPase)
      .then((data) => {
        if (cancelled) return;
        const titulo = data.evento?.titulo?.trim() || null;
        setEventoTitulo(titulo);
        if (!data.abierto) {
          setVisual("cerrado");
          setMensaje(data.mensaje ?? "No hay un pase de lista abierto");
          if (codigoQr) cerrarPestanaTrasLectura();
          return;
        }
        setVisual("formulario");
      })
      .catch(() => {
        if (cancelled) return;
        setVisual("formulario");
      });
    return () => {
      cancelled = true;
    };
  }, [codigoQr]);

  async function pasarLista(event: FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setMensaje(null);
    setDetalle(null);

    try {
      const res = await fetch("/api/asistencia/escanear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: codigoQr, clave: clave.trim() }),
      });
      const data = (await res.json()) as RespuestaEscaneo;
      const texto = data.mensaje ?? data.error ?? "El QR es inválido";
      setMensaje(texto);
      setDetalle(data.dirigente?.nombreCompleto ?? null);
      if (data.evento?.titulo) setEventoTitulo(data.evento.titulo);

      if (data.codigo === "CLAVE_INCORRECTA") {
        setVisual("formulario");
        return;
      }
      const siguiente = visualDeCodigo(data.codigo, res.ok);
      setVisual(siguiente);
      if (siguiente !== "formulario") cerrarPestanaTrasLectura();
    } catch {
      setVisual("error");
      setMensaje("El QR es inválido");
      setDetalle(null);
      cerrarPestanaTrasLectura();
    } finally {
      setEnviando(false);
    }
  }

  const caja =
    visual === "ok"
      ? "alert-success"
      : visual === "aviso" || visual === "cerrado"
        ? "alert-warning"
        : "alert-error";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-6 sm:py-12">
      <div className="card space-y-6 p-5 sm:p-8">
        <div className="space-y-3 text-center">
          <AxisLogo size={160} badge mode="idle" accent="green" className="mx-auto" />
          <h1 className="page-title">Pase de lista</h1>
          {eventoTitulo ? <p className="text-base font-semibold text-ink">{eventoTitulo}</p> : null}
          {visual === "formulario" ? (
            <p className="text-sm text-ink-secondary">Ingresa el código para registrar la asistencia</p>
          ) : null}
        </div>

        {visual === "cargando" ? (
          <div className="flex items-center justify-center gap-3 text-ink-secondary">
            <span className="size-5 animate-pulse rounded-full bg-pin-light" />
            Cargando…
          </div>
        ) : null}

        {visual === "formulario" ? (
          <form className="space-y-4" onSubmit={(event) => void pasarLista(event)}>
            {mensaje ? <div className="alert-error text-center font-semibold">{mensaje}</div> : null}

            <label className="label">
              Código
              <input
                className="input"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={clave}
                onChange={(event) => setClave(event.target.value)}
                required
              />
            </label>

            <button type="submit" className="btn-pase btn-responsive w-full" disabled={enviando}>
              {enviando ? "Registrando…" : "Pasar lista"}
            </button>
          </form>
        ) : null}

        {visual === "ok" || visual === "aviso" || visual === "error" || visual === "cerrado" ? (
          <div className="space-y-3">
            <div className={`${caja} text-center text-lg font-semibold leading-snug`}>{mensaje}</div>
            {detalle ? <p className="text-center text-sm text-ink-secondary">{detalle}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
