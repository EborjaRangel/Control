"use client";

import { AxisLogo } from "@/components/AxisLogo";
import { TIPO_OPERACION_EVENTO_LABEL } from "@/lib/asistencia";
import { codigoQrDesdeTextoQr } from "@/lib/qr";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
  eventos?: EventoPase[];
  mensaje: string | null;
};

function eventosAsistenciaDesdeEstado(asistencia: EstadoPase): EventoPase[] {
  if (asistencia.eventos?.length) return asistencia.eventos;
  if (asistencia.evento?.id) return [asistencia.evento];
  return [];
}

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

/** Tiempo visible del mensaje tras escanear (éxito, aviso o error) antes de cerrar la pestaña. */
const MS_VISIBLE_TRAS_ESCANEO = 3000;

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
  const [eventosAbiertos, setEventosAbiertos] = useState<EventoPase[]>([]);
  const [eventoIdSeleccionado, setEventoIdSeleccionado] = useState("");
  const [solicitudesCierreTrasMensaje, setSolicitudesCierreTrasMensaje] = useState(0);

  function solicitarCierreTrasMensaje() {
    setSolicitudesCierreTrasMensaje((n) => n + 1);
  }

  useEffect(() => {
    if (solicitudesCierreTrasMensaje === 0) return;
    if (visual === "formulario" || visual === "cargando") return;
    const timer = window.setTimeout(() => {
      cerrarPestanaTrasLectura(0);
    }, MS_VISIBLE_TRAS_ESCANEO);
    return () => window.clearTimeout(timer);
  }, [solicitudesCierreTrasMensaje, visual]);

  const eventoSeleccionado = useMemo(
    () => eventosAbiertos.find((e) => e.id === eventoIdSeleccionado) ?? null,
    [eventosAbiertos, eventoIdSeleccionado],
  );

  function aplicarEventoSeleccionado(ev: EventoPase | null) {
    setEventoTitulo(ev?.titulo?.trim() || null);
    setTipoOperacionEvento(ev?.tipoOperacion ?? null);
  }

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
          const lista = eventosAsistenciaDesdeEstado(asistencia);
          setEventosAbiertos(lista);
          const idInicial = lista.length === 1 ? (lista[0]?.id ?? "") : "";
          setEventoIdSeleccionado(idInicial);
          aplicarEventoSeleccionado(lista.length === 1 ? (lista[0] ?? null) : null);
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
        if (codigoQr) solicitarCierreTrasMensaje();
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

    if (modo === "asistencia" && eventosAbiertos.length > 1 && !eventoIdSeleccionado) {
      setEnviando(false);
      setMensaje("Selecciona el evento en el que quieres registrar este escaneo.");
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
          ...(modo === "asistencia" && eventoIdSeleccionado
            ? { eventoId: eventoIdSeleccionado }
            : {}),
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
        solicitarCierreTrasMensaje();
        return;
      }
      const siguiente = visualDeCodigo(modo, data.codigo, res.ok);
      setVisual(siguiente);
      if (siguiente !== "formulario") {
        solicitarCierreTrasMensaje();
      }
    } catch {
      setVisual("error");
      setMensaje("No se pudo registrar. Revisa la conexión e intenta de nuevo.");
      setDetalle(null);
      solicitarCierreTrasMensaje();
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

            {modo === "asistencia" && eventosAbiertos.length > 1 ? (
              <label className="label block">
                Evento
                <select
                  className="input mt-1"
                  value={eventoIdSeleccionado}
                  onChange={(event) => {
                    const id = event.target.value;
                    setEventoIdSeleccionado(id);
                    const ev = eventosAbiertos.find((item) => item.id === id) ?? null;
                    aplicarEventoSeleccionado(ev);
                    setCantidadMovilizacion("");
                  }}
                  required
                >
                  <option value="">Selecciona el evento</option>
                  {eventosAbiertos.map((ev) => (
                    <option key={ev.id} value={ev.id!}>
                      {ev.titulo} ·{" "}
                      {ev.tipoOperacion
                        ? TIPO_OPERACION_EVENTO_LABEL[ev.tipoOperacion]
                        : "Asistencia"}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ink-secondary">
                  Hay {eventosAbiertos.length} eventos abiertos; elige en cuál registrar este QR.
                </p>
              </label>
            ) : null}

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
