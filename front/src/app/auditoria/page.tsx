"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import {
  AUDIT_ACCION_OPTIONS,
  formatAuditFecha,
  labelEntidadAuditoria,
  resumenAuditoria,
  type AuditLogDTO,
} from "@/lib/auditoria";

export default function AuditoriaPage() {
  const pathname = usePathname();
  const { hasAdminPrivileges } = useAuth();
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [entidades, setEntidades] = useState<string[]>([]);
  const [buscar, setBuscar] = useState("");
  const [entidad, setEntidad] = useState("");
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set("buscar", buscar.trim());
      if (entidad) params.set("entidad", entidad);
      if (accion) params.set("accion", accion);
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      params.set("limit", "200");

      const res = await apiFetch(`/api/auditoria?${params.toString()}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar auditoría");
      }
      setLogs((await res.json()) as AuditLogDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [buscar, entidad, accion, desde, hasta]);

  useEffect(() => {
    if (!hasAdminPrivileges) return;
    void apiFetch("/api/auditoria/entidades")
      .then(async (res) => (res.ok ? ((await res.json()) as string[]) : []))
      .then(setEntidades)
      .catch(() => setEntidades([]));
  }, [hasAdminPrivileges]);

  useEffect(() => {
    if (!hasAdminPrivileges) return;
    const timer = setTimeout(() => {
      void load();
    }, buscar ? 300 : 0);
    return () => clearTimeout(timer);
  }, [hasAdminPrivileges, load, pathname, buscar, entidad, accion, desde, hasta]);

  if (!hasAdminPrivileges) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : `${logs.length} registro(s) · altas, cambios, bajas, sesiones y acciones del sistema`}
          </p>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      <section className="card-section grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label" htmlFor="audit-buscar">
            Buscar
          </label>
          <input
            id="audit-buscar"
            className="input"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Usuario, entidad, registro…"
          />
        </div>
        <div>
          <label className="label" htmlFor="audit-entidad">
            Entidad
          </label>
          <select
            id="audit-entidad"
            className="input"
            value={entidad}
            onChange={(e) => setEntidad(e.target.value)}
          >
            <option value="">Todas</option>
            {entidades.map((e) => (
              <option key={e} value={e}>
                {labelEntidadAuditoria(e)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="audit-accion">
            Acción
          </label>
          <select
            id="audit-accion"
            className="input"
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
          >
            {AUDIT_ACCION_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="audit-desde">
            Desde
          </label>
          <input
            id="audit-desde"
            type="date"
            className="input"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="audit-hasta">
            Hasta
          </label>
          <input
            id="audit-hasta"
            type="date"
            className="input"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando auditoría…
        </div>
      ) : null}

      {!loading && logs.length === 0 ? (
        <p className="text-sm text-ink-secondary">No hay registros de auditoría con los filtros actuales.</p>
      ) : null}

      {!loading && logs.length > 0 ? (
        <>
          <ul className="mobile-only-list">
            {logs.map((log) => (
              <li key={log.id} className="list-card space-y-3">
                <div className="list-card-header">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{formatAuditFecha(log.createdAt)}</p>
                    <p className="font-semibold text-ink">{log.usuarioNombre ?? "—"}</p>
                    {log.usuarioRol ? (
                      <p className="text-xs text-ink-secondary">{log.usuarioRol}</p>
                    ) : null}
                  </div>
                  <span className="badge-pin shrink-0">{log.accionLabel}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-ink-secondary">Entidad: </span>
                    {labelEntidadAuditoria(log.entidad)}
                  </p>
                  <p className="break-words font-medium">{log.entidadLabel ?? log.entidadId ?? "—"}</p>
                  <p className="text-ink-secondary">{resumenAuditoria(log)}</p>
                </div>
                {log.cambios || log.metadata ? (
                  <button
                    type="button"
                    className="btn-ghost btn-sm btn-responsive"
                    onClick={() => setExpandido(expandido === log.id ? null : log.id)}
                  >
                    {expandido === log.id ? "Ocultar detalle" : "Ver detalle"}
                  </button>
                ) : null}
                {expandido === log.id ? (
                  <div className="panel-soft space-y-3 text-sm">
                    {log.cambios
                      ? Object.entries(log.cambios).map(([campo, cambio]) => (
                          <div key={campo}>
                            <p className="font-medium text-ink">{campo}</p>
                            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">
                              {JSON.stringify(cambio, null, 2)}
                            </pre>
                          </div>
                        ))
                      : null}
                    {log.metadata ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="desktop-only-table">
            <TableWrap>
              <table className="data-table min-w-[920px]">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Registro</th>
                <th>Campos</th>
                <th className="w-24">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr>
                    <td className="whitespace-nowrap text-sm">{formatAuditFecha(log.createdAt)}</td>
                    <td>
                      <div className="font-medium">{log.usuarioNombre ?? "—"}</div>
                      {log.usuarioRol ? (
                        <div className="text-xs text-ink-secondary">{log.usuarioRol}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className="badge-pin">{log.accionLabel}</span>
                    </td>
                    <td>{labelEntidadAuditoria(log.entidad)}</td>
                    <td>
                      <div className="font-medium">{log.entidadLabel ?? log.entidadId ?? "—"}</div>
                      {log.entidadId ? (
                        <div className="font-mono text-xs text-ink-secondary">{log.entidadId}</div>
                      ) : null}
                    </td>
                    <td className="text-sm text-ink-secondary">{resumenAuditoria(log)}</td>
                    <td>
                      {log.cambios || log.metadata ? (
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => setExpandido(expandido === log.id ? null : log.id)}
                        >
                          {expandido === log.id ? "Ocultar" : "Ver"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                  {expandido === log.id ? (
                    <tr>
                      <td colSpan={7} className="bg-surface-soft/60 p-4">
                        {log.cambios ? (
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-ink">Cambios por campo</h3>
                            <div className="space-y-2">
                              {Object.entries(log.cambios).map(([campo, cambio]) => (
                                <div key={campo} className="panel-soft p-3 text-sm">
                                  <div className="font-medium text-ink">{campo}</div>
                                  <div className="mt-1 grid gap-2 md:grid-cols-2">
                                    <div>
                                      <span className="text-xs uppercase text-ink-secondary">Antes</span>
                                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">
                                        {JSON.stringify(cambio.antes, null, 2)}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="text-xs uppercase text-ink-secondary">Después</span>
                                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">
                                        {JSON.stringify(cambio.despues, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {log.metadata ? (
                          <div className={log.cambios ? "mt-4" : ""}>
                            <h3 className="text-sm font-semibold text-ink">Metadata</h3>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-surface p-3 font-mono text-xs">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
            </TableWrap>
          </div>
        </>
      ) : null}
    </div>
  );
}
