"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ConvocatoriaEventoPanel } from "@/components/ConvocatoriaEventoPanel";
import { RegistrarAsistenciaQrForm } from "@/components/RegistrarAsistenciaQrForm";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import {
  ESTADO_EVENTO_LABEL,
  badgeEstadoEvento,
  formatFechaEvento,
  type EventoAsistenciaDTO,
  type PaseListaResponse,
} from "@/lib/asistencia";
import type { RegistrarAsistenciaFormValues } from "@/lib/validation-asistencia";

export default function EventoDetalleClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canTakeAsistencia, isStaff } = useAuth();
  const [data, setData] = useState<PaseListaResponse | null>(null);
  const [eventosActivos, setEventosActivos] = useState<EventoAsistenciaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [accionando, setAccionando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/asistencia/eventos/${id}/pase`);
      if (!res.ok) throw new Error("No se pudo cargar el evento");
      setData((await res.json()) as PaseListaResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (canTakeAsistencia) void load();
  }, [canTakeAsistencia, load]);

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
    try {
      const res = await apiFetch(`/api/asistencia/eventos/${id}/abrir`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo abrir");
      setMensaje("Pase de lista abierto. Ya puedes registrar asistencias.");
      await load();
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error");
    } finally {
      setAccionando(false);
    }
  }

  async function cerrarPase() {
    if (!confirm("¿Cerrar el pase de lista? Ya no se podrán registrar más asistencias.")) return;
    setAccionando(true);
    setMensaje(null);
    try {
      const res = await apiFetch(`/api/asistencia/eventos/${id}/cerrar`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo cerrar");
      setMensaje("Pase de lista cerrado.");
      await load();
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error");
    } finally {
      setAccionando(false);
    }
  }

  async function registrarAsistencia(values: RegistrarAsistenciaFormValues) {
    setMensaje(null);
    const res = await apiFetch(`/api/asistencia/eventos/${id}/registrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: values.raw.trim() }),
    });
    const body = (await res.json()) as {
      error?: string;
      dirigente?: { nombreCompleto: string };
    };
    if (!res.ok) throw new Error(body.error ?? "No se pudo registrar");
    setMensaje(`Asistencia registrada: ${body.dirigente?.nombreCompleto ?? "Dirigente"}`);
    await load();
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

  const { evento, lista, registros } = data;
  const asistieron = lista.filter((d) => d.asistio).length;
  const faltas = evento.estado === "CERRADO" ? lista.length - asistieron : null;

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
          <p className="mt-1 text-sm text-ink-secondary">{evento.alcanceLabel}</p>
        </div>
        <Link href="/asistencia" className="btn-ghost btn-responsive shrink-0">
          Volver
        </Link>
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

      {isStaff ? (
        <ConvocatoriaEventoPanel eventoId={evento.id} totalElegibles={lista.length} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-pin">{lista.length}</p>
          <p className="text-xs text-ink-secondary">Elegibles</p>
        </div>
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
      </div>

      {isStaff ? (
        <div className="page-actions">
          {evento.estado === "PROGRAMADO" ? (
            <button
              type="button"
              className="btn-primary btn-responsive"
              disabled={accionando}
              onClick={() => void abrirPase()}
            >
              Iniciar pase de lista
            </button>
          ) : null}
          {evento.estado === "ABIERTO" ? (
            <button
              type="button"
              className="btn-danger btn-responsive"
              disabled={accionando}
              onClick={() => void cerrarPase()}
            >
              Terminar pase de lista
            </button>
          ) : null}
        </div>
      ) : null}

      {!isStaff && evento.estado === "PROGRAMADO" ? (
        <div className="alert-warning">
          El pase de lista aún no está abierto. Un administrador debe iniciarlo para registrar
          asistencias.
        </div>
      ) : null}

      {evento.estado === "ABIERTO" ? (
        <section className="card-section space-y-4">
          <h2 className="section-title">Registrar asistencia (QR)</h2>
          <p className="text-sm text-ink-secondary">
            Escanea el QR del dirigente o pega el código / JSON del QR.
          </p>
          <RegistrarAsistenciaQrForm
            onSubmit={async (values) => {
              try {
                await registrarAsistencia(values);
              } catch (err) {
                setMensaje(err instanceof Error ? err.message : "Error al registrar");
                throw err;
              }
            }}
          />
        </section>
      ) : null}

      {evento.estado === "CERRADO" ? (
        <div className="alert-warning">
          Este evento está cerrado. Ya no se pueden registrar asistencias.
        </div>
      ) : null}

      {mensaje ? (
        <div
          className={
            mensaje.toLowerCase().includes("error") ||
            mensaje.includes("No ") ||
            mensaje.includes("no ")
              ? "alert-error"
              : "panel-pin text-sm font-medium text-pin-dark"
          }
        >
          {mensaje}
        </div>
      ) : null}

      <section className="card-section space-y-4">
        <h2 className="section-title">Pase de lista ({lista.length})</h2>

        <ul className="mobile-only-list">
          {lista.map((d) => (
            <li key={d.id} className="list-card">
              <div className="list-card-header">
                <div className="min-w-0">
                  <p className="break-words font-bold text-ink">{d.nombreCompleto}</p>
                  <p className="mt-1 text-xs text-ink-secondary">
                    {d.tipo} · {d.colonia}
                  </p>
                </div>
                {d.asistio ? (
                  <span className="badge-pin shrink-0">Presente</span>
                ) : (
                  <span className="badge-muted shrink-0">
                    {evento.estado === "CERRADO" ? "Falta" : "Pendiente"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="desktop-only-table">
          <TableWrap>
            <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-secondary">
                <th className="py-2 pr-3">Dirigente</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Colonia</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((d) => (
                <tr key={d.id} className="border-b border-line/60">
                  <td className="py-2.5 pr-3 font-medium text-ink">{d.nombreCompleto}</td>
                  <td className="py-2.5 pr-3 text-ink-secondary">{d.tipo}</td>
                  <td className="py-2.5 pr-3 text-ink-secondary">{d.colonia}</td>
                  <td className="py-2.5">
                    {d.asistio ? (
                      <span className="badge-pin">Presente</span>
                    ) : (
                      <span className="badge-muted">
                        {evento.estado === "CERRADO" ? "Falta" : "Pendiente"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableWrap>
        </div>
      </section>

      {registros.length > 0 ? (
        <section className="card-section space-y-3">
          <h2 className="section-title">Registros recientes ({registros.length})</h2>
          <ul className="space-y-2">
            {registros.map((r) => (
              <li key={r.id} className="panel-soft flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-medium text-ink">{r.dirigente.nombreCompleto}</span>
                <span className="text-ink-secondary">
                  {new Date(r.registradoAt).toLocaleString("es-MX")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
