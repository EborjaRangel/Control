"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { formatAsambleaFecha, type DirigenteAsambleasPanelDTO } from "@/lib/asambleas";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import { etiquetaSeccion } from "@/lib/secciones-electorales";

export default function DirigenteAsambleasPage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const { isStaff, user } = useAuth();
  const canAccess = isStaff || canViewOwnDirigente(user, dirigenteId);
  const [panel, setPanel] = useState<DirigenteAsambleasPanelDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/asambleas/dirigentes/${dirigenteId}`);
      if (!res.ok) throw new Error("Dirigente no encontrado");
      setPanel((await res.json()) as DirigenteAsambleasPanelDTO);
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
        <Link href="/" className="btn-secondary btn-responsive">
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
          <h1 className="page-title">Mis Asambleas</h1>
          <p className="page-subtitle">
            {d.nombreCompleto} ·{" "}
            {TIPO_DIRIGENTE_LABEL[d.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ?? d.tipo} ·{" "}
            {etiquetaSeccion(d.seccionElectoral)}
          </p>
        </div>
        <div className="page-actions">
          <Link
            href={`/asambleas/dirigentes/${dirigenteId}/nuevo`}
            className="btn-primary btn-responsive"
          >
            + Registrar asamblea
          </Link>
          {isStaff ? (
            <Link href="/" className="btn-ghost btn-responsive">
              Volver
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-pin">{panel.asambleas.length}</p>
          <p className="text-xs text-ink-secondary">Asambleas registradas</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-ink">
            {panel.asambleas.reduce((sum, a) => sum + a.cantidadConvocada, 0)}
          </p>
          <p className="text-xs text-ink-secondary">Total convocados</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-ink">
            {panel.asambleas.reduce((sum, a) => sum + a.cantidadReal, 0)}
          </p>
          <p className="text-xs text-ink-secondary">Total asistencia real</p>
        </div>
      </div>

      <section className="card-section space-y-4">
        <h2 className="section-title">Historial</h2>
        {panel.asambleas.length === 0 ? (
          <p className="text-sm text-ink-secondary">Aún no hay asambleas registradas.</p>
        ) : (
          <TableWrap>
            <table className="table-compact">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Lugar</th>
                  <th>Convocados</th>
                  <th>Real</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {panel.asambleas.map((a) => (
                  <tr key={a.id}>
                    <td>{formatAsambleaFecha(a.fecha, a.hora)}</td>
                    <td className="max-w-xs truncate">{a.lugar}</td>
                    <td>{a.cantidadConvocada}</td>
                    <td>{a.cantidadReal}</td>
                    <td className="text-right">
                      <Link href={`/asambleas/${a.id}`} className="btn-ghost btn-sm">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>
    </div>
  );
}
