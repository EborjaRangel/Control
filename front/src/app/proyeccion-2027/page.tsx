"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import {
  formatElectores,
  formatPorcentaje,
  type AnalisisSeccionesResponse,
} from "@/lib/analisis";
import {
  calcularCrecimientoMetaGlobalPan,
  calcularProyeccionAlcaldia2027,
  colorGanadorProyeccion,
  colorPartidoSolo,
  ESCENARIOS_PROYECCION,
  etiquetaConfianza,
  formatResumenGanador,
  generarAnalisisNarrativoProyeccion,
  META_GLOBAL_PAN_PCT,
  patronesResaltadoBloques,
  segmentosTituloEscenario,
  type CrecimientoMetaGlobalPan,
  type EscenarioProyeccionId,
  type ProyeccionAlcaldia2027,
  type ProyeccionSeccion2027,
} from "@/lib/proyeccion-2027";
import { ColoniasSeccionPanel, textoBusquedaColonias } from "@/components/ColoniasSeccionPanel";
import { COLOR_PAN } from "@/lib/analisis-votacion";

export default function Proyeccion2027Page() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [data, setData] = useState<AnalisisSeccionesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [escenarioId, setEscenarioId] = useState<EscenarioProyeccionId>("morena_pt_prd_pan_pri_mc");
  const [partidoSoloId, setPartidoSoloId] = useState("MORENA");
  const [buscar, setBuscar] = useState("");
  const [filtroGanador, setFiltroGanador] = useState("");
  const [filtroHistoricasPan, setFiltroHistoricasPan] = useState(false);
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

  useEffect(() => {
    setFiltroGanador("");
    setExpandido(null);
  }, [escenarioId]);

  const escenarioConfig = useMemo(
    () => ESCENARIOS_PROYECCION.find((e) => e.id === escenarioId) ?? ESCENARIOS_PROYECCION[0],
    [escenarioId],
  );

  const { proyecciones, resumen } = useMemo(
    () =>
      data
        ? calcularProyeccionAlcaldia2027(data.filas, escenarioId)
        : { proyecciones: [], resumen: null as ProyeccionAlcaldia2027 | null },
    [data, escenarioId],
  );

  const bloquesPrincipales = useMemo(
    () => resumen?.bloques.filter((b) => b.id !== "otros") ?? [],
    [resumen],
  );

  const crecimientoMeta58 = useMemo(
    () =>
      data && resumen
        ? calcularCrecimientoMetaGlobalPan(data.filas, proyecciones, resumen)
        : null,
    [data, proyecciones, resumen],
  );

  const seccionesHistoricasPan = useMemo(
    () => new Set(crecimientoMeta58?.filas.map((f) => f.seccion) ?? []),
    [crecimientoMeta58],
  );

  const filas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return proyecciones
      .filter((p) => {
        if (filtroGanador && p.ganadorSeccion !== filtroGanador) return false;
        if (filtroHistoricasPan && !seccionesHistoricasPan.has(p.seccion)) return false;
        if (!q) return true;
        return (
          p.seccion.includes(q) ||
          p.colonias.toLowerCase().includes(q) ||
          textoBusquedaColonias(p.coloniasDetalle, p.colonias).toLowerCase().includes(q) ||
          String(p.distritoLocal ?? "").includes(q)
        );
      })
      .sort((a, b) => {
        if (escenarioId === "partidos_solos") {
          const pa = a.proyeccion2027.find((b) => b.id === partidoSoloId)?.porcentaje ?? 0;
          const pb = b.proyeccion2027.find((bl) => bl.id === partidoSoloId)?.porcentaje ?? 0;
          return pb - pa || Number(a.seccion) - Number(b.seccion);
        }
        return Number(a.seccion) - Number(b.seccion);
      });
  }, [
    proyecciones,
    buscar,
    filtroGanador,
    filtroHistoricasPan,
    seccionesHistoricasPan,
    escenarioId,
    partidoSoloId,
  ]);

  const partidoSeleccionado = useMemo(() => {
    if (!resumen || escenarioId !== "partidos_solos") return null;
    return resumen.bloques.find((b) => b.id === partidoSoloId) ?? null;
  }, [resumen, escenarioId, partidoSoloId]);

  const analisisNarrativo = useMemo(() => {
    if (!resumen) return null;
    return generarAnalisisNarrativoProyeccion(
      escenarioId,
      resumen,
      escenarioId === "partidos_solos" ? partidoSoloId : undefined,
    );
  }, [resumen, escenarioId, partidoSoloId]);

  if (!isAdmin) return null;

  return (
    <div className="min-w-0 max-w-full space-y-6 sm:space-y-8">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Proyección 2027</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : resumen
                ? `${resumen.seccionesProyectadas} secciones · ${escenarioConfig.etiqueta} · regresión OLS 2015–2024`
                : "Estimación por sección con base en cuatro elecciones de alcaldía/jefatura"}
          </p>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {!loading ? (
        <section className="panel-soft space-y-4 p-4">
          <h2 className="text-base font-semibold text-ink">Escenario de coaliciones</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-ink-secondary">Escenario</span>
              <select
                className="input w-full"
                value={escenarioId}
                onChange={(e) => setEscenarioId(e.target.value as EscenarioProyeccionId)}
              >
                {ESCENARIOS_PROYECCION.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            {escenarioId === "partidos_solos" ? (
              <label className="text-sm">
                <span className="mb-1 block text-ink-secondary">Partido a analizar</span>
                <select
                  className="input w-full"
                  value={partidoSoloId}
                  onChange={(e) => setPartidoSoloId(e.target.value)}
                >
                  {(resumen?.partidosDisponibles ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <p className="text-sm text-ink-secondary">{escenarioConfig.descripcion}</p>
          {analisisNarrativo ? (
            <CuadroAnalisisEscenario analisis={analisisNarrativo} escenarioId={escenarioId} />
          ) : null}
        </section>
      ) : null}

      {!loading && resumen ? (
        <>
          <section className="rounded-pin border border-line bg-surface-soft p-4 text-sm leading-relaxed text-ink-secondary">
            <p className="font-semibold text-ink">{formatResumenGanador(resumen)}</p>
            {escenarioId === "partidos_solos" && partidoSeleccionado ? (
              <p className="mt-2">
                <strong className="text-ink">{partidoSeleccionado.etiqueta}</strong> (seleccionado):{" "}
                {formatPorcentaje(partidoSeleccionado.porcentaje)} agregado ·{" "}
                {formatElectores(partidoSeleccionado.votos)} votos est. · gana{" "}
                {resumen.seccionesGanaPorBloque[partidoSoloId] ?? 0} secciones.
              </p>
            ) : null}
            <p className="mt-2">{resumen.escenario}</p>
            <p className="mt-2">
              Validación cruzada (leave-one-out): error medio{" "}
              <strong className="text-ink">{resumen.errorValidacionMediaPp.toFixed(2)} pp</strong> ·
              máximo {resumen.errorValidacionMaxPp.toFixed(2)} pp por sección.
            </p>
          </section>

          <section
            className={`card-section grid gap-3 ${
              bloquesPrincipales.length <= 2
                ? "sm:grid-cols-2"
                : bloquesPrincipales.length === 3
                  ? "sm:grid-cols-2 lg:grid-cols-4"
                  : "sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {bloquesPrincipales.map((bloque) => (
              <ResumenCard
                key={bloque.id}
                titulo={`Gana ${bloque.etiqueta}`}
                valor={resumen.seccionesGanaPorBloque[bloque.id] ?? 0}
                total={resumen.seccionesProyectadas}
                color={bloque.color}
                activo={filtroGanador === bloque.id}
                destacado={escenarioId === "partidos_solos" && bloque.id === partidoSoloId}
                onClick={() => setFiltroGanador((v) => (v === bloque.id ? "" : bloque.id))}
              />
            ))}
            <ResumenCard
              titulo="Empate técnico"
              valor={resumen.seccionesEmpate}
              total={resumen.seccionesProyectadas}
              color="#767676"
              activo={filtroGanador === "empate"}
              onClick={() => setFiltroGanador((v) => (v === "empate" ? "" : "empate"))}
            />
          </section>

          <section className="panel-soft space-y-4 p-4">
            <h2 className="text-base font-semibold text-ink">Resultado agregado estimado 2027</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-ink-secondary">Por votos</h3>
                {[...bloquesPrincipales]
                  .sort((a, b) => b.votos - a.votos)
                  .map((bloque) => (
                    <BarraProyeccion
                      key={bloque.id}
                      bloque={bloque}
                      max={Math.max(...bloquesPrincipales.map((b) => b.votos), 1)}
                      modo="votos"
                      destacado={escenarioId === "partidos_solos" && bloque.id === partidoSoloId}
                    />
                  ))}
                <p className="text-xs text-ink-secondary">
                  Total estimado: {formatElectores(resumen.votacionEstimadaTotal)} votos
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-ink-secondary">Por porcentaje</h3>
                {[...bloquesPrincipales]
                  .sort((a, b) => b.porcentaje - a.porcentaje)
                  .map((bloque) => (
                    <BarraProyeccion
                      key={`pct-${bloque.id}`}
                      bloque={bloque}
                      max={100}
                      modo="porcentaje"
                      destacado={escenarioId === "partidos_solos" && bloque.id === partidoSoloId}
                    />
                  ))}
                <GanadorBadge resumen={resumen} escenarioId={escenarioId} />
              </div>
            </div>
          </section>

          {crecimientoMeta58 ? (
            <MetaGlobalPanPanel
              meta={crecimientoMeta58}
              filtroActivo={filtroHistoricasPan}
              onToggleFiltro={() => setFiltroHistoricasPan((v) => !v)}
            />
          ) : null}

          {escenarioId === "partidos_solos" ? (
            <section className="rounded-pin border border-line bg-surface p-4 text-sm">
              <h2 className="font-semibold text-ink">Ranking partidos solos (proyección OLS)</h2>
              <ol className="mt-3 space-y-2">
                {[...bloquesPrincipales]
                  .sort((a, b) => b.porcentaje - a.porcentaje)
                  .map((bloque, i) => (
                    <li
                      key={bloque.id}
                      className={`flex flex-wrap items-baseline justify-between gap-2 rounded-pin px-2 py-1 ${
                        bloque.id === partidoSoloId ? "bg-surface-soft ring-1 ring-line" : ""
                      }`}
                    >
                      <span>
                        {i + 1}. <strong style={{ color: bloque.color }}>{bloque.etiqueta}</strong>
                      </span>
                      <span className="text-ink-secondary">
                        {formatPorcentaje(bloque.porcentaje)} · {formatElectores(bloque.votos)} ·{" "}
                        {resumen.seccionesGanaPorBloque[bloque.id] ?? 0} secciones
                      </span>
                    </li>
                  ))}
              </ol>
            </section>
          ) : null}

          <section className="rounded-pin border border-line bg-surface p-4 text-sm text-ink-secondary">
            <h2 className="font-semibold text-ink">Verificación de datos históricos</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>
                Secciones con 4 elecciones (2015–2024):{" "}
                <strong className="text-ink">{resumen.verificacion.seccionesConCuatroAnios}</strong>
              </li>
              <li>
                Cuadre bloques vs total sección OK:{" "}
                <strong className="text-ink">{resumen.verificacion.cuadreHistoricoOk}</strong> ·
                revisión manual: {resumen.verificacion.cuadreHistoricoFallo}
              </li>
              <li>
                Máxima desviación de cuadre (% suma bloques ≠ 100%):{" "}
                {resumen.verificacion.maxDesviacionCuadrePct.toFixed(2)} pp
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[12rem] flex-1 text-sm">
                <span className="mb-1 block text-ink-secondary">Buscar sección</span>
                <input
                  className="input w-full"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Sección, colonia, distrito…"
                />
              </label>
              {filtroGanador || filtroHistoricasPan ? (
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => {
                    setFiltroGanador("");
                    setFiltroHistoricasPan(false);
                  }}
                >
                  Quitar filtro
                </button>
              ) : null}
            </div>

            <p className="text-sm text-ink-secondary">
              {filas.length} secciones
              {filtroGanador || filtroHistoricasPan ? " (filtradas)" : ""}
              {filtroHistoricasPan ? " · históricas PAN" : ""}
              {escenarioId === "partidos_solos"
                ? ` · ordenadas por % de ${partidoSoloId}`
                : ""}
            </p>

            <div className="space-y-2">
              {filas.map((proy) => (
                <ProyeccionSeccionCard
                  key={proy.seccion}
                  proy={proy}
                  escenarioId={escenarioId}
                  partidoSoloId={partidoSoloId}
                  bloquesPrincipales={bloquesPrincipales.map((b) => b.id)}
                  expandido={expandido === proy.seccion}
                  onToggle={() =>
                    setExpandido((actual) => (actual === proy.seccion ? null : proy.seccion))
                  }
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function CuadroAnalisisEscenario({
  analisis,
  escenarioId,
}: {
  analisis: ReturnType<typeof generarAnalisisNarrativoProyeccion>;
  escenarioId: EscenarioProyeccionId;
}) {
  const segmentos = segmentosTituloEscenario(escenarioId);

  return (
    <div className="rounded-pin border border-line bg-surface p-4 text-sm leading-relaxed text-ink-secondary">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-ink">
          Análisis del escenario:{" "}
          {segmentos.map((seg, i) => (
            <span key={seg.texto}>
              {i > 0 ? (
                escenarioId === "pan_pri_mc_vs_morena_pt_prd_verde" && i === 1 ? (
                  " vs "
                ) : (
                  " · "
                )
              ) : null}
              <span className="font-bold" style={{ color: seg.color }}>
                {seg.texto}
              </span>
            </span>
          ))}
        </h3>
        <span className="text-xs text-ink-secondary">{analisis.palabras} palabras</span>
      </div>
      <div className="mt-3 space-y-3">
        {analisis.parrafos.map((parrafo, i) => (
          <p key={i}>
            <ParrafoConBloquesColoreados texto={parrafo} escenarioId={escenarioId} />
          </p>
        ))}
      </div>
    </div>
  );
}

function ParrafoConBloquesColoreados({
  texto,
  escenarioId,
}: {
  texto: string;
  escenarioId: EscenarioProyeccionId;
}) {
  const patrones = patronesResaltadoBloques(escenarioId);
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < texto.length) {
    let earliest: { index: number; len: number; color: string; text: string } | null = null;

    for (const { patron, color } of patrones) {
      const idx = texto.indexOf(patron, i);
      if (idx !== -1 && (earliest === null || idx < earliest.index)) {
        earliest = { index: idx, len: patron.length, color, text: patron };
      }
    }

    if (!earliest) {
      nodes.push(texto.slice(i));
      break;
    }

    if (earliest.index > i) {
      nodes.push(texto.slice(i, earliest.index));
    }

    nodes.push(
      <span key={key} className="font-bold" style={{ color: earliest.color }}>
        {earliest.text}
      </span>,
    );
    key += 1;
    i = earliest.index + earliest.len;
  }

  return <>{nodes}</>;
}

function ResumenCard({
  titulo,
  valor,
  total,
  color,
  activo,
  destacado = false,
  onClick,
}: {
  titulo: string;
  valor: number;
  total: number;
  color: string;
  activo: boolean;
  destacado?: boolean;
  onClick: () => void;
}) {
  const pct = total > 0 ? Math.round((valor / total) * 1000) / 10 : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pin border p-4 text-left transition ${
        activo || destacado ? "ring-2 ring-offset-1" : "border-line bg-surface-soft hover:bg-surface"
      }`}
      style={activo || destacado ? { borderColor: color, outlineColor: color } : undefined}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">{titulo}</p>
      <p className="mt-2 text-2xl font-bold" style={{ color }}>
        {valor}
      </p>
      <p className="mt-1 text-xs text-ink-secondary">
        {pct}% de secciones · {valor} de {total}
      </p>
    </button>
  );
}

function BarraProyeccion({
  bloque,
  max,
  modo,
  destacado = false,
}: {
  bloque: { etiqueta: string; votos: number; porcentaje: number; color: string };
  max: number;
  modo: "votos" | "porcentaje";
  destacado?: boolean;
}) {
  const valor = modo === "votos" ? bloque.votos : bloque.porcentaje;
  const ancho = max > 0 ? Math.max(2, (valor / max) * 100) : 0;
  return (
    <div className={`space-y-1 ${destacado ? "rounded-pin bg-surface-soft p-2" : ""}`}>
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{bloque.etiqueta}</span>
        <span className="text-ink-secondary">
          {modo === "votos"
            ? `${formatElectores(bloque.votos)} · ${formatPorcentaje(bloque.porcentaje)}`
            : formatPorcentaje(bloque.porcentaje)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${ancho}%`, backgroundColor: bloque.color }}
        />
      </div>
    </div>
  );
}

function GanadorBadge({
  resumen,
  escenarioId,
}: {
  resumen: ProyeccionAlcaldia2027;
  escenarioId: EscenarioProyeccionId;
}) {
  const color = colorGanadorProyeccion(resumen.ganadorPorcentaje, escenarioId);
  return (
    <div
      className="rounded-pin border p-3 text-sm"
      style={{ borderColor: color, backgroundColor: `${color}14` }}
    >
      <p className="font-semibold" style={{ color }}>
        Ganador por porcentaje: {resumen.ganadorEtiqueta}
      </p>
      <p className="mt-1 text-ink-secondary">
        Ganador por votos:{" "}
        {resumen.ganadorVotos === "empate" ? "Empate técnico" : resumen.ganadorEtiqueta}
      </p>
    </div>
  );
}

function ProyeccionSeccionCard({
  proy,
  escenarioId,
  partidoSoloId,
  bloquesPrincipales,
  expandido,
  onToggle,
}: {
  proy: ProyeccionSeccion2027;
  escenarioId: EscenarioProyeccionId;
  partidoSoloId: string;
  bloquesPrincipales: string[];
  expandido: boolean;
  onToggle: () => void;
}) {
  const color = colorGanadorProyeccion(proy.ganadorSeccion, escenarioId);
  const resumenPct = bloquesPrincipales
    .map((id) => {
      const b = proy.proyeccion2027.find((x) => x.id === id);
      if (!b) return null;
      const short =
        escenarioId === "partidos_solos"
          ? b.id.slice(0, 3)
          : id === "morena_aliados" || id === "morena_prd" || id === "morena_pt_prd_verde"
            ? "M+"
            : id === "pan_aliados"
              ? "P+"
              : id === "pan_pri_mc"
                ? "P+MC"
                : b.id.slice(0, 4).toUpperCase();
      return `${short} ${formatPorcentaje(b.porcentaje)}`;
    })
    .filter(Boolean)
    .join(" · ");

  const destacadoPartido =
    escenarioId === "partidos_solos"
      ? proy.proyeccion2027.find((b) => b.id === partidoSoloId)
      : null;

  return (
    <article className="rounded-pin border border-line bg-surface-soft">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="font-semibold text-ink">Sección {proy.seccion}</p>
          <div className="mt-0.5 text-xs text-ink-secondary">
            <ColoniasSeccionPanel coloniasDetalle={proy.coloniasDetalle} coloniasFallback={proy.colonias} compact />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className="rounded-full px-2 py-0.5 font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {proy.ganadorSeccionEtiqueta}
          </span>
          {destacadoPartido ? (
            <span className="font-semibold" style={{ color: colorPartidoSolo(partidoSoloId) }}>
              {destacadoPartido.etiqueta}: {formatPorcentaje(destacadoPartido.porcentaje)}
            </span>
          ) : (
            <span className="text-ink-secondary">{resumenPct}</span>
          )}
        </div>
      </button>

      {expandido ? (
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3 text-sm">
          <p className="text-ink-secondary">
            Distrito local {proy.distritoLocal ?? "—"} · {proy.aniosDisponibles.length} elecciones en base ·
            confianza: {etiquetaConfianza(proy.confianza)}
            {proy.errorValidacionPp != null ? ` · error validación ${proy.errorValidacionPp.toFixed(2)} pp` : ""}
          </p>
          <div
            className={`grid gap-3 ${
              bloquesPrincipales.length <= 2
                ? "sm:grid-cols-2"
                : bloquesPrincipales.length === 3
                  ? "sm:grid-cols-3"
                  : "sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {bloquesPrincipales.map((id) => {
              const bloque = proy.proyeccion2027.find((b) => b.id === id);
              if (!bloque) return null;
              return (
                <div
                  key={bloque.id}
                  className={`rounded-pin border border-line bg-surface p-2.5 ${
                    escenarioId === "partidos_solos" && bloque.id === partidoSoloId
                      ? "ring-2 ring-offset-1"
                      : ""
                  }`}
                  style={
                    escenarioId === "partidos_solos" && bloque.id === partidoSoloId
                      ? { outlineColor: bloque.color }
                      : undefined
                  }
                >
                  <p className="text-xs font-semibold" style={{ color: bloque.color }}>
                    {bloque.etiqueta}
                  </p>
                  <p className="mt-1 font-semibold text-ink">{formatPorcentaje(bloque.porcentaje)}</p>
                  <p className="text-xs text-ink-secondary">{formatElectores(bloque.votos)} votos est.</p>
                </div>
              );
            })}
          </div>
          <div className="rounded-pin border border-line bg-surface p-2.5 text-xs text-ink-secondary">
            <p className="font-semibold text-ink">Colonias</p>
            <div className="mt-2">
              <ColoniasSeccionPanel coloniasDetalle={proy.coloniasDetalle} coloniasFallback={proy.colonias} />
            </div>
          </div>
          <div className="rounded-pin border border-line bg-surface p-2.5 text-xs text-ink-secondary">
            <p className="font-semibold text-ink">Histórico por bloque (%)</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {bloquesPrincipales.map((id) => (
                <div key={id}>
                  <p className="font-medium text-ink">
                    {proy.proyeccion2027.find((b) => b.id === id)?.etiqueta ?? id}
                  </p>
                  <p>
                    {(proy.historico[id] ?? [])
                      .map((h) => `${h.anio}: ${h.porcentaje.toFixed(1)}%`)
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MetaGlobalPanPanel({
  meta,
  filtroActivo,
  onToggleFiltro,
}: {
  meta: CrecimientoMetaGlobalPan;
  filtroActivo: boolean;
  onToggleFiltro: () => void;
}) {
  return (
    <section className="panel-soft space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">
            Meta {META_GLOBAL_PAN_PCT}% global · secciones históricas PAN
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            El {META_GLOBAL_PAN_PCT}% es de la votación estimada total de la alcaldía (
            {formatElectores(meta.votacionEstimadaTotal)} votos), no el {META_GLOBAL_PAN_PCT}% de cada
            sección. El faltante se reparte solo entre secciones donde el PAN —solo o en alianza
            histórica (2015: PAN; 2018: PAN+MC+PRD; 2021 y 2024: PAN+PRI+PRD)— ganó al menos una
            elección, en proporción al margen aún disponible. El bloque 2027 usado es{" "}
            <strong className="text-ink">{meta.bloqueEtiqueta}</strong>.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0 text-sm"
          onClick={onToggleFiltro}
        >
          {filtroActivo ? "Quitar filtro de históricas" : "Ver solo históricas PAN"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaResumenCard
          titulo={`${meta.bloqueEtiqueta} proyectado`}
          valor={formatElectores(meta.votosPanActuales)}
          detalle={formatPorcentaje(meta.porcentajePanActual)}
          color={COLOR_PAN}
        />
        <MetaResumenCard
          titulo={`Meta ${meta.metaPct}% alcaldía`}
          valor={formatElectores(meta.votosMetaGlobal)}
          detalle={`${formatElectores(meta.faltanteGlobal)} votos faltantes`}
        />
        <MetaResumenCard
          titulo="Secciones históricas PAN"
          valor={String(meta.seccionesHistoricasPan)}
          detalle={`${formatElectores(meta.techoCrecimientoHistoricas)} votos de techo`}
        />
        <MetaResumenCard
          titulo="Crecimiento asignado"
          valor={formatElectores(meta.crecimientoAsignadoTotal)}
          detalle={
            meta.alcanzableSoloEnHistoricas
              ? "Alcanzable solo en estas secciones"
              : `Faltan ${formatElectores(meta.deficitFueraDeHistoricas)} fuera de históricas`
          }
          destacado={!meta.alcanzableSoloEnHistoricas}
        />
      </div>

      {!meta.alcanzableSoloEnHistoricas ? (
        <p className="rounded-pin border border-line bg-surface p-3 text-sm text-ink-secondary">
          Aunque se lleve al 100% el voto de las {meta.seccionesHistoricasPan} secciones históricas,
          no alcanza el {meta.metaPct}% global: harían falta{" "}
          <strong className="text-ink">{formatElectores(meta.deficitFueraDeHistoricas)}</strong> votos
          adicionales en secciones donde el PAN no ha ganado.
        </p>
      ) : meta.faltanteGlobal === 0 ? (
        <p className="rounded-pin border border-line bg-surface p-3 text-sm text-ink-secondary">
          La proyección ya alcanza o supera el {meta.metaPct}% global. No se asigna crecimiento
          adicional.
        </p>
      ) : null}

      <div className="table-wrap rounded-pin border border-line bg-surface">
        <table className="w-full min-w-[64rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted/80 text-xs uppercase tracking-wide text-ink-secondary">
              <th className="px-4 py-3 font-semibold">Sección</th>
              <th className="px-4 py-3 font-semibold">Años ganó PAN</th>
              <th className="px-4 py-3 text-right font-semibold">Votación est.</th>
              <th className="px-4 py-3 text-right font-semibold">Proyectado</th>
              <th className="px-4 py-3 text-right font-semibold">Techo</th>
              <th className="px-4 py-3 text-right font-semibold">Crecer para {meta.metaPct}%</th>
              <th className="px-4 py-3 text-right font-semibold">Votos meta</th>
            </tr>
          </thead>
          <tbody>
            {meta.filas.map((fila) => (
              <tr key={fila.seccion} className="border-b border-line/70 hover:bg-surface-muted/40">
                <td className="px-4 py-3 align-top">
                  <p className="font-semibold text-ink">Sección {fila.seccion}</p>
                  {fila.distritoLocal != null ? (
                    <p className="mt-0.5 text-xs text-ink-secondary">D. local {fila.distritoLocal}</p>
                  ) : null}
                  <div className="mt-1 text-xs text-ink-secondary">
                    <ColoniasSeccionPanel
                      coloniasDetalle={fila.coloniasDetalle}
                      coloniasFallback={fila.colonias}
                      compact
                    />
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-ink-secondary">
                  {fila.aniosGanoPan.join(", ")}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums">
                  {formatElectores(fila.votacionEstimada2027)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums">
                  <span className="font-medium" style={{ color: COLOR_PAN }}>
                    {formatElectores(fila.votosPanProyectados)}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-secondary">
                    {formatPorcentaje(fila.porcentajePanProyectado)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums text-ink-secondary">
                  {formatElectores(fila.techoCrecimientoVotos)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right align-top font-bold tabular-nums text-pin">
                  {formatElectores(fila.crecimientoAsignadoVotos)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right align-top tabular-nums">
                  <span className="font-semibold text-ink">{formatElectores(fila.votosMeta)}</span>
                  <span className="mt-0.5 block text-xs text-ink-secondary">
                    {formatPorcentaje(fila.porcentajeMetaSeccion)} en la sección
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta.filas.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-secondary">
            No hay secciones con victoria histórica del PAN o su alianza.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function MetaResumenCard({
  titulo,
  valor,
  detalle,
  color,
  destacado = false,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  color?: string;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-pin border border-line bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">{titulo}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums" style={color ? { color } : undefined}>
        {valor}
      </p>
      <p className={destacado ? "mt-1 text-xs font-medium text-pin" : "mt-1 text-xs text-ink-secondary"}>
        {detalle}
      </p>
    </div>
  );
}
