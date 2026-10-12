"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { apiJson, esAbortError, mensajeErrorRed } from "@/lib/api-response";
import { NOMBRES_COLONIAS_COYOACAN } from "@/lib/colonias";
import { nombreCompleto, TIPOS_DIRIGENTE, etiquetaTipoDirigenteCorto } from "@/lib/dirigentes";
import { etiquetaSeccion, SECCIONES_ELECTORALES_COYOACAN } from "@/lib/secciones-electorales";
import { etiquetaUnidadTerritorial, type UnidadTerritorialResumen } from "@/lib/unidades-territoriales";

export type DirigenteMaterialBusqueda = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  distritoLocal: number | null;
  unidadTerritorial: UnidadTerritorialResumen | null;
};

type Props = {
  /** Todos los dirigentes activos van convocados; la lista es solo consulta. */
  convocadosTodos?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (dirigente: DirigenteMaterialBusqueda) => void;
};

export function BuscarDirigentesMaterial({ convocadosTodos = false, selectedIds, onToggle }: Props) {
  const [buscar, setBuscar] = useState("");
  const [tipo, setTipo] = useState("");
  const [colonia, setColonia] = useState("");
  const [seccionElectoral, setSeccionElectoral] = useState("");
  const [unidadTerritorialId, setUnidadTerritorialId] = useState("");
  const [uts, setUts] = useState<UnidadTerritorialResumen[]>([]);
  const [dirigentes, setDirigentes] = useState<DirigenteMaterialBusqueda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cargaId = useRef(0);

  useEffect(() => {
    void apiFetch("/api/unidades-territoriales/catalogo")
      .then(async (res) => {
        if (!res.ok) return;
        setUts((await res.json()) as UnidadTerritorialResumen[]);
      })
      .catch(() => undefined);
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    const id = ++cargaId.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("estatus", "alta");
      params.set("orden", "apellidos");
      if (buscar.trim()) params.set("buscar", buscar.trim());
      if (colonia) params.set("colonia", colonia);
      if (seccionElectoral) params.set("seccionElectoral", seccionElectoral);
      if (unidadTerritorialId) params.set("unidadTerritorialId", unidadTerritorialId);

      const res = await apiFetch(`/api/dirigentes?${params.toString()}`, { signal });
      if (id !== cargaId.current || signal?.aborted) return;
      const data = await apiJson<DirigenteMaterialBusqueda[]>(res);
      setDirigentes(data);
    } catch (err) {
      if (id !== cargaId.current || esAbortError(err) || signal?.aborted) return;
      setError(mensajeErrorRed(err, "Error al buscar"));
      setDirigentes([]);
    } finally {
      if (id === cargaId.current) setLoading(false);
    }
  }, [buscar, colonia, seccionElectoral, unidadTerritorialId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), buscar.trim() ? 300 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load, buscar, colonia, seccionElectoral, unidadTerritorialId]);

  const visibles = useMemo(
    () =>
      dirigentes.filter((d) => {
        if (!tipo) return true;
        return d.tipo.trim().toUpperCase() === tipo.trim().toUpperCase();
      }),
    [dirigentes, tipo],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="label">Buscar por nombre o apellidos</span>
          <input
            className="input mt-1"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Ej. García, Ana…"
          />
        </label>
        <label className="block">
          <span className="label">Colonia</span>
          <select className="input mt-1" value={colonia} onChange={(e) => setColonia(e.target.value)}>
            <option value="">Todas</option>
            {NOMBRES_COLONIAS_COYOACAN.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Sección</span>
          <select
            className="input mt-1"
            value={seccionElectoral}
            onChange={(e) => setSeccionElectoral(e.target.value)}
          >
            <option value="">Todas</option>
            {SECCIONES_ELECTORALES_COYOACAN.map((s) => (
              <option key={s} value={s}>
                {etiquetaSeccion(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Unidad territorial</span>
          <select
            className="input mt-1"
            value={unidadTerritorialId}
            onChange={(e) => setUnidadTerritorialId(e.target.value)}
          >
            <option value="">Todas</option>
            {uts.map((ut) => (
              <option key={ut.id} value={ut.id}>
                {etiquetaUnidadTerritorial(ut)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Tipo</span>
          <select className="input mt-1" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_DIRIGENTE.map((t) => (
              <option key={t} value={t}>
                {etiquetaTipoDirigenteCorto(t)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <div className="alert-error text-sm">{error}</div> : null}
      {loading ? <p className="text-sm text-ink-secondary">Buscando…</p> : null}

      {!convocadosTodos && selectedIds ? (
        <p className="text-sm text-ink-secondary">
          Seleccionados: <strong className="text-ink">{selectedIds.size}</strong>
        </p>
      ) : null}

      <ul className="max-h-[420px] space-y-2 overflow-y-auto rounded-md border border-border p-2">
        {visibles.map((d) => {
          const checked = convocadosTodos || Boolean(selectedIds?.has(d.id));
          return (
            <li key={d.id}>
              <label
                className={`flex gap-3 rounded-md p-2 ${convocadosTodos ? "" : "cursor-pointer hover:bg-zinc-50"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  disabled={convocadosTodos}
                  readOnly={convocadosTodos}
                  onChange={() => {
                    if (!convocadosTodos && onToggle) onToggle(d);
                  }}
                />
                <span className="min-w-0 text-sm">
                  <span className="font-medium text-ink">{nombreCompleto(d)}</span>
                  <span className="mt-0.5 block text-xs text-ink-secondary">
                    {etiquetaTipoDirigenteCorto(d.tipo)} · {d.colonia} · Secc. {d.seccionElectoral}
                    {d.unidadTerritorial ? ` · ${etiquetaUnidadTerritorial(d.unidadTerritorial)}` : ""}
                    {d.distritoLocal ? ` · DL ${d.distritoLocal}` : ""}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
        {!loading && visibles.length === 0 ? (
          <li className="p-4 text-center text-sm text-ink-secondary">Sin resultados</li>
        ) : null}
      </ul>
    </div>
  );
}
