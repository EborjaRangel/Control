"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AnalisisSeccionDashboard } from "@/components/AnalisisSeccionDashboard";
import { apiFetch } from "@/lib/api";
import {
  formatElectores,
  formatPorcentaje,
  type AnalisisSeccionRow,
  type AnalisisSeccionesResponse,
} from "@/lib/analisis";
import {
  calcularPromediosAlcaldia,
  compararFilasAnalisis,
  compararVotacionSeccion,
  ETIQUETAS_ORDEN_ANALISIS,
  ETIQUETAS_TENDENCIA,
  etiquetaFiltroTendencia2124,
  liderazgoBloques2024,
  ventajaMorenaSobrePan2024,
  metricasOrdenListadoAnalisis,
  ventajaRelativa2124,
  resumirTendenciasAlcaldia,
  seccionMcSuperoPriDesde2021,
  type ResumenEtiqueta2124,
  tendenciaSeccion,
  type OrdenListadoAnalisis,
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
  const [orden, setOrden] = useState<OrdenListadoAnalisis>("default");
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
    const filtered = data.filas.filter((fila) => {
      if (distritoLocal && String(fila.distritoLocal ?? "") !== distritoLocal) return false;
      if (tendenciaFiltro === "mc_supero_pri") {
        if (!seccionMcSuperoPriDesde2021(fila, promedios)) return false;
      } else if (tendenciaFiltro === "pan_gana_2024") {
        if (liderazgoBloques2024(fila, promedios) !== "pan") return false;
      } else if (tendenciaFiltro === "morena_gana_2024") {
        if (liderazgoBloques2024(fila, promedios) !== "morena") return false;
      } else if (tendenciaFiltro && tendenciaPorSeccion.get(fila.seccion) !== tendenciaFiltro) {
        return false;
      }
      if (!q) return true;
      return (
        fila.seccion.includes(q) ||
        fila.dirigentes.toLowerCase().includes(q) ||
        fila.casillas.toLowerCase().includes(q) ||
        fila.unidadesTerritoriales.toLowerCase().includes(q) ||
        fila.colonias.toLowerCase().includes(q)
      );
    });
    return [...filtered].sort((a, b) =>
      compararFilasAnalisis(a, b, orden, promedios, tendenciaFiltro),
    );
  }, [data, buscar, distritoLocal, tendenciaFiltro, tendenciaPorSeccion, orden, promedios]);

  const tendencias = useMemo(
    () => (data ? resumirTendenciasAlcaldia(data.filas, promedios) : null),
    [data, promedios],
  );

  const toggleTendenciaFiltro = (valor: TendenciaSeccionFiltro) => {
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
                ? `${filas.length} de ${data.totalSecciones} secciones · ${ETIQUETAS_ORDEN_ANALISIS[orden]}${tendenciaFiltro ? ` · ${etiquetaFiltroTendencia2124(tendenciaFiltro)}` : ""}${data.vigencia ? ` · INE ${data.vigencia}` : ""}`
                : "Secciones electorales con dashboard de votación y tendencias por bloque"}
          </p>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {!loading && tendencias ? (
        <div className="rounded-pin border border-line bg-surface-soft p-4 text-sm leading-relaxed text-ink-secondary">
          <p>
            En{" "}
            <span className="font-semibold text-[#9f2241]">
              {tendencias.comparables > 0
                ? Math.round((tendencias.favorMorena / tendencias.comparables) * 1000) / 10
                : 0}
              %
            </span>{" "}
            de las secciones ({tendencias.favorMorena} de {tendencias.comparables}), MORENA y aliados
            ganaron terreno frente a PAN y aliados entre 2021 y 2024. Aun así, en 2024 PAN y aliados
            siguió arriba en{" "}
            <span className="font-semibold text-pin">{tendencias.panGana2024} secciones</span> y
            MORENA y aliados en{" "}
            <span className="font-semibold text-[#9f2241]">{tendencias.morenaGana2024}</span>. La
            tendencia mide quién crece más; el liderazgo en 2024 mide quién va arriba en porcentaje.
          </p>
        </div>
      ) : null}

      {!loading && tendencias ? (
        <section className="min-w-0 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Panel por sección</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Clic en una tarjeta para filtrar el listado. Dos lecturas distintas:{" "}
              <strong className="font-medium text-ink">tendencia</strong> (quién crece más 2021→2024) y{" "}
              <strong className="font-medium text-ink">liderazgo 2024</strong> (quién va arriba en %).
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              Comparación clave
            </p>
            <div className="card-section grid gap-3 lg:grid-cols-2">
              <ResumenTendenciaCard
                titulo="MORENA gana terreno"
                valor={tendencias.favorMorena}
                total={tendencias.comparables}
                detalle="Sube más que PAN + aliados (2021→2024)"
                nota="Tendencia relativa · no significa ganar la sección"
                colorClass="border-[#9f2241]/40 bg-[#9f2241]/5"
                valorClass="text-[#9f2241]"
                destacado
                activo={tendenciaFiltro === "morena"}
                onClick={() => toggleTendenciaFiltro("morena")}
              />
              <ResumenTendenciaCard
                titulo="PAN arriba en 2024"
                valor={tendencias.panGana2024}
                total={tendencias.panGana2024 + tendencias.morenaGana2024}
                detalle="Mayor % PAN + aliados que MORENA en 2024"
                nota="Liderazgo en la sección · explica victoria agregada"
                colorClass="border-pin bg-pin-light"
                valorClass="text-pin"
                destacado
                activo={tendenciaFiltro === "pan_gana_2024"}
                onClick={() => toggleTendenciaFiltro("pan_gana_2024")}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              Tendencia 2021 → 2024
            </p>
            <div className="card-section grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ResumenTendenciaCard
                titulo="Favor PAN + aliados"
                valor={tendencias.favorPan}
                total={tendencias.comparables}
                detalle="PAN crece más que MORENA"
                colorClass="border-pin/30 bg-surface-soft"
                valorClass="text-pin"
                activo={tendenciaFiltro === "pan"}
                onClick={() => toggleTendenciaFiltro("pan")}
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
                titulo="MC superó al PRI"
                valor={tendencias.mcSuperoPri}
                total={tendencias.comparables}
                detalle="PRI ≥ MC en 2021 · MC > PRI en 2024"
                colorClass="border-[#e65100]/40 bg-[#fff3e0]"
                valorClass="text-[#e65100]"
                activo={tendenciaFiltro === "mc_supero_pri"}
                onClick={() => toggleTendenciaFiltro("mc_supero_pri")}
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
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              Liderazgo en 2024
            </p>
            <div className="card-section grid gap-3 sm:grid-cols-2">
              <ResumenTendenciaCard
                titulo="MORENA arriba en 2024"
                valor={tendencias.morenaGana2024}
                total={tendencias.panGana2024 + tendencias.morenaGana2024}
                detalle="Mayor % MORENA + aliados que PAN"
                colorClass="border-[#9f2241]/30 bg-[#9f2241]/5"
                valorClass="text-[#9f2241]"
                activo={tendenciaFiltro === "morena_gana_2024"}
                onClick={() => toggleTendenciaFiltro("morena_gana_2024")}
              />
              <ResumenTendenciaCard
                titulo="PAN arriba en 2024"
                valor={tendencias.panGana2024}
                total={tendencias.panGana2024 + tendencias.morenaGana2024}
                detalle="Mayor % PAN + aliados que MORENA"
                colorClass="border-pin/30 bg-surface-soft"
                valorClass="text-pin"
                activo={tendenciaFiltro === "pan_gana_2024"}
                onClick={() => toggleTendenciaFiltro("pan_gana_2024")}
              />
            </div>
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
            <option value="mc_supero_pri">{etiquetaFiltroTendencia2124("mc_supero_pri")}</option>
            <option value="pan_gana_2024">{etiquetaFiltroTendencia2124("pan_gana_2024")}</option>
            <option value="morena_gana_2024">{etiquetaFiltroTendencia2124("morena_gana_2024")}</option>
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
        <div className="min-w-0">
          <label className="label" htmlFor="analisis-orden">
            Orden del listado
          </label>
          <select
            id="analisis-orden"
            className="input"
            value={orden}
            onChange={(e) => setOrden(e.target.value as OrdenListadoAnalisis)}
          >
            {(Object.keys(ETIQUETAS_ORDEN_ANALISIS) as OrdenListadoAnalisis[]).map((key) => (
              <option key={key} value={key}>
                {ETIQUETAS_ORDEN_ANALISIS[key]}
              </option>
            ))}
          </select>
        </div>
        {tendenciaFiltro || distritoLocal || buscar || orden !== "default" ? (
          <div className="flex min-w-0 items-end">
            <button
              type="button"
              className="btn-ghost btn-sm btn-responsive w-full sm:w-auto"
              onClick={() => {
                setTendenciaFiltro("");
                setDistritoLocal("");
                setBuscar("");
                setOrden("default");
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
              orden={orden}
              tendenciaFiltro={tendenciaFiltro}
              expandido={expandido === fila.seccion}
              onToggle={() => setExpandido(expandido === fila.seccion ? null : fila.seccion)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TendenciaBadge({ resumen }: { resumen: ResumenEtiqueta2124 | null }) {
  if (!resumen) {
    return (
      <span className="inline-flex max-w-full rounded-full bg-surface-soft px-2 py-0.5 text-[0.6875rem] font-semibold leading-snug text-ink-secondary ring-1 ring-inset ring-line break-words">
        Sin comparación
      </span>
    );
  }

  return (
    <span
      className={`inline-flex max-w-full rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold leading-snug ring-1 ring-inset break-words ${resumen.badgeRingClass}`}
    >
      {resumen.etiqueta}
    </span>
  );
}

function AnalisisCard({
  fila,
  tendencia,
  promedios,
  orden,
  tendenciaFiltro,
  expandido,
  onToggle,
}: {
  fila: AnalisisSeccionRow;
  tendencia: TendenciaSeccion;
  promedios: PromediosAlcaldia | null;
  orden: OrdenListadoAnalisis;
  tendenciaFiltro: TendenciaSeccionFiltro;
  expandido: boolean;
  onToggle: () => void;
}) {
  const metricas = metricasOrdenListadoAnalisis(fila, promedios);
  const ventajaMorena2024 = ventajaMorenaSobrePan2024(fila, promedios);
  const comparacion = compararVotacionSeccion(
    fila.alcalde2018,
    fila.alcalde2021,
    fila.alcalde2024,
    promedios,
  );
  const duelo = comparacion?.analisisMcVsPri;
  const ventajaRelativa = ventajaRelativa2124(fila, promedios);

  return (
    <li
      className={`list-card min-w-0 space-y-3 overflow-hidden transition-colors ${
        expandido ? "border-pin-muted bg-pin-light" : "bg-surface"
      }`}
    >
      <div className="list-card-header">
        <div className="min-w-0">
          <p className="text-xs text-ink-secondary">Sección electoral</p>
          <p className="text-lg font-bold text-ink">
            {fila.seccion}
            {fila.dirigentes ? (
              <span className="font-medium text-base text-ink"> — {fila.dirigentes}</span>
            ) : null}
          </p>
        </div>
        <TendenciaBadge resumen={comparacion?.resumen2124 ?? null} />
      </div>
      {tendenciaFiltro === "pan_gana_2024" && metricas.panPct2024 != null && metricas.morenaPct2024 != null ? (
        <p className="text-sm font-semibold text-pin">
          PAN {formatPorcentaje(metricas.panPct2024)} vs MORENA {formatPorcentaje(metricas.morenaPct2024)} ·
          ventaja PAN +{metricas.ventajaPan2024?.toFixed(2)} pp
        </p>
      ) : null}
      {tendenciaFiltro === "morena_gana_2024" &&
      metricas.panPct2024 != null &&
      metricas.morenaPct2024 != null ? (
        <p className="text-sm font-semibold text-[#9f2241]">
          MORENA {formatPorcentaje(metricas.morenaPct2024)} vs PAN {formatPorcentaje(metricas.panPct2024)} ·
          ventaja MORENA +{ventajaMorena2024?.toFixed(2)} pp
          {ventajaRelativa != null && ventajaRelativa >= 1
            ? ` · amplía ventaja relativa +${ventajaRelativa.toFixed(2)} pp`
            : null}
        </p>
      ) : null}
      {(tendenciaFiltro === "morena" || tendenciaFiltro === "pan") && ventajaRelativa != null ? (
        <p
          className={`text-sm font-semibold ${
            tendenciaFiltro === "morena" ? "text-[#9f2241]" : "text-pin"
          }`}
        >
          Ventaja relativa 2021→2024: {ventajaRelativa >= 0 ? "+" : ""}
          {ventajaRelativa.toFixed(2)} pp
          {tendenciaFiltro === "pan" && ventajaRelativa < 0
            ? ` · PAN amplía ventaja +${Math.abs(ventajaRelativa).toFixed(2)} pp`
            : null}
          {tendenciaFiltro === "morena" && ventajaRelativa > 0
            ? ` · MORENA amplía ventaja +${ventajaRelativa.toFixed(2)} pp`
            : null}
        </p>
      ) : null}
      {tendenciaFiltro === "mc_supero_pri" && duelo ? (
        <p className="text-sm font-semibold text-[#e65100]">
          Ventaja MC vs PRI en 2024: +{duelo.ventajaMc2024.toFixed(2)} pp · PRI{" "}
          {formatPorcentaje(duelo.pri2021)} → {formatPorcentaje(duelo.pri2024)} · MC{" "}
          {formatPorcentaje(duelo.mc2021)} → {formatPorcentaje(duelo.mc2024)}
        </p>
      ) : null}
      {orden === "morena_var" && metricas.deltaMorena != null ? (
        <p className="text-sm font-semibold text-[#9f2241]">
          Variación MORENA + aliados: {metricas.deltaMorena >= 0 ? "+" : ""}
          {metricas.deltaMorena.toFixed(2)} pp (2021→2024)
        </p>
      ) : null}
      {orden === "pan_pct" && metricas.panPct2024 != null ? (
        <p className="text-sm font-semibold text-pin">
          PAN + aliados 2024: {formatPorcentaje(metricas.panPct2024)}
        </p>
      ) : null}
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
  nota,
  colorClass,
  valorClass,
  ocultarPct = false,
  destacado = false,
  activo = false,
  onClick,
}: {
  titulo: string;
  valor: number;
  total: number;
  detalle: string;
  nota?: string;
  colorClass: string;
  valorClass: string;
  ocultarPct?: boolean;
  destacado?: boolean;
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
      } ${destacado && !activo ? "ring-1 ring-line" : ""} ${onClick ? "cursor-pointer" : ""}`}
    >
      <p className="text-sm font-medium text-ink-secondary">{titulo}</p>
      <p className={`mt-1 text-3xl font-bold ${valorClass}`}>{valor}</p>
      <p className="mt-1 break-words text-xs text-ink-secondary">
        {ocultarPct ? `de ${total} secciones` : `${pct}% de ${total} comparables · ${detalle}`}
      </p>
      {nota ? <p className="mt-2 text-xs font-medium text-ink">{nota}</p> : null}
      {activo ? <p className="mt-2 text-xs font-semibold text-pin">Filtro activo</p> : null}
    </button>
  );
}
