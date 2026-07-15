"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ProgressBar } from "@/components/ProgressBar";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { nombreColoniaCatalogo } from "@/lib/colonias";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import type { DirigenteDetectadosDTO } from "@/lib/detectados";
import { etiquetaSeccion } from "@/lib/secciones-electorales";

export default function DetectadosPage() {
  const pathname = usePathname();
  const { isStaff } = useAuth();
  const [dirigentes, setDirigentes] = useState<DirigenteDetectadosDTO[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set("buscar", buscar.trim());
      const res = await apiFetch(`/api/detectados/dirigentes?${params.toString()}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar dirigentes");
      }
      setDirigentes((await res.json()) as DirigenteDetectadosDTO[]);
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
          <h1 className="page-title">Detectados</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : `${dirigentes.length} dirigente(s) · Selecciona uno para ver o asignar detectados`}
          </p>
        </div>
      </div>

      <div className="card">
        <input
          type="search"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar dirigente por nombre, sección o colonia…"
          className="input-search"
        />
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando dirigentes…
        </div>
      ) : null}

      {!loading && dirigentes.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="font-semibold text-ink">No hay dirigentes registrados</p>
          <p className="mt-1 text-sm text-ink-secondary">
            Primero debes dar de alta dirigentes para asignarles detectados.
          </p>
          <Link href="/dirigentes/nuevo" className="btn-primary mt-6 inline-flex">
            Crear dirigente
          </Link>
        </div>
      ) : null}

      {!loading && dirigentes.length > 0 ? (
        <>
          <ul className="mobile-only-list">
            {dirigentes.map((d) => (
              <li key={d.id} className="list-card-interactive">
                <Link href={`/detectados/dirigentes/${d.id}`} className="block space-y-3">
                  <div className="list-card-header">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-ink">{d.nombreCompleto}</p>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {TIPO_DIRIGENTE_LABEL[d.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ?? d.tipo}
                        {" · "}
                        {nombreColoniaCatalogo(d.colonia)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-secondary">
                        {etiquetaSeccion(d.seccionElectoral)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-pin">{d.detectadosAsignados}</p>
                      <p className="text-[10px] text-ink-secondary">detectados</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-ink-secondary">Meta: {d.metaDetectados}</span>
                    <span className="font-medium text-ink">Avance {d.avancePct}%</span>
                  </div>
                  <ProgressBar value={d.avancePct} size="sm" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="card-section desktop-only-table">
            <TableWrap>
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-secondary">
                    <th className="py-2 pr-3">Dirigente</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Colonia</th>
                    <th className="py-2 pr-3 text-center">Detectados</th>
                    <th className="py-2 pr-3 text-center">Meta</th>
                    <th className="py-2 pr-3 text-center">Avance</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {dirigentes.map((d) => (
                    <tr key={d.id} className="border-b border-line/60 hover:bg-surface-muted/50">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/detectados/dirigentes/${d.id}`}
                          className="font-medium text-pin hover:underline"
                        >
                          {d.nombreCompleto}
                        </Link>
                        {!d.activo ? (
                          <span className="ml-2 badge-muted text-[10px]">Baja</span>
                        ) : null}
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          {etiquetaSeccion(d.seccionElectoral)}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 text-ink-secondary">
                        {TIPO_DIRIGENTE_LABEL[d.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ?? d.tipo}
                      </td>
                      <td className="py-2.5 pr-3 text-ink-secondary">
                        {nombreColoniaCatalogo(d.colonia)}
                      </td>
                      <td className="py-2.5 pr-3 text-center font-semibold text-pin">
                        {d.detectadosAsignados}
                      </td>
                      <td className="py-2.5 pr-3 text-center">{d.metaDetectados}</td>
                      <td className="py-2.5 pr-3 text-center">
                        <span className="font-medium">{d.avancePct}%</span>
                        <ProgressBar value={d.avancePct} size="sm" className="mx-auto mt-1 max-w-[5rem]" />
                      </td>
                      <td className="py-2.5 text-right">
                        <Link
                          href={`/detectados/dirigentes/${d.id}`}
                          className="btn-ghost btn-sm"
                        >
                          Ver detectados
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
