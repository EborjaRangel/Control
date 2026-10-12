"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import {
  ESTADO_ENTREGA_LABEL,
  badgeEstadoEntrega,
  formatFechaMaterial,
  type EventoEntregaMaterialDTO,
} from "@/lib/material";

export default function MaterialAdminPage() {
  const { isStaff } = useAuth();
  const [eventos, setEventos] = useState<EventoEntregaMaterialDTO[]>([]);
  const [filtro, setFiltro] = useState<"activos" | "todos" | "cerrados">("activos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q =
        filtro === "activos" ? "?activos=true" : filtro === "cerrados" ? "?cerrados=true" : "";
      const res = await apiFetch(`/api/material/eventos${q}`);
      if (!res.ok) throw new Error("No se pudieron cargar las entregas");
      setEventos((await res.json()) as EventoEntregaMaterialDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    if (isStaff) void load();
  }, [isStaff, load]);

  if (!isStaff) return null;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Material</h1>
          <p className="page-subtitle">Entregas de material con confirmación por QR</p>
        </div>
        <div className="page-actions">
          <Link href="/material/nuevo" className="btn-primary btn-responsive">
            Nueva entrega
          </Link>
        </div>
      </div>

      <label className="block max-w-md">
        <span className="label">Filtrar</span>
        <select className="input mt-1" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
          <option value="activos">Activas (programadas y abiertas)</option>
          <option value="todos">Todas</option>
          <option value="cerrados">Cerradas</option>
        </select>
      </label>

      {loading ? <p className="text-ink-secondary">Cargando…</p> : null}
      {error ? <div className="alert-error">{error}</div> : null}

      {!loading && eventos.length === 0 ? (
        <div className="alert-info">No hay entregas registradas.</div>
      ) : null}

      <ul className="space-y-3">
        {eventos.map((e) => (
          <li key={e.id}>
            <Link href={`/material/eventos/${e.id}`} className="list-card block hover:border-pin">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{e.titulo}</p>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Vigencia: {formatFechaMaterial(e.fechaInicio)} — {formatFechaMaterial(e.fechaFin)}
                    {!e.vigente && e.estado !== "CERRADO" ? " · Fuera de vigencia" : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink-secondary">
                    {e.totalParticipantes ?? 0} convocados · {e.totalEntregas ?? 0} entregas confirmadas
                  </p>
                </div>
                <span className={badgeEstadoEntrega(e.estado)}>{ESTADO_ENTREGA_LABEL[e.estado]}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
