"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { apiJson } from "@/lib/api-response";
import { NOMBRES_COLONIAS_COYOACAN } from "@/lib/colonias";
import { nombreCompleto, TIPO_DIRIGENTE_LABEL, TIPOS_DIRIGENTE } from "@/lib/dirigentes";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import { etiquetaUnidadTerritorial, type UnidadTerritorialResumen } from "@/lib/unidades-territoriales";
import { SECCIONES_ELECTORALES_COYOACAN } from "@/lib/secciones-electorales";

export type DirigenteParaOperador = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  telefonoCelular: string;
  unidadTerritorial: UnidadTerritorialResumen | null;
};

type Props = {
  modo: "rc" | "rg";
  selectedId: string | null;
  onSelect: (dirigente: DirigenteParaOperador) => void;
};

export function BuscarDirigenteParaOperador({ modo, selectedId, onSelect }: Props) {
  const [buscar, setBuscar] = useState("");
  const [tipo, setTipo] = useState("");
  const [colonia, setColonia] = useState("");
  const [seccionElectoral, setSeccionElectoral] = useState("");
  const [unidadTerritorialId, setUnidadTerritorialId] = useState("");
  const [uts, setUts] = useState<UnidadTerritorialResumen[]>([]);
  const [dirigentes, setDirigentes] = useState<DirigenteParaOperador[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch("/api/unidades-territoriales/catalogo")
      .then(async (res) => {
        if (!res.ok) return;
        setUts((await res.json()) as UnidadTerritorialResumen[]);
      })
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set("buscar", buscar.trim());
      if (tipo) params.set("tipo", tipo);
      if (colonia) params.set("colonia", colonia);
      if (seccionElectoral) params.set("seccionElectoral", seccionElectoral);
      if (unidadTerritorialId) params.set("unidadTerritorialId", unidadTerritorialId);
      params.set(modo === "rc" ? "disponibleParaRc" : "disponibleParaRg", "true");

      const res = await apiFetch(`/api/dirigentes?${params.toString()}`);
      const data = await apiJson<DirigenteParaOperador[]>(res);
      setDirigentes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar");
      setDirigentes([]);
    } finally {
      setLoading(false);
    }
  }, [buscar, tipo, colonia, seccionElectoral, unidadTerritorialId, modo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, buscar ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, buscar]);

  return (
    <section className="card-section space-y-4">
      <div>
        <h2 className="section-title">Buscar dirigente</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Solo se muestran dirigentes activos (de alta) sin {modo === "rc" ? "Rep. Casilla" : "Res. General"} asignado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label">Nombre</span>
          <input
            type="search"
            className="input mt-1"
            placeholder="Buscar por nombre, apellido, colonia o sección…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Tipo</span>
          <select className="input mt-1" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos (D1–D4)</option>
            {TIPOS_DIRIGENTE.map((t) => (
              <option key={t} value={t}>
                {TIPO_DIRIGENTE_LABEL[t]}
              </option>
            ))}
          </select>
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
          <span className="label">Sección electoral</span>
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
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {loading ? (
        <p className="text-sm text-ink-secondary">Buscando dirigentes…</p>
      ) : null}

      {!loading && dirigentes.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          No hay dirigentes activos que coincidan con la búsqueda.
        </p>
      ) : null}

      {!loading && dirigentes.length > 0 ? (
        <ul className="space-y-2">
          {dirigentes.map((d) => {
            const selected = selectedId === d.id;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  className={
                    selected
                      ? "panel-soft w-full border-2 border-pin p-4 text-left"
                      : "panel-soft w-full p-4 text-left hover:border-pin/40"
                  }
                  onClick={() => onSelect(d)}
                >
                  <p className="font-semibold text-ink">{nombreCompleto(d)}</p>
                  <p className="mt-1 text-xs text-ink-secondary">
                    {TIPO_DIRIGENTE_LABEL[d.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ?? d.tipo}
                    {" · "}
                    {d.colonia}
                    {" · "}
                    {etiquetaSeccion(d.seccionElectoral)}
                    {d.unidadTerritorial
                      ? ` · ${etiquetaUnidadTerritorial(d.unidadTerritorial)}`
                      : ""}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
