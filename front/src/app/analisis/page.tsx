"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import {
  formatElectores,
  type AnalisisSeccionRow,
  type AnalisisSeccionesResponse,
} from "@/lib/analisis";

export default function AnalisisPage() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [data, setData] = useState<AnalisisSeccionesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distritoLocal, setDistritoLocal] = useState("");
  const [buscar, setBuscar] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/analisis/secciones");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar análisis");
      }
      setData((await res.json()) as AnalisisSeccionesResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load, pathname]);

  const filas = useMemo(() => {
    if (!data) return [];
    const q = buscar.trim().toLowerCase();
    return data.filas.filter((fila) => {
      if (distritoLocal && String(fila.distritoLocal ?? "") !== distritoLocal) return false;
      if (!q) return true;
      return (
        fila.seccion.includes(q) ||
        fila.casillas.toLowerCase().includes(q) ||
        fila.unidadesTerritoriales.toLowerCase().includes(q) ||
        fila.colonias.toLowerCase().includes(q)
      );
    });
  }, [data, buscar, distritoLocal]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Análisis</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : data
                ? `${filas.length} de ${data.totalSecciones} secciones · ordenadas por casillas (mayor a menor)${data.vigencia ? ` · INE ${data.vigencia}` : ""}`
                : "Secciones electorales por volumen de casillas y electores"}
          </p>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      <section className="card-section grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label" htmlFor="analisis-buscar">
            Buscar
          </label>
          <input
            id="analisis-buscar"
            className="input"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Sección, UT, colonia…"
          />
        </div>
        <div>
          <label className="label" htmlFor="analisis-distrito">
            Distrito local
          </label>
          <select
            id="analisis-distrito"
            className="input"
            value={distritoLocal}
            onChange={(e) => setDistritoLocal(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="26">26</option>
            <option value="30">30</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando análisis…
        </div>
      ) : null}

      {!loading && filas.length === 0 ? (
        <p className="text-sm text-ink-secondary">No hay secciones con los filtros actuales.</p>
      ) : null}

      {!loading && filas.length > 0 ? (
        <>
          <ul className="mobile-only-list">
            {filas.map((fila) => (
              <AnalisisCard key={fila.seccion} fila={fila} />
            ))}
          </ul>

          <div className="desktop-only-table">
            <TableWrap>
              <table className="data-table min-w-[1100px]">
                <thead>
                  <tr>
                    <th>Sección</th>
                    <th>Casillas</th>
                    <th>UT</th>
                    <th>Colonia</th>
                    <th className="text-right">Electores</th>
                    <th>D. local</th>
                    <th>D. federal</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.seccion}>
                      <td className="whitespace-nowrap font-semibold">{fila.seccion}</td>
                      <td>
                        <div className="font-medium">{fila.totalCasillas}</div>
                        <div className="text-xs text-ink-secondary">{fila.casillas}</div>
                      </td>
                      <td className="max-w-[220px] break-words text-sm">{fila.unidadesTerritoriales}</td>
                      <td className="max-w-[260px] break-words text-sm">{fila.colonias}</td>
                      <td className="whitespace-nowrap text-right font-medium">
                        {formatElectores(fila.totalElectores)}
                      </td>
                      <td className="whitespace-nowrap">{fila.distritoLocal ?? "—"}</td>
                      <td className="whitespace-nowrap">{fila.distritoFederal ?? "—"}</td>
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

function AnalisisCard({ fila }: { fila: AnalisisSeccionRow }) {
  return (
    <li className="list-card space-y-3">
      <div className="list-card-header">
        <div>
          <p className="text-xs text-ink-secondary">Sección electoral</p>
          <p className="text-lg font-bold text-ink">{fila.seccion}</p>
        </div>
        <span className="badge-pin shrink-0">{fila.totalCasillas} casilla(s)</span>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-ink-secondary">Casillas: </span>
          {fila.casillas}
        </p>
        <p>
          <span className="text-ink-secondary">UT: </span>
          {fila.unidadesTerritoriales}
        </p>
        <p>
          <span className="text-ink-secondary">Colonia: </span>
          {fila.colonias}
        </p>
        <p>
          <span className="text-ink-secondary">Electores: </span>
          <span className="font-semibold">{formatElectores(fila.totalElectores)}</span>
        </p>
        <p>
          <span className="text-ink-secondary">Distritos: </span>
          local {fila.distritoLocal ?? "—"} · federal {fila.distritoFederal ?? "—"}
        </p>
      </div>
    </li>
  );
}
