"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ReporteEstatusStaffActions } from "@/components/ReporteEstatusStaffActions";
import { SemaforoLeyenda, SemaforoTiempoReporte, semaforoInputFromReporte } from "@/components/SemaforoTiempoReporte";
import { ServiciosUrbanosMapa } from "@/components/ServiciosUrbanosMapa";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { NOMBRES_COLONIAS_COYOACAN } from "@/lib/colonias";
import {
  ESTATUS_SERVICIO_URBANO,
  TIPOS_SERVICIO_URBANO,
  buildServiciosUrbanosQuery,
  estatusBadgeClass,
  formatReporteFecha,
  type DirigenteServiciosUrbanosDTO,
  type ReporteServicioUrbanoDTO,
  type ServiciosUrbanosFiltros,
} from "@/lib/servicios-urbanos";
import {
  DISTRITOS_FEDERALES_COYOACAN,
  DISTRITOS_LOCALES_COYOACAN,
  SECCIONES_ELECTORALES_COYOACAN,
  etiquetaSeccion,
} from "@/lib/secciones-electorales";
import { etiquetaUnidadTerritorial, type UnidadTerritorialResumen } from "@/lib/unidades-territoriales";

const EMPTY_FILTROS: ServiciosUrbanosFiltros = {
  buscar: "",
  tipo: "",
  estatus: "",
  dirigenteId: "",
  colonia: "",
  seccionElectoral: "",
  unidadTerritorialId: "",
  distritoLocal: "",
  distritoFederal: "",
};

