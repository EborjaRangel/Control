"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { TableWrap } from "@/components/TableWrap";
import { exportarDashboardAsistenciaExcel } from "@/lib/export-asistencia-excel";
import type { DirigenteAsistenciaResumen } from "@/lib/asistencia";

export default function AsistenciaDashboardPage() {
  const { isStaff } = useAuth();
  const [dirigentes, setDirigentes] = useState<DirigenteAsistenciaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    if (!isStaff) return;
    void apiFetch("/api/asistencia/dashboard/dirigentes")
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar el dashboard");
        return (await res.json()) as DirigenteAsistenciaResumen[];
      })
      .then(setDirigentes)
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [isStaff]);

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
            Asistencias y faltas por dirigente en eventos cerrados (según colonia, sección o UT).
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn-secondary btn-responsive"
            disabled={loading || filtrados.length === 0}
            onClick={() => exportarDashboardAsistenciaExcel(filtrados, totales)}
          >
            Exportar a Excel
          </button>
          <Link href="/asistencia" className="btn-ghost btn-responsive">
            Volver a eventos
          </Link>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

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
    </div>
  );
}
