"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import {
  formatElectores,
  formatPorcentaje,
  type AnalisisSeccionRow,
  type AnalisisSeccionesResponse,
  type ResultadoAlcaldiaSeccion,
} from "@/lib/analisis";

export default function AnalisisPage() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [data, setData] = useState<AnalisisSeccionesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distritoLocal, setDistritoLocal] = useState("");
  const [buscar, setBuscar] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

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
                ? `${filas.length} de ${data.totalSecciones} secciones · casillas, electores y resultados de alcalde (IECM)${data.vigencia ? ` · INE ${data.vigencia}` : ""}`
                : "Secciones electorales por volumen de casillas, electores y votación de alcalde"}
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
              <AnalisisCard
                key={fila.seccion}
                fila={fila}
                expandido={expandido === fila.seccion}
                onToggle={() =>
                  setExpandido(expandido === fila.seccion ? null : fila.seccion)
                }
              />
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
                    <th className="w-28">Votación</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <Fragment key={fila.seccion}>
                      <tr>
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
                        <td>
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() =>
                              setExpandido(expandido === fila.seccion ? null : fila.seccion)
                            }
                          >
                            {expandido === fila.seccion ? "Ocultar" : "Ver"}
                          </button>
                        </td>
                      </tr>
                      {expandido === fila.seccion ? (
                        <tr>
                          <td colSpan={8} className="bg-surface-soft p-4">
                            <ResultadosAlcaldePanel fila={fila} />
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

function ResultadosAlcaldePanel({ fila }: { fila: AnalisisSeccionRow }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ResultadoAlcaldeBlock anio={2024} titulo="Alcalde 2024" resultado={fila.alcalde2024} />
      <ResultadoAlcaldeBlock anio={2021} titulo="Alcalde 2021" resultado={fila.alcalde2021} />
    </div>
  );
}

function ResultadoAlcaldeBlock({
  titulo,
  anio,
  resultado,
}: {
  titulo: string;
  anio: number;
  resultado: ResultadoAlcaldiaSeccion | null;
}) {
  if (!resultado) {
    return (
      <div className="panel-soft space-y-2 p-4 text-sm text-ink-secondary">
        <h3 className="font-semibold text-ink">{titulo}</h3>
        <p>Sin datos importados del IECM para {anio}.</p>
      </div>
    );
  }

  return (
    <div className="panel-soft space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-ink">{titulo}</h3>
        <p className="text-sm text-ink-secondary">
          Participación {formatPorcentaje(resultado.participacionPct)} · Nulos{" "}
          {formatElectores(resultado.votosNulos)} ({formatPorcentaje(resultado.votosNulosPct)})
        </p>
      </div>
      <p className="text-xs text-ink-secondary">
        Lista nominal {formatElectores(resultado.listaNominal)} · Votación total{" "}
        {formatElectores(resultado.votacionTotal)}
      </p>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[420px] text-sm">
          <thead>
            <tr>
              <th>Partido / fuerza</th>
              <th className="text-right">Votos</th>
              <th className="text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {resultado.partidos.map((partido) => (
              <tr key={partido.clave}>
                <td>{partido.etiqueta}</td>
                <td className="text-right whitespace-nowrap">{formatElectores(partido.votos)}</td>
                <td className="text-right whitespace-nowrap">{formatPorcentaje(partido.porcentaje)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalisisCard({
  fila,
  expandido,
  onToggle,
}: {
  fila: AnalisisSeccionRow;
  expandido: boolean;
  onToggle: () => void;
}) {
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
      <button type="button" className="btn-ghost btn-sm btn-responsive" onClick={onToggle}>
        {expandido ? "Ocultar votación alcalde" : "Ver votación alcalde 2021/2024"}
      </button>
      {expandido ? <ResultadosAlcaldePanel fila={fila} /> : null}
    </li>
  );
}
