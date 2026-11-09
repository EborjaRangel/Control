"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ConvocatoriaEventoPanel } from "@/components/ConvocatoriaEventoPanel";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { exportarNoAsistieronEventoExcel } from "@/lib/export-asistencia-excel";
import {
  ESTADO_EVENTO_LABEL,
  TIPO_OPERACION_EVENTO_LABEL,
  badgeEstadoEvento,
  formatFechaEvento,
  type EventoAsistenciaDTO,
  type PaseListaResponse,
} from "@/lib/asistencia";
import { LIVE_PANEL_POLL_MS } from "@/lib/live-polling";

function formatearFechaHoraRegistro(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export default function EventoDetalleClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canTakeAsistencia, isStaff } = useAuth();
  const [data, setData] = useState<PaseListaResponse | null>(null);
  const [eventosActivos, setEventosActivos] = useState<EventoAsistenciaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState(false);
  const [accionando, setAccionando] = useState(false);
  const [pestana, setPestana] = useState<"pase" | "recientes">("pase");
  const registrosPreviosRef = useRef(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await apiFetch(`/api/asistencia/eventos/${id}/pase`);
      if (!res.ok) throw new Error("No se pudo cargar el evento");
      setData((await res.json()) as PaseListaResponse);
    } catch (err) {
      if (opts?.silent) return;
      setError(err instanceof Error ? err.message : "Error al cargar");
      setData(null);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (canTakeAsistencia) void load();
  }, [canTakeAsistencia, load]);

  useEffect(() => {
    if (!canTakeAsistencia) return;
    if (data?.evento.estado !== "ABIERTO") return;

    const refrescar = () => {
      if (document.visibilityState === "hidden") return;
      void load({ silent: true });
    };
    const timer = window.setInterval(refrescar, LIVE_PANEL_POLL_MS);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [canTakeAsistencia, data?.evento.estado, data?.evento.id, load]);

  useEffect(() => {
    const total = data?.registros.length ?? 0;
    if (total > registrosPreviosRef.current && registrosPreviosRef.current > 0) {
      setPestana("recientes");
    }
    registrosPreviosRef.current = total;
  }, [data?.registros.length]);

  useEffect(() => {
    if (!canTakeAsistencia) return;
    void apiFetch("/api/asistencia/eventos?activos=true")
      .then(async (res) => {
        if (!res.ok) return [];
        return (await res.json()) as EventoAsistenciaDTO[];
      })
      .then(setEventosActivos)
      .catch(() => setEventosActivos([]));
  }, [canTakeAsistencia]);

  async function abrirPase() {
    setAccionando(true);
    setMensaje(null);
    setMensajeOk(false);
    try {
      const res = await apiFetch(`/api/asistencia/eventos/${id}/abrir`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo abrir");
      setMensaje(
        "Evento abierto. Ya puedes leer los QR con la cámara de cualquier teléfono (en movilización indica la cantidad en cada escaneo).",
      );
      setMensajeOk(true);
      await load({ silent: true });
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error");
      setMensajeOk(false);
    } finally {
      setAccionando(false);
    }
  }

  async function cerrarPase() {
    if (
      !confirm(
        "¿Cerrar este evento? Ya no se podrán registrar más escaneos en él. Los usuarios de pase de lista solo se inhabilitan si no queda otro evento abierto.",
      )
    ) {
      return;
    }
    setAccionando(true);
    setMensaje(null);
    setMensajeOk(false);
    try {
      const res = await apiFetch(`/api/asistencia/eventos/${id}/cerrar`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo cerrar");
      setMensaje("Evento cerrado.");
      setMensajeOk(true);
      await load({ silent: true });
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error");
      setMensajeOk(false);
    } finally {
      setAccionando(false);
    }
  }

  if (!canTakeAsistencia) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando evento…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "Evento no encontrado"}</div>
        <Link href="/asistencia" className="btn-secondary btn-responsive inline-flex">
          Volver
        </Link>
      </div>
    );
  }

  const { evento, lista, registros: registrosApi } = data;
  const registros = [...registrosApi].sort((a, b) => b.registradoAt.localeCompare(a.registradoAt));
  const esMovilizacion = evento.tipoOperacion === "MOVILIZACION";
  const asistieron = lista.filter((d) => d.asistio).length;
  const totalMovilizacionGlobal =
    esMovilizacion && evento.totalPersonasMovilizadas != null
      ? evento.totalPersonasMovilizadas
      : null;
  const faltas =
    evento.estado === "CERRADO" && !esMovilizacion ? lista.length - asistieron : null;

  const listaOrdenMovilizacion = esMovilizacion
    ? [...lista].sort((a, b) => {
        const ta = a.totalMovilizados ?? 0;
        const tb = b.totalMovilizados ?? 0;
        if (tb !== ta) return tb - ta;
        return a.nombreCompleto.localeCompare(b.nombreCompleto, "es", { sensitivity: "base" });
      })
    : lista;

  const top10Movilizacion = esMovilizacion
    ? [...lista]
        .filter((d) => (d.totalMovilizados ?? 0) > 0)
        .sort((a, b) => (b.totalMovilizados ?? 0) - (a.totalMovilizados ?? 0))
        .slice(0, 10)
    : [];

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
          <p className="mt-1 text-sm font-medium text-ink-secondary">
            {TIPO_OPERACION_EVENTO_LABEL[evento.tipoOperacion]}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">{evento.alcanceLabel}</p>
        </div>
        <div className="page-actions">
          {isStaff && evento.estado === "PROGRAMADO" ? (
            <button
              type="button"
              className="btn-primary btn-responsive"
              disabled={accionando}
              onClick={() => void abrirPase()}
            >
              {esMovilizacion ? "Iniciar movilización" : "Iniciar pase de lista"}
            </button>
          ) : null}
          {isStaff && evento.estado === "ABIERTO" ? (
            <button
              type="button"
              className="btn-danger btn-responsive"
              disabled={accionando}
              onClick={() => void cerrarPase()}
            >
              Cerrar evento
            </button>
          ) : null}
          {isStaff && !esMovilizacion ? (
            <button
              type="button"
              className="btn-secondary btn-responsive"
              disabled={lista.filter((d) => !d.asistio).length === 0}
              onClick={() =>
                exportarNoAsistieronEventoExcel(
                  evento.titulo,
                  lista.filter((d) => !d.asistio),
                )
              }
            >
              Excel de no asistieron
            </button>
          ) : null}
          <Link href="/asistencia" className="btn-ghost btn-responsive shrink-0">
            Volver
          </Link>
        </div>
      </div>

      {eventosActivos.length > 0 ? (
        <div className="card">
          <label className="block">
            <span className="label">Cambiar a otro evento activo</span>
            <select
              className="input mt-1"
              value={id}
              onChange={(e) => router.push(`/asistencia/eventos/${e.target.value}`)}
            >
              {eventosActivos.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.titulo} · {formatFechaEvento(ev.fecha)} ({ESTADO_EVENTO_LABEL[ev.estado]})
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {isStaff && evento.estado !== "ABIERTO" ? (
        <ConvocatoriaEventoPanel eventoId={evento.id} totalElegibles={lista.length} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-pin">{lista.length}</p>
          <p className="text-xs text-ink-secondary">Elegibles</p>
        </div>
        {esMovilizacion ? (
          <>
            <div className="card text-center">
              <p className="text-2xl font-bold text-success-text">{asistieron}</p>
              <p className="text-xs text-ink-secondary">Dirigentes con al menos un escaneo</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-ink">{totalMovilizacionGlobal ?? "—"}</p>
              <p className="text-xs text-ink-secondary">Personas movilizadas (total)</p>
            </div>
          </>
        ) : (
          <>
            <div className="card text-center">
              <p className="text-2xl font-bold text-success-text">{asistieron}</p>
              <p className="text-xs text-ink-secondary">Asistencias</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-ink">{faltas ?? "—"}</p>
              <p className="text-xs text-ink-secondary">
                {evento.estado === "CERRADO" ? "Faltas" : "Faltas (al cerrar)"}
              </p>
            </div>
          </>
        )}
      </div>

      {esMovilizacion && top10Movilizacion.length > 0 ? (
        <div className="card-section space-y-3">
          <h2 className="section-title">Top 10 — acumulado por dirigente</h2>
          <p className="text-sm text-ink-secondary">
            Los dirigentes con más personas movilizadas en total en este evento (varios escaneos suman).
          </p>
          <ul className="mobile-only-list">
            {top10Movilizacion.map((d, i) => (
              <li key={d.id} className="list-card">
                <div className="list-card-header">
                  <div className="min-w-0">
                    <p className="font-bold text-ink">
                      <span className="text-ink-secondary">#{i + 1}</span> · {d.nombreCompleto}
                    </p>
                    <p className="mt-1 text-xs text-ink-secondary">
                      {d.tipo} · {d.colonia}
                    </p>
                  </div>
                  <span className="badge-pin shrink-0 tabular-nums">
                    {d.totalMovilizados ?? 0} total
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="desktop-only-table">
            <TableWrap>
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-secondary">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Dirigente</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 text-right">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {top10Movilizacion.map((d, i) => (
                    <tr key={d.id} className="border-b border-line/60">
                      <td className="py-2.5 pr-3 text-ink-secondary">{i + 1}</td>
                      <td className="py-2.5 pr-3 font-medium text-ink">{d.nombreCompleto}</td>
                      <td className="py-2.5 pr-3 text-ink-secondary">{d.tipo}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-pin">
                        {d.totalMovilizados ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        </div>
      ) : null}

      {isStaff && evento.estado === "PROGRAMADO" ? (
        <div className="alert-warning">
          Este evento está programado. Pulsa{" "}
          <strong>{esMovilizacion ? "Iniciar movilización" : "Iniciar pase de lista"}</strong> arriba
          para comenzar a registrar.
        </div>
      ) : null}

      {isStaff && evento.estado === "ABIERTO" ? (
        <div className="panel-pin text-sm text-pin-dark">
          {esMovilizacion ? (
            <>
              El evento está abierto. En cada escaneo indica cuántas personas moviliza el dirigente;
              puede haber varios escaneos y el total se va sumando. Cierra con{" "}
              <strong>Cerrar evento</strong> cuando terminen.
            </>
          ) : (
            <>
              El pase está abierto. Apunta la cámara de cualquier teléfono al QR del dirigente. Cuando
              termines, pulsa <strong>Cerrar evento</strong> arriba.
            </>
          )}
        </div>
      ) : null}

      {!isStaff && evento.estado === "PROGRAMADO" ? (
        <div className="alert-warning">
          {esMovilizacion ? (
            <>El evento aún no está abierto. Un administrador debe iniciarlo para registrar.</>
          ) : (
            <>
              El pase de lista aún no está abierto. Un administrador debe iniciarlo para registrar
              asistencias.
            </>
          )}
        </div>
      ) : null}

      {evento.estado === "CERRADO" ? (
        <div className="alert-warning">
          Este evento está cerrado. Ya no se pueden registrar más {esMovilizacion ? "movilizaciones" : "asistencias"}.
        </div>
      ) : null}

      {mensaje ? (
        <div
          className={
            mensajeOk
              ? "alert-success text-base font-semibold"
              : mensaje.includes("imposible") || mensaje.includes("No hay")
                ? "alert-warning text-base font-semibold"
                : "alert-error text-base font-semibold"
          }
        >
          {mensaje}
        </div>
      ) : null}

      <section className="card-section space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Listas del evento">
          <button
            type="button"
            role="tab"
            aria-selected={pestana === "pase"}
            className={cn("btn-responsive", pestana === "pase" ? "btn-primary" : "btn-secondary")}
            onClick={() => setPestana("pase")}
          >
            {esMovilizacion ? "Dirigentes" : "Pase de lista"} ({lista.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === "recientes"}
            className={cn("btn-responsive", pestana === "recientes" ? "btn-primary" : "btn-secondary")}
            onClick={() => setPestana("recientes")}
          >
            Todos los registros ({registros.length})
          </button>
        </div>

        {pestana === "pase" ? (
          <>
            <h2 className="section-title">
              {esMovilizacion ? "Dirigentes y total movilizado" : "Pase de lista"}
            </h2>

            {lista.length === 0 ? (
              <p className="text-sm text-ink-secondary">No hay dirigentes elegibles para este evento.</p>
            ) : null}

            <ul className="mobile-only-list">
              {listaOrdenMovilizacion.map((d) => (
                <li key={d.id} className="list-card">
                  <div className="list-card-header">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-ink">{d.nombreCompleto}</p>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {d.tipo} · {d.colonia}
                        {esMovilizacion && d.asistio && d.totalMovilizados != null
                          ? ` · Total acumulado: ${d.totalMovilizados}`
                          : null}
                        {!esMovilizacion && d.asistio && d.registradoPor
                          ? ` · Pasó lista: ${d.registradoPor.username}`
                          : ""}
                        {!esMovilizacion && d.asistio && d.registradoAt
                          ? ` · ${formatearFechaHoraRegistro(d.registradoAt)}`
                          : null}
                        {esMovilizacion && d.asistio && d.registradoAt
                          ? ` · Último escaneo: ${formatearFechaHoraRegistro(d.registradoAt)}`
                          : null}
                      </p>
                    </div>
                    {d.asistio ? (
                      <span className="badge-pin shrink-0">
                        {esMovilizacion ? "Con registro" : "Presente"}
                      </span>
                    ) : (
                      <span className="badge-muted shrink-0">
                        {evento.estado === "CERRADO"
                          ? esMovilizacion
                            ? "Sin movilizar"
                            : "Falta"
                          : "Pendiente"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="desktop-only-table">
              <TableWrap>
                <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-secondary">
                    <th className="py-2 pr-3">Dirigente</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Colonia</th>
                    <th className="py-2 pr-3">
                      {esMovilizacion ? "Total acumulado" : "Pasó lista"}
                    </th>
                    {!esMovilizacion ? (
                      <th className="py-2 pr-3">Fecha y hora</th>
                    ) : (
                      <th className="py-2 pr-3">Último escaneo</th>
                    )}
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {listaOrdenMovilizacion.map((d) => (
                    <tr key={d.id} className="border-b border-line/60">
                      <td className="py-2.5 pr-3 font-medium text-ink">{d.nombreCompleto}</td>
                      <td className="py-2.5 pr-3 text-ink-secondary">{d.tipo}</td>
                      <td className="py-2.5 pr-3 text-ink-secondary">{d.colonia}</td>
                      <td className="py-2.5 pr-3 text-ink-secondary">
                        {esMovilizacion
                          ? d.asistio
                            ? (d.totalMovilizados ?? "—")
                            : "—"
                          : d.asistio
                            ? (d.registradoPor?.username ?? "—")
                            : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-ink-secondary text-xs">
                        {d.asistio && d.registradoAt
                          ? formatearFechaHoraRegistro(d.registradoAt)
                          : "—"}
                      </td>
                      <td className="py-2.5">
                        {d.asistio ? (
                          <span className="badge-pin">{esMovilizacion ? "Con registro" : "Presente"}</span>
                        ) : (
                          <span className="badge-muted">
                            {evento.estado === "CERRADO"
                              ? esMovilizacion
                                ? "Sin movilizar"
                                : "Falta"
                              : "Pendiente"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </TableWrap>
            </div>
          </>
        ) : (
          <>
            <h2 className="section-title">Todos los registros</h2>
            <p className="text-sm text-ink-secondary">
              Cada fila es un escaneo: fecha y hora, dirigente, {esMovilizacion ? "personas en ese escaneo" : "un pase"}{" "}
              y usuario que ingresó el código.
            </p>
            {registros.length === 0 ? (
              <p className="text-sm text-ink-secondary">Aún no hay registros en este evento.</p>
            ) : (
              <>
                <ul className="mobile-only-list space-y-2">
                  {registros.map((r) => (
                    <li key={r.id} className="panel-soft space-y-1 text-sm">
                      <p className="font-medium text-ink">{r.dirigente.nombreCompleto}</p>
                      <p className="text-xs text-ink-secondary">
                        {formatearFechaHoraRegistro(r.registradoAt)}
                      </p>
                      <p className="text-xs text-ink-secondary">
                        {esMovilizacion ? (
                          <>
                            {r.cantidad} persona{r.cantidad === 1 ? "" : "s"} · Escaneó:{" "}
                            {r.registradoPor?.username ?? "—"}
                          </>
                        ) : (
                          <>Escaneó: {r.registradoPor?.username ?? "—"}</>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="desktop-only-table">
                  <TableWrap>
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-line text-xs text-ink-secondary">
                          <th className="py-2 pr-3">Fecha y hora</th>
                          <th className="py-2 pr-3">Dirigente</th>
                          {esMovilizacion ? (
                            <th className="py-2 pr-3 text-right">Personas (este escaneo)</th>
                          ) : null}
                          <th className="py-2">Escaneó (usuario)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registros.map((r) => (
                          <tr key={r.id} className="border-b border-line/60">
                            <td className="py-2.5 pr-3 whitespace-nowrap text-ink-secondary text-xs">
                              {formatearFechaHoraRegistro(r.registradoAt)}
                            </td>
                            <td className="py-2.5 pr-3 font-medium text-ink">{r.dirigente.nombreCompleto}</td>
                            {esMovilizacion ? (
                              <td className="py-2.5 pr-3 text-right tabular-nums font-medium text-ink">
                                {r.cantidad}
                              </td>
                            ) : null}
                            <td className="py-2.5 text-ink-secondary">{r.registradoPor?.username ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
