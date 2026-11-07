"use client";

import { AxisLogo } from "@/components/AxisLogo";
import { codigoQrDesdeTextoQr } from "@/lib/qr";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type ModoPase = "asistencia" | "material";

type CodigoEscaneoAsistencia =
  | "ASISTENCIA_TOMADA"
  | "MOVILIZACION_REGISTRADA"
  | "ASISTENCIA_DUPLICADA"
  | "CANTIDAD_INVALIDA"
  | "QR_INVALIDO"
  | "PASE_CERRADO"
  | "CLAVE_INCORRECTA"
  | "DIRIGENTE_NO_ELEGIBLE";

type CodigoEscaneoMaterial =
  | "MATERIAL_ENTREGADO"
  | "MATERIAL_DUPLICADO"
  | "QR_INVALIDO"
  | "ENTREGA_CERRADA"
  | "CLAVE_INCORRECTA"
  | "NO_CONVOCADO";

type EventoPase = { id?: string; titulo?: string; tipoOperacion?: "PASE_LISTA" | "MOVILIZACION" };

type RespuestaEscaneo = {
  mensaje?: string;
  error?: string;
  codigo?: CodigoEscaneoAsistencia | CodigoEscaneoMaterial;
  cantidad?: number;
  totalMovilizados?: number;
  dirigente?: { id?: string; nombreCompleto?: string; numeroFicha?: number | null };
  evento?: EventoPase;
};

type EstadoPase = {
  abierto: boolean;
  evento: EventoPase | null;
  mensaje: string | null;
};

type Visual = "cargando" | "formulario" | "ok" | "aviso" | "error" | "cerrado";

function visualDeCodigo(modo: ModoPase, codigo: string | undefined, ok: boolean): Visual {
  if (ok) return "ok";
  if (modo === "material") {
    if (codigo === "MATERIAL_ENTREGADO") return "ok";
    if (codigo === "ENTREGA_CERRADA") return "cerrado";
    if (codigo === "MATERIAL_DUPLICADO") return "aviso";
    return "error";
  }
  if (codigo === "ASISTENCIA_TOMADA" || codigo === "MOVILIZACION_REGISTRADA") return "ok";
  if (codigo === "PASE_CERRADO") return "cerrado";
  if (codigo === "ASISTENCIA_DUPLICADA" || codigo === "DIRIGENTE_NO_ELEGIBLE") return "aviso";
  if (codigo === "CANTIDAD_INVALIDA" || codigo === "CLAVE_INCORRECTA") return "formulario";
  return "error";
}

function textoQrParaEnviar(codigoDesdeQuery: string): string {
  if (codigoDesdeQuery) return codigoDesdeQuery;
  if (typeof window === "undefined") return "";
  const href = window.location.href;
  return codigoQrDesdeTextoQr(href) ?? href;
}

/** Tras un escaneo exitoso de asistencia (pase de lista o movilización): mensaje breve antes de cerrar. */
const MS_CIERRE_TRAS_ASISTENCIA_OK = 2000;
const MS_CIERRE_TRAS_OTROS = 3500;

function cerrarPestanaTrasLectura(delayMs: number) {
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
      /* ignore */
    }
    try {
      if (!window.closed) window.location.replace("about:blank");
    } catch {
      /* ignore */
    }
  }, delayMs);
}

