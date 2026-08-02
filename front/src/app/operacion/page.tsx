"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ColoniasSeccionPanel, textoBusquedaColonias } from "@/components/ColoniasSeccionPanel";
import { apiFetch } from "@/lib/api";
import { formatElectores, formatPorcentaje, type AnalisisSeccionesResponse } from "@/lib/analisis";
import {
  ANIOS_OPERACION,
  calcularOperacionPan,
  colorPanOperacion,
  formatResumenOperacion,
  formatVotos,
  META_OPERACION_PCT,
} from "@/lib/operacion-pan";

export default function OperacionPage() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [data, setData] = useState<AnalisisSeccionesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState("");
  const [distritoLocal, setDistritoLocal] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/analisis/secciones");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Error al cargar datos electorales");
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

  const { filas, resumen } = useMemo(
    () => (data ? calcularOperacionPan(data.filas) : { filas: [], resumen: null }),
    [data],
  );

  const distritos = useMemo(() => {
    const set = new Set<number>();
    for (const f of filas) {
      if (f.distritoLocal != null) set.add(f.distritoLocal);
    }
    return [...set].sort((a, b) => a - b);
  }, [filas]);

  const filasVisibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return filas.filter((fila) => {
      if (distritoLocal && String(fila.distritoLocal ?? "") !== distritoLocal) return false;
      if (!q) return true;
      return (
        fila.seccion.includes(q) ||
        fila.colonias.toLowerCase().includes(q) ||
        fila.unidadesTerritoriales.toLowerCase().includes(q) ||
        textoBusquedaColonias(fila.coloniasDetalle, fila.colonias).toLowerCase().includes(q)
      );
    });
  }, [filas, buscar, distritoLocal]);

  if (!isAdmin) return null;

  return (
    <div className="min-w-0 max-w-full space-y-6 sm:space-y-8">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Operación</h1>
          <p className="page-subtitle">
            Meta PAN: {META_OPERACION_PCT}% de la votación estimada por sección. Proyección 2027 con
            regresión solo en elecciones intermedias ({ANIOS_OPERACION.join(" y ")}, sin presidente ni
            jefe de gobierno), PAN en solitario. Orden: mayor faltante primero.
          </p>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando metas de operación…
        </div>
      ) : null}

      {!loading && resumen ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ResumenCard
              titulo="Votación estimada"
              valor={formatVotos(resumen.votacionEstimadaTotal)}
              detalle={`${resumen.secciones} secciones`}
            />
            <ResumenCard
              titulo="PAN proyectado"
              valor={formatVotos(resumen.votosPanProyectadosTotal)}
              detalle={formatPorcentaje(resumen.porcentajePanAgregado)}
              accent={colorPanOperacion()}
            />
            <ResumenCard
              titulo={`Meta operación (${META_OPERACION_PCT}%)`}
              valor={formatVotos(resumen.metaOperacionTotal)}
              detalle="Suma de metas por sección"
            />
            <ResumenCard
              titulo="Faltante total"
              valor={formatVotos(resumen.faltanteTotal)}
              detalle="Votos para alcanzar la meta"
              destacado
            />
          </div>

          <p className="text-sm text-ink-secondary">{formatResumenOperacion(resumen)}</p>

          <div className="card flex flex-col gap-4">
            <label className="w-full min-w-0 flex-1">
              <span className="sr-only">Buscar</span>
              <input
                type="search"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar sección, colonia o UT…"
                className="input-search"
              />
            </label>
            <label className="block max-w-xs">
              <span className="label">Distrito local</span>
              <select
                value={distritoLocal}
                onChange={(e) => setDistritoLocal(e.target.value)}
                className="input mt-1"
              >
                <option value="">Todos</option>
                {distritos.map((d) => (
                  <option key={d} value={String(d)}>
                    Distrito {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted/80 text-xs uppercase tracking-wide text-ink-secondary">
                  <th className="px-4 py-3 font-semibold">Sección</th>
                  <th className="px-4 py-3 font-semibold">Colonias · UT</th>
                  <th className="px-4 py-3 text-right font-semibold">Votación est.</th>
                  <th className="px-4 py-3 text-right font-semibold">PAN proyectado</th>
                  <th className="px-4 py-3 text-right font-semibold">Meta {META_OPERACION_PCT}%</th>
                  <th className="px-4 py-3 text-right font-semibold">Faltante</th>
                </tr>
              </thead>
              <tbody>
                {filasVisibles.map((fila) => {
                  const abierta = expandido === fila.seccion;
                  return (
                    <Fragment key={fila.seccion}>
                      <tr className="border-b border-line/70 hover:bg-surface-muted/40">
                        <td className="px-4 py-3 align-top">
                          <button
                            type="button"
                            className="font-semibold text-pin hover:underline"
                            onClick={() =>
                              setExpandido((s) => (s === fila.seccion ? null : fila.seccion))
                            }
                          >
                            {fila.seccion}
                          </button>
                          {fila.distritoLocal != null ? (
                            <p className="mt-0.5 text-xs text-ink-secondary">
                              D. local {fila.distritoLocal}
                            </p>
                          ) : null}
                        </td>
                        <td className="max-w-md px-4 py-3 align-top">
                          <ColoniasSeccionPanel
                            coloniasDetalle={fila.coloniasDetalle}
                            coloniasFallback={fila.colonias}
                            compact
                          />
                          <p className="mt-1 text-xs text-ink-secondary">
                            UT: {fila.unidadesTerritoriales}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums">
                          {formatElectores(fila.votacionEstimada)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums">
                          <span className="font-medium" style={{ color: colorPanOperacion() }}>
                            {formatElectores(fila.votosPanProyectados)}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-secondary">
                            {formatPorcentaje(fila.porcentajePanProyectado)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-top font-semibold tabular-nums text-ink">
                          {formatElectores(fila.metaOperacionVotos)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-top font-bold tabular-nums text-pin">
                          {formatElectores(fila.faltanteVotos)}
                        </td>
                      </tr>
                      {abierta ? (
                        <tr className="border-b border-line/70 bg-surface-soft/60">
                          <td colSpan={6} className="px-4 py-4">
                            <ColoniasSeccionPanel
                              coloniasDetalle={fila.coloniasDetalle}
                              coloniasFallback={fila.colonias}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {filasVisibles.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-ink-secondary">Sin resultados</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ResumenCard({
  titulo,
  valor,
  detalle,
  accent,
  destacado,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  accent?: string;
  destacado?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">{titulo}</p>
      <p
        className="mt-1 text-2xl font-bold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {valor}
      </p>
      <p className={destacado ? "mt-1 text-sm font-medium text-pin" : "mt-1 text-sm text-ink-secondary"}>
        {detalle}
      </p>
    </div>
  );
}
