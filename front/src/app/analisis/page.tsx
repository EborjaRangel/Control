"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AnalisisSeccionDashboard } from "@/components/AnalisisSeccionDashboard";
import { apiFetch } from "@/lib/api";
import {
  formatElectores,
  type AnalisisSeccionRow,
  type AnalisisSeccionesResponse,
} from "@/lib/analisis";
import {
  calcularPromediosAlcaldia,
  ETIQUETAS_TENDENCIA,
  resumirTendenciasAlcaldia,
  tendenciaSeccion,
  type PromediosAlcaldia,
  type TendenciaSeccion,
  type TendenciaSeccionFiltro,
} from "@/lib/analisis-votacion";

export default function AnalisisPage() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [data, setData] = useState<AnalisisSeccionesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distritoLocal, setDistritoLocal] = useState("");
  const [tendenciaFiltro, setTendenciaFiltro] = useState<TendenciaSeccionFiltro>("");
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

  const promedios = useMemo(
    () => (data ? calcularPromediosAlcaldia(data.filas) : null),
    [data],
  );

  const tendenciaPorSeccion = useMemo(() => {
    if (!data) return new Map<string, TendenciaSeccion>();
    return new Map(
      data.filas.map((fila) => [fila.seccion, tendenciaSeccion(fila, promedios)] as const),
    );
  }, [data, promedios]);

  const filas = useMemo(() => {
    if (!data) return [];
    const q = buscar.trim().toLowerCase();
    return data.filas.filter((fila) => {
      if (distritoLocal && String(fila.distritoLocal ?? "") !== distritoLocal) return false;
      if (tendenciaFiltro && tendenciaPorSeccion.get(fila.seccion) !== tendenciaFiltro) {
        return false;
      }
      if (!q) return true;
      return (
        fila.seccion.includes(q) ||
        fila.casillas.toLowerCase().includes(q) ||
        fila.unidadesTerritoriales.toLowerCase().includes(q) ||
        fila.colonias.toLowerCase().includes(q)
      );
    });
  }, [data, buscar, distritoLocal, tendenciaFiltro, tendenciaPorSeccion]);

  const tendencias = useMemo(
    () => (data ? resumirTendenciasAlcaldia(data.filas, promedios) : null),
    [data, promedios],
  );

  const toggleTendenciaFiltro = (valor: TendenciaSeccion) => {
    setTendenciaFiltro((actual) => (actual === valor ? "" : valor));
  };

  if (!isAdmin) return null;

  return (
    <div className="min-w-0 max-w-full space-y-6 sm:space-y-8">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Análisis</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : data
                ? `${filas.length} de ${data.totalSecciones} secciones · tendencia 2021→2024${tendenciaFiltro ? ` · ${ETIQUETAS_TENDENCIA[tendenciaFiltro]}` : ""}${data.vigencia ? ` · INE ${data.vigencia}` : ""}`
                : "Secciones electorales con dashboard de votación y tendencias por bloque"}
          </p>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {!loading && tendencias ? (
        <section className="min-w-0 space-y-2">
          <p className="text-sm text-ink-secondary">
            Tendencia 2021 → 2024 (clic para filtrar el listado)
          </p>
          <div className="card-section grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ResumenTendenciaCard
              titulo="Favor PAN + aliados"
              valor={tendencias.favorPan}
              total={tendencias.comparables}
              detalle="Tendencia al alza vs MORENA"
              colorClass="border-pin bg-pin-light"
              valorClass="text-pin"
              activo={tendenciaFiltro === "pan"}
              onClick={() => toggleTendenciaFiltro("pan")}
            />
            <ResumenTendenciaCard
              titulo="Favor MORENA + aliados"
              valor={tendencias.favorMorena}
              total={tendencias.comparables}
              detalle="Tendencia al alza vs PAN"
              colorClass="border-[#9f2241]/30 bg-[#9f2241]/5"
              valorClass="text-[#9f2241]"
              activo={tendenciaFiltro === "morena"}
              onClick={() => toggleTendenciaFiltro("morena")}
            />
            <ResumenTendenciaCard
              titulo="Empate técnico"
              valor={tendencias.empate}
              total={tendencias.comparables}
              detalle="Variación similar entre bloques"
              colorClass="border-line bg-surface-soft"
              valorClass="text-ink"
              activo={tendenciaFiltro === "empate"}
              onClick={() => toggleTendenciaFiltro("empate")}
            />
            <ResumenTendenciaCard
              titulo="Sin comparación"
              valor={tendencias.sinComparacion}
              total={data?.totalSecciones ?? 403}
              detalle="Faltan datos 2021 o 2024"
              colorClass="border-line bg-surface-soft"
              valorClass="text-ink-secondary"
              ocultarPct
              activo={tendenciaFiltro === "sin_datos"}
              onClick={() => toggleTendenciaFiltro("sin_datos")}
            />
          </div>
        </section>
      ) : null}

      <section className="card-section grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
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
        <div className="min-w-0">
          <label className="label" htmlFor="analisis-tendencia">
            Tendencia 2021 → 2024
          </label>
          <select
            id="analisis-tendencia"
            className="input"
            value={tendenciaFiltro}
            onChange={(e) => setTendenciaFiltro(e.target.value as TendenciaSeccionFiltro)}
          >
            <option value="">Todas</option>
            <option value="morena">{ETIQUETAS_TENDENCIA.morena}</option>
            <option value="pan">{ETIQUETAS_TENDENCIA.pan}</option>
            <option value="empate">{ETIQUETAS_TENDENCIA.empate}</option>
            <option value="sin_datos">{ETIQUETAS_TENDENCIA.sin_datos}</option>
          </select>
        </div>
        <div className="min-w-0">
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
        {tendenciaFiltro || distritoLocal || buscar ? (
          <div className="flex min-w-0 items-end">
            <button
              type="button"
              className="btn-ghost btn-sm btn-responsive w-full sm:w-auto"
              onClick={() => {
                setTendenciaFiltro("");
                setDistritoLocal("");
                setBuscar("");
              }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : null}
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
        <ul className="min-w-0 space-y-3">
          {filas.map((fila) => (
            <AnalisisCard
              key={fila.seccion}
              fila={fila}
              tendencia={tendenciaPorSeccion.get(fila.seccion) ?? "sin_datos"}
              promedios={promedios}
              expandido={expandido === fila.seccion}
              onToggle={() => setExpandido(expandido === fila.seccion ? null : fila.seccion)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TendenciaBadge({ tendencia }: { tendencia: TendenciaSeccion }) {
  const estilos: Record<TendenciaSeccion, string> = {
    morena: "bg-[#9f2241]/10 text-[#9f2241] ring-[#9f2241]/25",
    pan: "bg-pin-light text-pin ring-pin/20",
    empate: "bg-surface-muted text-ink-secondary ring-line",
    sin_datos: "bg-surface-soft text-ink-secondary ring-line",
  };

  return (
    <span
      className={`inline-flex max-w-full rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold leading-snug ring-1 ring-inset break-words ${estilos[tendencia]}`}
    >
      {tendencia === "morena"
        ? "MORENA + aliados"
        : tendencia === "pan"
          ? "PAN + aliados"
          : tendencia === "empate"
            ? "Empate técnico"
            : "Sin comparación"}
    </span>
  );
}

function AnalisisCard({
  fila,
  tendencia,
  promedios,
  expandido,
  onToggle,
}: {
  fila: AnalisisSeccionRow;
  tendencia: TendenciaSeccion;
  promedios: PromediosAlcaldia | null;
  expandido: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={`list-card min-w-0 space-y-3 overflow-hidden transition-colors ${
        expandido ? "border-pin-muted bg-pin-light" : "bg-surface"
      }`}
    >
      <div className="list-card-header">
        <div className="min-w-0">
          <p className="text-xs text-ink-secondary">Sección electoral</p>
          <p className="text-lg font-bold text-ink">{fila.seccion}</p>
        </div>
        <TendenciaBadge tendencia={tendencia} />
      </div>
      <div className="space-y-2 break-words text-sm">
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
        {expandido ? "Ocultar análisis" : "Ver análisis 2018/2021/2024"}
      </button>
      {expandido ? (
        <div className="min-w-0 max-w-full border-t border-line pt-3">
          <AnalisisSeccionDashboard fila={fila} promedios={promedios} />
        </div>
      ) : null}
    </li>
  );
}

function ResumenTendenciaCard({
  titulo,
  valor,
  total,
  detalle,
  colorClass,
  valorClass,
  ocultarPct = false,
  activo = false,
  onClick,
}: {
  titulo: string;
  valor: number;
  total: number;
  detalle: string;
  colorClass: string;
  valorClass: string;
  ocultarPct?: boolean;
  activo?: boolean;
  onClick?: () => void;
}) {
  const pct = total > 0 ? Math.round((valor / total) * 1000) / 10 : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-pin border p-4 text-left transition-shadow ${colorClass} ${
        activo ? "ring-2 ring-pin shadow-pin" : "hover:shadow-pin"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <p className="text-sm font-medium text-ink-secondary">{titulo}</p>
      <p className={`mt-1 text-3xl font-bold ${valorClass}`}>{valor}</p>
      <p className="mt-1 break-words text-xs text-ink-secondary">
        {ocultarPct ? `de ${total} secciones` : `${pct}% de ${total} comparables · ${detalle}`}
      </p>
      {activo ? <p className="mt-2 text-xs font-semibold text-pin">Filtro activo</p> : null}
    </button>
  );
}
