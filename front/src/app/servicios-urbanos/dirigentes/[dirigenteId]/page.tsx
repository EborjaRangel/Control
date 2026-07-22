"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import {
  estatusBadgeClass,
  formatReporteFecha,
  type DirigenteServiciosUrbanosPanelDTO,
} from "@/lib/servicios-urbanos";
import { SemaforoLeyenda, SemaforoTiempoReporte } from "@/components/SemaforoTiempoReporte";
import { etiquetaSeccion } from "@/lib/secciones-electorales";

export default function DirigenteServiciosUrbanosPage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const { isStaff, user } = useAuth();
  const canAccess = isStaff || canViewOwnDirigente(user, dirigenteId);
  const canCreate = canAccess;
  const [panel, setPanel] = useState<DirigenteServiciosUrbanosPanelDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/servicios-urbanos/dirigentes/${dirigenteId}`);
      if (!res.ok) throw new Error("Dirigente no encontrado");
      setPanel((await res.json()) as DirigenteServiciosUrbanosPanelDTO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [dirigenteId]);

  useEffect(() => {
    if (!canAccess) return;
    void load();
  }, [load, canAccess]);

  if (!canAccess) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "No encontrado"}</div>
        <Link href="/servicios-urbanos" className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  const d = panel.dirigente;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">{d.nombreCompleto}</h1>
          <p className="page-subtitle">
            {TIPO_DIRIGENTE_LABEL[d.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ?? d.tipo} ·{" "}
            {d.colonia} · {etiquetaSeccion(d.seccionElectoral)}
          </p>
        </div>
        <div className="page-actions">
          {canCreate ? (
            <Link
              href={`/servicios-urbanos/dirigentes/${dirigenteId}/nuevo`}
              className="btn-primary btn-responsive"
            >
              + Nuevo reporte
            </Link>
          ) : null}
          {isStaff ? (
            <Link href="/servicios-urbanos" className="btn-ghost btn-responsive">
              Volver a dirigentes
            </Link>
          ) : user?.dirigenteId ? (
            <Link
              href={`/dirigentes/${user.dirigenteId}/consultar`}
              className="btn-ghost btn-responsive"
            >
              Volver a mi ficha
            </Link>
          ) : null}
        </div>
      </div>

      {!d.activo ? (
        <p className="alert-warning">Este dirigente está dado de baja.</p>
      ) : null}

      <div className="card text-center">
        <p className="text-2xl font-bold text-pin">{d.reportesActivos}</p>
        <p className="text-xs text-ink-secondary">Reportes de servicios urbanos</p>
      </div>

      <section className="card-section space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Reportes</h2>
          <SemaforoLeyenda />
        </div>
        {panel.reportes.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            {canCreate ? (
              <>
                Aún no hay reportes.{" "}
                <Link
                  href={`/servicios-urbanos/dirigentes/${dirigenteId}/nuevo`}
                  className="font-medium text-pin hover:underline"
                >
                  Registrar el primero
                </Link>
              </>
            ) : (
              "Aún no hay reportes registrados."
            )}
          </p>
        ) : (
          <>
            <ul className="mobile-only-list">
              {panel.reportes.map((rep) => (
                <li key={rep.id} className="list-card">
                  <div className="list-card-header">
                    <div className="min-w-0">
                      <Link
                        href={`/servicios-urbanos/${rep.id}`}
                        className="break-words font-bold text-pin hover:underline"
                      >
                        {rep.folio}
                      </Link>
                      <p className="mt-1 font-medium text-ink">{rep.tipoLabel}</p>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {formatReporteFecha(rep.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <SemaforoTiempoReporte createdAt={rep.createdAt} compact showLabel />
                      <span className={`${estatusBadgeClass(rep.estatus)} shrink-0`}>
                        {rep.estatusLabel}
                      </span>
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
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-ink-secondary">
                      <th className="py-2 pr-3">Semáforo</th>
                      <th className="py-2 pr-3">Folio</th>
                      <th className="py-2 pr-3">Servicio</th>
                      <th className="py-2 pr-3">Estatus</th>
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {panel.reportes.map((rep) => (
                      <tr key={rep.id} className="border-b border-line/60">
                        <td className="py-2.5 pr-3">
                          <SemaforoTiempoReporte createdAt={rep.createdAt} compact showLabel />
                        </td>
                        <td className="py-2.5 pr-3">
                          <Link
                            href={`/servicios-urbanos/${rep.id}`}
                            className="font-mono font-medium text-pin hover:underline"
                          >
                            {rep.folio}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3">{rep.tipoLabel}</td>
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
        )}
      </section>
    </div>
  );
}