export default function ServiciosUrbanosPanelPage() {
  const { isStaff } = useAuth();
  const [filtros, setFiltros] = useState<ServiciosUrbanosFiltros>(EMPTY_FILTROS);
  const [reportes, setReportes] = useState<ReporteServicioUrbanoDTO[]>([]);
  const [dirigentes, setDirigentes] = useState<DirigenteServiciosUrbanosDTO[]>([]);
  const [uts, setUts] = useState<UnidadTerritorialResumen[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReportes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildServiciosUrbanosQuery(filtros);
      const res = await apiFetch(`/api/servicios-urbanos?${query}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar reportes");
      }
      setReportes((await res.json()) as ReporteServicioUrbanoDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    if (!isStaff) return;
    const timer = setTimeout(() => {
      void loadReportes();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadReportes, isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    void apiFetch("/api/servicios-urbanos/dirigentes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDirigentes(data as DirigenteServiciosUrbanosDTO[]))
      .catch(() => setDirigentes([]));
    void apiFetch("/api/unidades-territoriales/catalogo")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setUts(data as UnidadTerritorialResumen[]))
      .catch(() => setUts([]));
  }, [isStaff]);

  const resumen = useMemo(() => {
    return {
      total: reportes.length,
      enviado: reportes.filter((r) => r.estatus === "ENVIADO").length,
      recibido: reportes.filter((r) => r.estatus === "RECIBIDO").length,
      atendido: reportes.filter((r) => r.estatus === "ATENDIDO").length,
      desechado: reportes.filter((r) => r.estatus === "DESECHADO").length,
    };
  }, [reportes]);

  function setFiltro<K extends keyof ServiciosUrbanosFiltros>(key: K, value: ServiciosUrbanosFiltros[K]) {
    setFiltros((prev) => ({ ...prev, [key]: value }));
    setSelectedId(null);
  }

  if (!isStaff) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de control</h1>
          <p className="page-subtitle">
            Todos los reportes de servicios urbanos · Mapa, semáforo de tiempo y gestión de estatus
          </p>
        </div>
        <div className="page-actions">
          <Link href="/servicios-urbanos" className="btn-ghost btn-responsive">
            Por dirigente
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card text-center">
          <p className="text-2xl font-bold text-pin">{resumen.total}</p>
          <p className="text-xs text-ink-secondary">Total</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-pin">{resumen.enviado}</p>
          <p className="text-xs text-ink-secondary">Enviados</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-warning-text">{resumen.recibido}</p>
          <p className="text-xs text-ink-secondary">Recibidos</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-success-text">{resumen.atendido}</p>
          <p className="text-xs text-ink-secondary">Atendidos</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-ink-secondary">{resumen.desechado}</p>
          <p className="text-xs text-ink-secondary">Desechados</p>
        </div>
      </div>

      <section className="card space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="label xl:col-span-2">
            Buscar
            <input
              type="search"
              value={filtros.buscar ?? ""}
              onChange={(e) => setFiltro("buscar", e.target.value)}
              placeholder="Folio, dirección, dirigente…"
              className="input"
            />
          </label>
          <label className="label">
            Tipo de servicio
            <select
              className="input"
              value={filtros.tipo ?? ""}
              onChange={(e) => setFiltro("tipo", e.target.value as ServiciosUrbanosFiltros["tipo"])}
            >
              <option value="">Todos</option>
              {TIPOS_SERVICIO_URBANO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Estatus
            <select
              className="input"
              value={filtros.estatus ?? ""}
              onChange={(e) =>
                setFiltro("estatus", e.target.value as ServiciosUrbanosFiltros["estatus"])
              }
            >
              <option value="">Todos</option>
              {ESTATUS_SERVICIO_URBANO.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <label className="label xl:col-span-2">
            Dirigente
            <select
              className="input"
              value={filtros.dirigenteId ?? ""}
              onChange={(e) => setFiltro("dirigenteId", e.target.value)}
            >
              <option value="">Todos</option>
              {dirigentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombreCompleto}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Colonia
            <select
              className="input"
              value={filtros.colonia ?? ""}
              onChange={(e) => setFiltro("colonia", e.target.value)}
            >
              <option value="">Todas</option>
              {NOMBRES_COLONIAS_COYOACAN.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Unidad territorial
            <select
              className="input"
              value={filtros.unidadTerritorialId ?? ""}
              onChange={(e) => setFiltro("unidadTerritorialId", e.target.value)}
            >
              <option value="">Todas</option>
              {uts.map((ut) => (
                <option key={ut.id} value={ut.id}>
                  {etiquetaUnidadTerritorial(ut)}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Distrito local
            <select
              className="input"
              value={filtros.distritoLocal ?? ""}
              onChange={(e) => setFiltro("distritoLocal", e.target.value)}
            >
              <option value="">Todos</option>
              {DISTRITOS_LOCALES_COYOACAN.map((d) => (
                <option key={d} value={String(d)}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Distrito federal
            <select
              className="input"
              value={filtros.distritoFederal ?? ""}
              onChange={(e) => setFiltro("distritoFederal", e.target.value)}
            >
              <option value="">Todos</option>
              {DISTRITOS_FEDERALES_COYOACAN.map((d) => (
                <option key={d} value={String(d)}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Sección electoral
            <select
              className="input"
              value={filtros.seccionElectoral ?? ""}
              onChange={(e) => setFiltro("seccionElectoral", e.target.value)}
            >
              <option value="">Todas</option>
              {SECCIONES_ELECTORALES_COYOACAN.map((s) => (
                <option key={s} value={s}>
                  {etiquetaSeccion(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <SemaforoLeyenda />
      </section>

      {error ? <div className="alert-error">{error}</div> : null}

      <section className="space-y-3">
        <h2 className="section-title">Mapa de reportes</h2>
        {loading ? (
          <div className="flex h-[420px] items-center justify-center rounded-pin bg-surface-muted text-ink-secondary">
            Cargando mapa…
          </div>
        ) : (
          <ServiciosUrbanosMapa
            reportes={reportes}
            selectedId={selectedId}
            onSelect={(r) => setSelectedId(r.id)}
          />
        )}
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">Listado ({reportes.length})</h2>
        {loading ? (
          <div className="flex items-center gap-3 text-ink-secondary">
            <span className="size-5 animate-pulse rounded-full bg-pin-light" />
            Cargando reportes…
          </div>
        ) : reportes.length === 0 ? (
          <p className="text-sm text-ink-secondary">No hay reportes con los filtros seleccionados.</p>
        ) : (
          <>
            <ul className="mobile-only-list">
              {reportes.map((rep) => (
                <li
                  key={rep.id}
                  className={`list-card ${selectedId === rep.id ? "ring-2 ring-pin" : ""}`}
                >
                  <div className="list-card-header">
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/servicios-urbanos/${rep.id}`}
                        className="font-mono font-bold text-pin hover:underline"
                      >
                        {rep.folio}
                      </Link>
                      <p className="font-medium">{rep.tipoLabel}</p>
                      <p className="text-xs text-ink-secondary">
                        {rep.dirigente?.nombreCompleto ?? "—"} · {formatReporteFecha(rep.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <SemaforoTiempoReporte {...semaforoInputFromReporte(rep)} compact showLabel />
                      <span className={estatusBadgeClass(rep.estatus)}>{rep.estatusLabel}</span>
                    </div>
                  </div>
                  <ReporteEstatusStaffActions
                    reporte={rep}
                    onUpdated={loadReportes}
                    compact
                  />
                </li>
              ))}
            </ul>

            <div className="desktop-only-table">
              <TableWrap>
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-ink-secondary">
                      <th className="py-2 pr-3">Semáforo</th>
                      <th className="py-2 pr-3">Folio</th>
                      <th className="py-2 pr-3">Servicio</th>
                      <th className="py-2 pr-3">Dirigente</th>
                      <th className="py-2 pr-3">Colonia</th>
                      <th className="py-2 pr-3">Estatus</th>
                      <th className="py-2 pr-3">Reportado</th>
                      <th className="py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportes.map((rep) => (
                      <tr
                        key={rep.id}
                        className={`border-b border-line/60 ${selectedId === rep.id ? "bg-pin-light/40" : ""}`}
                        onClick={() => setSelectedId(rep.id)}
                      >
                        <td className="py-2.5 pr-3">
                          <SemaforoTiempoReporte {...semaforoInputFromReporte(rep)} compact showLabel />
                        </td>
                        <td className="py-2.5 pr-3">
                          <Link
                            href={`/servicios-urbanos/${rep.id}`}
                            className="font-mono font-medium text-pin hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {rep.folio}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3">{rep.tipoLabel}</td>
                        <td className="py-2.5 pr-3">{rep.dirigente?.nombreCompleto ?? "—"}</td>
                        <td className="py-2.5 pr-3 text-ink-secondary">{rep.colonia ?? "—"}</td>
                        <td className="py-2.5 pr-3">
                          <span className={estatusBadgeClass(rep.estatus)}>{rep.estatusLabel}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-ink-secondary">
                          {formatReporteFecha(rep.createdAt)}
                        </td>
                        <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                          <ReporteEstatusStaffActions reporte={rep} onUpdated={loadReportes} compact />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
