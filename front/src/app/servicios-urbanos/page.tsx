"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SemaforoLeyenda, SemaforoTiempoReporte, semaforoInputFromReporte } from "@/components/SemaforoTiempoReporte";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import {
  estatusBadgeClass,
  formatReporteFecha,
  type ReporteServicioUrbanoDTO,
} from "@/lib/servicios-urbanos";

export default function ServiciosUrbanosPage() {
  const pathname = usePathname();
  const { isStaff } = useAuth();
  const [reportes, setReportes] = useState<ReporteServicioUrbanoDTO[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set("buscar", buscar.trim());
      const res = await apiFetch(`/api/servicios-urbanos?${params.toString()}`);
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
  }, [buscar]);

  useEffect(() => {
    if (!isStaff) return;
    const timer = setTimeout(() => {
      void load();
    }, buscar ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, buscar, pathname, isStaff]);

  if (!isStaff) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Servicios urbanos</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : `${reportes.length} reporte(s) · Del más reciente al más antiguo`}
          </p>
        </div>
        <div className="page-actions">
          <Link href="/servicios-urbanos/panel" className="btn-secondary btn-responsive">
            Panel de control
          </Link>
        </div>
      </div>

      <div className="card space-y-3">
        <input
          type="search"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar por folio, dirección, colonia o dirigente…"
          className="input-search"
        />
        <SemaforoLeyenda />
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando reportes…
        </div>
      ) : null}

      {!loading && reportes.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="font-semibold text-ink">No hay reportes registrados</p>
        </div>
      ) : null}

      {!loading && reportes.length > 0 ? (
        <>
          <ul className="mobile-only-list">
            {reportes.map((rep) => (
              <li key={rep.id} className="list-card">
                <div className="list-card-header">
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono font-bold text-pin">{rep.folio}</p>
                    <p className="font-medium text-ink">{rep.tipoLabel}</p>
                    <p className="text-xs text-ink-secondary">
                      {rep.dirigente?.nombreCompleto ?? "—"} · {formatReporteFecha(rep.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <SemaforoTiempoReporte {...semaforoInputFromReporte(rep)} compact showLabel />
                    <span className={estatusBadgeClass(rep.estatus)}>{rep.estatusLabel}</span>
                  </div>
                </div>
                <Link href={`/servicios-urbanos/${rep.id}`} className="btn-ghost btn-sm btn-responsive">
                  Ver detalle
                </Link>
              </li>
            ))}
          </ul>

          <div className="desktop-only-table">
            <TableWrap>
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-secondary">
                    <th className="py-2 pr-3">Semáforo</th>
                    <th className="py-2 pr-3">Folio</th>
                    <th className="py-2 pr-3">Servicio</th>
                    <th className="py-2 pr-3">Dirigente</th>
                    <th className="py-2 pr-3">Estatus</th>
                    <th className="py-2 pr-3">Reportado</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {reportes.map((rep) => (
                    <tr key={rep.id} className="border-b border-line/60">
                      <td className="py-2.5 pr-3">
                        <SemaforoTiempoReporte {...semaforoInputFromReporte(rep)} compact showLabel />
                      </td>
                      <td className="py-2.5 pr-3 font-mono font-medium text-pin">{rep.folio}</td>
                      <td className="py-2.5 pr-3">{rep.tipoLabel}</td>
                      <td className="py-2.5 pr-3">{rep.dirigente?.nombreCompleto ?? "—"}</td>
                      <td className="py-2.5 pr-3">
                        <span className={estatusBadgeClass(rep.estatus)}>{rep.estatusLabel}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-ink-secondary">
                        {formatReporteFecha(rep.createdAt)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link href={`/servicios-urbanos/${rep.id}`} className="btn-ghost btn-sm">
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
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
