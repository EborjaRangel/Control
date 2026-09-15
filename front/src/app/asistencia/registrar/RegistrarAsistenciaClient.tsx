"use client";

import { AxisLogo } from "@/components/AxisLogo";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type CodigoEscaneo =
  | "ASISTENCIA_TOMADA"
  | "ASISTENCIA_DUPLICADA"
  | "QR_INVALIDO"
  | "PASE_CERRADO"
  | "CLAVE_INCORRECTA";

type RespuestaEscaneo = {
  mensaje?: string;
  error?: string;
  codigo?: CodigoEscaneo;
  dirigente?: { nombreCompleto?: string };
  evento?: { titulo?: string };
};

type Visual = "formulario" | "ok" | "aviso" | "error";

function visualDeCodigo(codigo: CodigoEscaneo | undefined, ok: boolean): Visual {
  if (ok || codigo === "ASISTENCIA_TOMADA") return "ok";
  if (codigo === "ASISTENCIA_DUPLICADA" || codigo === "PASE_CERRADO") return "aviso";
  return "error";
}

export default function RegistrarAsistenciaClient() {
  const searchParams = useSearchParams();
  const codigoQr = searchParams.get("c")?.trim() ?? "";
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [visual, setVisual] = useState<Visual>("formulario");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);

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
      setDetalle(data.dirigente?.nombreCompleto ?? data.evento?.titulo ?? null);

      if (data.codigo === "CLAVE_INCORRECTA") {
        setVisual("formulario");
        return;
      }
      setVisual(visualDeCodigo(data.codigo, res.ok));
    } catch {
      setVisual("formulario");
      setMensaje("El QR es inválido");
      setDetalle(null);
    } finally {
      setEnviando(false);
    }
  }

  const caja =
    visual === "ok"
      ? "alert-success"
      : visual === "aviso"
        ? "alert-warning"
        : "alert-error";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-6 sm:py-12">
      <div className="card space-y-6 p-5 sm:p-8">
        <div className="space-y-3 text-center">
          <AxisLogo size={160} badge className="mx-auto" />
          <h1 className="page-title">Pase de lista</h1>
          {visual === "formulario" ? (
            <p className="text-sm text-ink-secondary">Ingresa el código para registrar la asistencia</p>
          ) : null}
        </div>

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

            <button type="submit" className="btn-primary btn-responsive w-full" disabled={enviando}>
              {enviando ? "Registrando…" : "Pasar lista"}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className={`${caja} text-center text-lg font-semibold leading-snug`}>{mensaje}</div>
            {detalle ? <p className="text-center text-sm text-ink-secondary">{detalle}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
