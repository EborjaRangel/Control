"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import { NOMBRES_COLONIAS_COYOACAN, nombreColoniaCatalogo } from "@/lib/colonias";
import type { DirigenteRepresentantesDTO } from "@/lib/rc-rg";
import { etiquetaSeccion } from "@/lib/secciones-electorales";

function enlaceRepresentantes(d: DirigenteRepresentantesDTO) {
  return d.rcId ? `/rc/${d.rcId}` : `/rc/por-dirigente/${d.id}`;
}

export default function RcPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, user } = useAuth();
  const [dirigentes, setDirigentes] = useState<DirigenteRepresentantesDTO[]>([]);
  const [buscar, setBuscar] = useState("");
  const [colonia, setColonia] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hayFiltros = Boolean(buscar.trim() || colonia);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (user?.rol === "RC" && user.rcId) {
        router.replace(`/rc/${user.rcId}`);
        return;
      }

      const params = new URLSearchParams();
      if (buscar.trim()) params.set("buscar", buscar.trim());
      if (colonia) params.set("colonia", colonia);
      const res = await apiFetch(`/api/rc/dirigentes?${params.toString()}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar dirigentes");
      }
      setDirigentes((await res.json()) as DirigenteRepresentantesDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [buscar, colonia, user?.rol, user?.rcId, router]);

  useEffect(() => {
    if (!isAdmin && user?.rol !== "RC") return;
    const t = setTimeout(() => void load(), buscar ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, buscar, colonia, pathname, isAdmin, user?.rol]);

  if (user?.rol === "RC") {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando panel…
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Representantes de casilla</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : colonia
                ? `${dirigentes.length} dirigente(s) en ${colonia}`
                : `${dirigentes.length} dirigente(s) · Selecciona uno para ver o registrar representantes`}
          </p>
        </div>
        <Link href="/rc/nuevo" className="btn-primary btn-responsive">
          + Nuevo Rep. Casilla
        </Link>
      </div>

      <div className="card flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1">
          <span className="label">Buscar</span>
          <input
            type="search"
            className="input mt-1 input-search"
            placeholder="Nombre, sección o colonia…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </label>
        <label className="block w-full sm:max-w-md">
          <span className="label">Colonia</span>
          <select
            className="input mt-1"
            value={colonia}
            onChange={(e) => setColonia(e.target.value)}
          >
            <option value="">Todas las colonias</option>
            {NOMBRES_COLONIAS_COYOACAN.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {hayFiltros ? (
          <button
            type="button"
            className="btn-ghost btn-responsive shrink-0"
            onClick={() => {
              setBuscar("");
              setColonia("");
            }}
          >
            Limpiar filtros
          </button>
        ) : null}
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
          {hayFiltros ? (
            <>
              <p className="font-semibold text-ink">Sin resultados</p>
              <p className="mt-1 text-sm text-ink-secondary">
                No hay dirigentes que coincidan con los filtros seleccionados.
              </p>
              <button
                type="button"
                className="btn-secondary mt-6 inline-flex"
                onClick={() => {
                  setBuscar("");
                  setColonia("");
                }}
              >
                Limpiar filtros
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold text-ink">No hay dirigentes registrados</p>
              <p className="mt-1 text-sm text-ink-secondary">
                Primero debes dar de alta dirigentes para asignarles representantes de casilla.
              </p>
              <Link href="/dirigentes/nuevo" className="btn-primary mt-6 inline-flex">
                Crear dirigente
              </Link>
            </>
          )}
        </div>
      ) : null}

      {!loading && dirigentes.length > 0 ? (
        <>
          <ul className="mobile-only-list">
            {dirigentes.map((d) => (
              <li key={d.id} className="list-card">
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
                    <p className="text-lg font-bold text-pin">{d.representantesRegistrados}</p>
                    <p className="text-[10px] text-ink-secondary">representantes</p>
                  </div>
                </div>
                <p className="text-xs text-ink-secondary">
                  Rep. Casilla:{" "}
                  {d.rcId ? (d.repCasillaActivo ? "Activo" : "Baja") : "Sin asignar"}
                  {!d.activo ? " · Dirigente de baja" : null}
                </p>
                <Link href={enlaceRepresentantes(d)} className="btn-primary btn-sm btn-responsive">
                  Ver representantes
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
                    <th className="py-2 pr-3 text-center">Representantes</th>
                    <th className="py-2 pr-3 text-center">Rep. Casilla</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {dirigentes.map((d) => (
                    <tr key={d.id} className="border-b border-line/60 hover:bg-surface-muted/50">
                      <td className="py-2.5 pr-3">
                        <span className="font-medium text-ink">{d.nombreCompleto}</span>
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
                        {d.representantesRegistrados}
                      </td>
                      <td className="py-2.5 pr-3 text-center text-ink-secondary">
                        {d.rcId ? (d.repCasillaActivo ? "Activo" : "Baja") : "Sin asignar"}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link href={enlaceRepresentantes(d)} className="btn-ghost btn-sm">
                          Ver representantes
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