export default function RegistrarAsistenciaClient() {
  const searchParams = useSearchParams();
  const codigoQr = searchParams.get("c")?.trim() ?? "";
  const [modo, setModo] = useState<ModoPase>("asistencia");
  const [clave, setClave] = useState("");
  const [cantidadMovilizacion, setCantidadMovilizacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [visual, setVisual] = useState<Visual>("cargando");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [eventoTitulo, setEventoTitulo] = useState<string | null>(null);
  const [tipoOperacionEvento, setTipoOperacionEvento] = useState<"PASE_LISTA" | "MOVILIZACION" | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/asistencia/pase-estado").then(async (res) => (await res.json()) as EstadoPase),
      fetch("/api/material/entrega-estado").then(async (res) => (await res.json()) as EstadoPase),
    ])
      .then(([asistencia, material]) => {
        if (cancelled) return;

        if (asistencia.abierto) {
          setModo("asistencia");
          setEventoTitulo(asistencia.evento?.titulo?.trim() || null);
          setTipoOperacionEvento(asistencia.evento?.tipoOperacion ?? "PASE_LISTA");
          setVisual("formulario");
          return;
        }

        if (material.abierto) {
          setModo("material");
          setEventoTitulo(material.evento?.titulo?.trim() || null);
          setTipoOperacionEvento(null);
          setVisual("formulario");
          return;
        }

        setModo("asistencia");
        setVisual("cerrado");
        setMensaje(asistencia.mensaje ?? material.mensaje ?? "No hay pase de lista ni entrega de material abierta");
        setEventoTitulo(asistencia.evento?.titulo ?? material.evento?.titulo ?? null);
        setTipoOperacionEvento(asistencia.evento?.tipoOperacion ?? null);
        if (codigoQr) cerrarPestanaTrasLectura(MS_CIERRE_TRAS_OTROS);
      })
      .catch(() => {
        if (cancelled) return;
        setVisual("formulario");
      });

    return () => {
      cancelled = true;
    };
  }, [codigoQr]);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setMensaje(null);
    setDetalle(null);

    const endpoint = modo === "material" ? "/api/material/escanear" : "/api/asistencia/escanear";

    const rawQr = textoQrParaEnviar(codigoQr);
    if (!rawQr.trim()) {
      setEnviando(false);
      setMensaje("No se detectó el código del QR. Vuelve a escanear la credencial.");
      setVisual("formulario");
      return;
    }

    let cantidadNum: number | undefined;
    if (modo === "asistencia" && tipoOperacionEvento === "MOVILIZACION") {
      const n = Number.parseInt(cantidadMovilizacion.trim(), 10);
      if (!Number.isFinite(n) || n < 1) {
        setEnviando(false);
        setMensaje("Indica cuántas personas movilizas (número entero mayor que cero)");
        setVisual("formulario");
        return;
      }
      cantidadNum = n;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw: rawQr,
          clave: clave.trim(),
          ...(cantidadNum != null ? { cantidad: cantidadNum } : {}),
        }),
      });
      const data = (await res.json()) as RespuestaEscaneo;
      const nombreDir = data.dirigente?.nombreCompleto?.trim();
      const cantidadEsteEscaneo = data.cantidad;
      const exitoAsistencia =
        modo === "asistencia" &&
        res.ok &&
        (data.codigo === "ASISTENCIA_TOMADA" || data.codigo === "MOVILIZACION_REGISTRADA");

      if (exitoAsistencia) {
        setMensaje("Éxito");
        if (data.codigo === "MOVILIZACION_REGISTRADA" && nombreDir && cantidadEsteEscaneo != null) {
          setDetalle(
            `${nombreDir} · ${cantidadEsteEscaneo} ${cantidadEsteEscaneo === 1 ? "persona" : "personas"} en este escaneo`,
          );
        } else if (nombreDir) {
          setDetalle(nombreDir);
        } else {
          setDetalle(null);
        }
      } else {
        const texto =
          data.mensaje ??
          data.error ??
          (data.codigo === "QR_INVALIDO"
            ? "El QR es inválido"
            : "No se pudo registrar la asistencia.");
        setMensaje(texto);
        if (modo === "material" && data.codigo === "NO_CONVOCADO" && data.dirigente?.id) {
          setDetalle(
            `${data.dirigente.nombreCompleto ?? "Dirigente"} — ID para convocar en Material: ${data.dirigente.numeroFicha ?? data.dirigente.id}`,
          );
        } else {
          const partes: string[] = [];
          if (data.dirigente?.nombreCompleto) partes.push(data.dirigente.nombreCompleto);
          if (
            data.codigo === "MOVILIZACION_REGISTRADA" &&
            data.cantidad != null &&
            data.totalMovilizados != null
          ) {
            partes.push(
              `Esta vez: ${data.cantidad} · Acumulado por este dirigente: ${data.totalMovilizados}`,
            );
          }
          setDetalle(partes.length > 0 ? partes.join(" — ") : null);
        }
      }
      if (data.evento?.titulo) setEventoTitulo(data.evento.titulo);
      if (data.evento?.tipoOperacion) setTipoOperacionEvento(data.evento.tipoOperacion);

      if (data.codigo === "CLAVE_INCORRECTA" || data.codigo === "CANTIDAD_INVALIDA") {
        setVisual("formulario");
        return;
      }
      if (data.codigo === "DIRIGENTE_NO_ELEGIBLE") {
        setVisual("aviso");
        cerrarPestanaTrasLectura(MS_CIERRE_TRAS_OTROS);
        return;
      }
      const siguiente = visualDeCodigo(modo, data.codigo, res.ok);
      setVisual(siguiente);
      if (siguiente !== "formulario") {
        const delay =
          exitoAsistencia ? MS_CIERRE_TRAS_ASISTENCIA_OK : MS_CIERRE_TRAS_OTROS;
        cerrarPestanaTrasLectura(delay);
      }
    } catch {
      setVisual("error");
      setMensaje("No se pudo registrar. Revisa la conexión e intenta de nuevo.");
      setDetalle(null);
      cerrarPestanaTrasLectura(MS_CIERRE_TRAS_OTROS);
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

  const esMovilizacion = modo === "asistencia" && tipoOperacionEvento === "MOVILIZACION";
  const titulo =
    modo === "material" ? "Entrega de material" : esMovilizacion ? "Movilización" : "Pase de lista";
  const instruccion =
    modo === "material"
      ? "Ingresa el código para registrar la entrega de material"
      : esMovilizacion
        ? "Indica cuántas personas moviliza el dirigente e ingresa el código. Puedes escanear varias veces; los totales se suman."
        : "Ingresa el código para registrar la asistencia (un solo registro por dirigente en este evento)";
  const boton =
    modo === "material" ? "Registrar entrega" : esMovilizacion ? "Registrar movilización" : "Pasar lista";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-6 sm:py-12">
      <div className="card space-y-6 p-5 sm:p-8">
        <div className="space-y-3 text-center">
          <AxisLogo size={160} badge mode="idle" accent="green" className="mx-auto" />
          <h1 className="page-title">{titulo}</h1>
          {eventoTitulo ? <p className="text-base font-semibold text-ink">{eventoTitulo}</p> : null}
          {visual === "formulario" ? <p className="text-sm text-ink-secondary">{instruccion}</p> : null}
        </div>

        {visual === "cargando" ? (
          <div className="flex items-center justify-center gap-3 text-ink-secondary">
            <span className="size-5 animate-pulse rounded-full bg-pin-light" />
            Cargando…
          </div>
        ) : null}

        {visual === "formulario" ? (
          <form className="space-y-4" onSubmit={(event) => void enviar(event)}>
            {mensaje ? <div className="alert-error text-center font-semibold">{mensaje}</div> : null}

            {esMovilizacion ? (
              <label className="label">
                Personas movilizadas en este escaneo
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100000}
                  step={1}
                  value={cantidadMovilizacion}
                  onChange={(event) => setCantidadMovilizacion(event.target.value)}
                  required
                />
              </label>
            ) : null}

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
              {enviando ? "Registrando…" : boton}
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
