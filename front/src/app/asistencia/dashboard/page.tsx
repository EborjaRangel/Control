"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { TableWrap } from "@/components/TableWrap";
import {
  exportarDashboardAsistenciaExcel,
  exportarFaltasFechaExcel,
} from "@/lib/export-asistencia-excel";
import {
  etiquetaFiltroFecha,
  fechaAyerMexico,
  type DirigenteAsistenciaResumen,
  type FaltasFechaResponse,
} from "@/lib/asistencia";

type PestanaDashboard = "faltas" | "resumen";

export default function AsistenciaDashboardPage() {
  const { isStaff } = useAuth();
  const [pestana, setPestana] = useState<PestanaDashboard>("faltas");
  const [fechaFiltro, setFechaFiltro] = useState(fechaAyerMexico);
  const [faltasFecha, setFaltasFecha] = useState<FaltasFechaResponse | null>(null);
  const [dirigentes, setDirigentes] = useState<DirigenteAsistenciaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState("");

  const loadResumen = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isStaff) return;
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await apiFetch("/api/asistencia/dashboard/dirigentes");
      if (!res.ok) throw new Error("No se pudo cargar el dashboard");
      setDirigentes((await res.json()) as DirigenteAsistenciaResumen[]);
    } catch (err) {
      if (opts?.silent) return;
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [isStaff]);

  const loadFaltas = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isStaff) return;
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await apiFetch(
        `/api/asistencia/dashboard/faltas?fecha=${encodeURIComponent(fechaFiltro)}`,
      );
      if (!res.ok) throw new Error("No se pudieron cargar las faltas");
      setFaltasFecha((await res.json()) as FaltasFechaResponse);
    } catch (err) {
      if (opts?.silent) return;
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [fechaFiltro, isStaff]);

  useEffect(() => {
    if (pestana === "faltas") void loadFaltas();
    else void loadResumen();
  }, [loadFaltas, loadResumen, pestana]);

  useEffect(() => {
    if (!isStaff) return;
    const refrescar = () => {
      if (document.visibilityState === "hidden") return;
      if (pestana === "faltas") void loadFaltas({ silent: true });
      else void loadResumen({ silent: true });
    };
    const timer = window.setInterval(refrescar, 2000);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [isStaff, loadFaltas, loadResumen, pestana]);

  const nombreFiltro = etiquetaFiltroFecha(fechaFiltro);

  const faltasFiltradas = useMemo(() => {
    const filas = faltasFecha?.faltas ?? [];
    const q = buscar.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter(
      (d) =>
        d.nombreCompleto.toLowerCase().includes(q) ||
        d.colonia.toLowerCase().includes(q) ||
        d.seccionElectoral.includes(q) ||
        d.eventos.some((ev) => ev.toLowerCase().includes(q)),
    );
  }, [buscar, faltasFecha?.faltas]);

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return dirigentes;
    return dirigentes.filter(
      (d) =>
        d.nombreCompleto.toLowerCase().includes(q) ||
        d.colonia.toLowerCase().includes(q) ||
        d.seccionElectoral.includes(q),
    );
  }, [dirigentes, buscar]);

  const totales = useMemo(
    () =>
      filtrados.reduce(
        (acc, d) => ({
          asistencias: acc.asistencias + d.asistencias,
          faltas: acc.faltas + d.faltas,
          eventos: acc.eventos + d.eventosElegibles,
        }),
        { asistencias: 0, faltas: 0, eventos: 0 },
      ),
    [filtrados],
  );

  if (!isStaff) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard de asistencia</h1>
          <p className="page-subtitle">
            {pestana === "faltas"
              ? `${nombreFiltro}: dirigentes elegibles que no registraron asistencia.`
              : "Asistencias y faltas por dirigente. Si hay un pase abierto, los números se actualizan al registrar cada QR."}
          </p>
        </div>
        <div className="page-actions">
          {pestana === "faltas" ? (
            <button
              type="button"
              className="btn-secondary btn-responsive"
              disabled={loading || faltasFiltradas.length === 0}
              onClick={() => exportarFaltasFechaExcel(fechaFiltro, faltasFiltradas)}
            >
              Generar Excel
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary btn-responsive"
              disabled={loading || filtrados.length === 0}
              onClick={() => exportarDashboardAsistenciaExcel(filtrados, totales)}
            >
              Exportar a Excel
            </button>
          )}
          <Link href="/asistencia" className="btn-ghost btn-responsive">
            Volver a eventos
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Vistas del dashboard">
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "faltas"}
          className={cn("btn-responsive", pestana === "faltas" ? "btn-primary" : "btn-secondary")}
          onClick={() => setPestana("faltas")}
        >
          {nombreFiltro}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === "resumen"}
          className={cn("btn-responsive", pestana === "resumen" ? "btn-primary" : "btn-secondary")}
          onClick={() => setPestana("resumen")}
        >
          Resumen general
        </button>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {pestana === "faltas" ? (
        <>
          <div className="card">
            <label className="block">
              <span className="label">Fecha del filtro</span>
              <input
                type="date"
                className="input mt-1 max-w-xs"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value || fechaAyerMexico())}
              />
            </label>
            {faltasFecha && faltasFecha.eventos.length > 0 ? (
              <p className="mt-3 text-sm text-ink-secondary">
                Eventos del día:{" "}
                {faltasFecha.eventos.map((ev) => `${ev.titulo} (${ev.hora})`).join(" · ")}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card text-center">
              <p className="text-2xl font-bold text-ink">{faltasFecha?.eventos.length ?? 0}</p>
              <p className="text-xs text-ink-secondary">Eventos en la fecha</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-ink">{faltasFiltradas.length}</p>
              <p className="text-xs text-ink-secondary">Sin asistencia</p>
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card text-center">
            <p className="text-2xl font-bold text-pin">{totales.eventos}</p>
            <p className="text-xs text-ink-secondary">Eventos elegibles (suma)</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-success-text">{totales.asistencias}</p>
            <p className="text-xs text-ink-secondary">Asistencias totales</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-ink">{totales.faltas}</p>
            <p className="text-xs text-ink-secondary">Faltas totales</p>
          </div>
        </div>
      )}

      <div className="card">
        <input
          type="search"
          className="input-search"
          placeholder="Buscar dirigente, colonia o sección…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando…
        </div>
      ) : null}

      {pestana === "faltas" ? (
        <div className="card-section space-y-4">
          <h2 className="section-title">{nombreFiltro}</h2>
          {!loading && (faltasFecha?.eventos.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-ink-secondary">
              No hay eventos de asistencia en esta fecha.
            </p>
          ) : null}
          {!loading && (faltasFecha?.eventos.length ?? 0) > 0 && faltasFiltradas.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-secondary">
              Todos los dirigentes elegibles registraron asistencia, o no hay coincidencias con la
              búsqueda.
            </p>
          ) : null}

          {!loading && faltasFiltradas.length > 0 ? (
            <>
              <ul className="mobile-only-list">
                {faltasFiltradas.map((d) => (
                  <li key={d.id} className="list-card">
                    <div className="list-card-header">
                      <div className="min-w-0">
                        <Link
                          href={`/dirigentes/${d.id}/consultar`}
                          className="break-words font-bold text-pin hover:underline"
                        >
                          {d.nombreCompleto}
                        </Link>
                        <p className="mt-1 text-xs text-ink-secondary">
                          {d.tipo} · {d.colonia} · Sección {d.seccionElectoral}
                        </p>
                        <p className="mt-1 text-xs text-ink-secondary">
                          {d.eventos.join(" · ")}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="desktop-only-table">
                <TableWrap>
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs text-ink-secondary">
                        <th className="py-2 pr-3">Dirigente</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">Colonia</th>
                        <th className="py-2 pr-3">Sección</th>
                        <th className="py-2">Eventos sin asistencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faltasFiltradas.map((d) => (
                        <tr key={d.id} className="border-b border-line/60">
                          <td className="py-2.5 pr-3">
                            <Link
                              href={`/dirigentes/${d.id}/consultar`}
                              className="font-medium text-pin hover:underline"
                            >
                              {d.nombreCompleto}
                            </Link>
                          </td>
                          <td className="py-2.5 pr-3 text-ink-secondary">{d.tipo}</td>
                          <td className="py-2.5 pr-3 text-ink-secondary">{d.colonia}</td>
                          <td className="py-2.5 pr-3 text-ink-secondary">{d.seccionElectoral}</td>
                          <td className="py-2.5 text-ink-secondary">{d.eventos.join("; ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <div className="card-section space-y-4">
          {!loading && filtrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-secondary">Sin resultados.</p>
          ) : null}

          {!loading && filtrados.length > 0 ? (
            <>
              <ul className="mobile-only-list">
                {filtrados.map((d) => (
                  <li key={d.id} className="list-card">
                    <div className="list-card-header">
                      <div className="min-w-0">
                        <Link
                          href={`/dirigentes/${d.id}/consultar`}
                          className="break-words font-bold text-pin hover:underline"
                        >
                          {d.nombreCompleto}
                        </Link>
                        <p className="mt-1 text-xs text-ink-secondary">
                          {d.tipo} · {d.colonia}
                        </p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <dt className="text-ink-secondary">Eventos</dt>
                        <dd className="font-semibold text-ink">{d.eventosElegibles}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-secondary">Asistencias</dt>
                        <dd className="font-semibold text-success-text">{d.asistencias}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-secondary">Faltas</dt>
                        <dd className="font-semibold text-ink">{d.faltas}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>

              <div className="desktop-only-table">
                <TableWrap>
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs text-ink-secondary">
                        <th className="py-2 pr-3">Dirigente</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">Colonia</th>
                        <th className="py-2 pr-3 text-center">Eventos</th>
                        <th className="py-2 pr-3 text-center">Asistencias</th>
                        <th className="py-2 text-center">Faltas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((d) => (
                        <tr key={d.id} className="border-b border-line/60">
                          <td className="py-2.5 pr-3">
                            <Link
                              href={`/dirigentes/${d.id}/consultar`}
                              className="font-medium text-pin hover:underline"
                            >
                              {d.nombreCompleto}
                            </Link>
                          </td>
                          <td className="py-2.5 pr-3 text-ink-secondary">{d.tipo}</td>
                          <td className="py-2.5 pr-3 text-ink-secondary">{d.colonia}</td>
                          <td className="py-2.5 pr-3 text-center">{d.eventosElegibles}</td>
                          <td className="py-2.5 pr-3 text-center font-semibold text-success-text">
                            {d.asistencias}
                          </td>
                          <td className="py-2.5 text-center font-semibold text-ink">{d.faltas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
