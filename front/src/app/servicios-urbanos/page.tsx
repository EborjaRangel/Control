"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { nombreColoniaCatalogo } from "@/lib/colonias";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import type { DirigenteServiciosUrbanosDTO } from "@/lib/servicios-urbanos";
import { etiquetaSeccion } from "@/lib/secciones-electorales";

export default function ServiciosUrbanosPage() {
  const pathname = usePathname();
  const { isStaff } = useAuth();
  const [dirigentes, setDirigentes] = useState<DirigenteServiciosUrbanosDTO[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set("buscar", buscar.trim());
      const res = await apiFetch(`/api/servicios-urbanos/dirigentes?${params.toString()}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar dirigentes");
      }
      setDirigentes((await res.json()) as DirigenteServiciosUrbanosDTO[]);
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
              : `${dirigentes.length} dirigente(s) · Reportes con fotos antes/después y georreferencia`}
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
        </div>
      ) : null}

      {!loading && dirigentes.length > 0 ? (
        <>
          <ul className="mobile-only-list">
            {dirigentes.map((d) => (
              <li key={d.id} className="list-card-interactive">
                <Link href={`/servicios-urbanos/dirigentes/${d.id}`} className="block">
                  <div className="list-card-header">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-pin">{d.nombreCompleto}</p>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {TIPO_DIRIGENTE_LABEL[d.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ??
                          d.tipo}{" "}
                        · {nombreColoniaCatalogo(d.colonia)} · {etiquetaSeccion(d.seccionElectoral)}
                      </p>
                    </div>
                    <span className="badge-pin">{d.reportesActivos} reporte(s)</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="desktop-only-table">
            <TableWrap>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-secondary">
                    <th className="py-2 pr-3">Dirigente</th>
                    <th className="py-2 pr-3">Colonia</th>
                    <th className="py-2 pr-3">Sección</th>
                    <th className="py-2 pr-3">Reportes</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {dirigentes.map((d) => (
                    <tr key={d.id} className="border-b border-line/60">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/servicios-urbanos/dirigentes/${d.id}`}
                          className="font-medium text-pin hover:underline"
                        >
                          {d.nombreCompleto}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-ink-secondary">
                        {nombreColoniaCatalogo(d.colonia)}
                      </td>
                      <td className="py-2.5 pr-3 text-ink-secondary">
                        {etiquetaSeccion(d.seccionElectoral)}
                      </td>
                      <td className="py-2.5 pr-3">{d.reportesActivos}</td>
                      <td className="py-2.5 text-right">
                        <Link
                          href={`/servicios-urbanos/dirigentes/${d.id}`}
                          className="btn-ghost btn-sm"
                        >
                          Ver reportes
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
