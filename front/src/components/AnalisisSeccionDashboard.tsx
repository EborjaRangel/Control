"use client";

import {
  formatElectores,
  formatPorcentaje,
  type AnalisisSeccionRow,
  type PartidoVotosSeccion,
  type ResultadoAlcaldiaSeccion,
} from "@/lib/analisis";
import {
  COLOR_MC,
  COLOR_MORENA,
  COLOR_PAN,
  colorPartido,
  compararVotacionSeccion,
  indicadorVsPromedio,
  type AnioAlcaldia,
  type PromediosAlcaldia,
  type ResumenBloque,
} from "@/lib/analisis-votacion";

export function AnalisisSeccionDashboard({
  fila,
  promedios,
}: {
  fila: AnalisisSeccionRow;
  promedios: PromediosAlcaldia | null;
}) {
  const comparacion = compararVotacionSeccion(
    fila.alcalde2018,
    fila.alcalde2021,
    fila.alcalde2024,
    promedios,
  );

  if (!comparacion) {
    return (
      <p className="text-sm text-ink-secondary">
        Sin datos de votación IECM para esta sección.
      </p>
    );
  }

  const maxBloquePct = Math.max(
    ...comparacion.bloques2018.map((b) => b.porcentaje),
    ...comparacion.bloques2021.map((b) => b.porcentaje),
    ...comparacion.bloques2024.map((b) => b.porcentaje),
    1,
  );

  const indPart18 = indicadorVsPromedio(
    comparacion.participacion2018,
    promedios?.participacion2018 ?? null,
  );
  const indPart21 = indicadorVsPromedio(
    comparacion.participacion2021,
    promedios?.participacion2021 ?? null,
  );
  const indPart24 = indicadorVsPromedio(
    comparacion.participacion2024,
    promedios?.participacion2024 ?? null,
  );

  const tieneTresAnios =
    comparacion.bloques2018.length > 0 &&
    comparacion.bloques2021.length > 0 &&
    comparacion.bloques2024.length > 0;

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-hidden">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <p>
          <span className="text-ink-secondary">Electores: </span>
          <span className="font-semibold text-ink">{formatElectores(fila.totalElectores)}</span>
        </p>
        {comparacion.participacion2018 != null ? (
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="text-ink-secondary">Participación 2018:</span>
            <span className="font-medium">{formatPorcentaje(comparacion.participacion2018)}</span>
            {indPart18 ? <VsPromedioBadge {...indPart18} /> : null}
          </p>
        ) : null}
        {comparacion.participacion2021 != null ? (
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="text-ink-secondary">Participación 2021:</span>
            <span className="font-medium">{formatPorcentaje(comparacion.participacion2021)}</span>
            {indPart21 ? <VsPromedioBadge {...indPart21} /> : null}
          </p>
        ) : null}
        {comparacion.participacion2024 != null ? (
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="text-ink-secondary">Participación 2024:</span>
            <span className="font-medium">{formatPorcentaje(comparacion.participacion2024)}</span>
            {indPart24 ? <VsPromedioBadge {...indPart24} /> : null}
            {comparacion.tendenciaParticipacion !== "estable" ? (
              <span className="text-xs text-ink-secondary">
                ({comparacion.tendenciaParticipacion === "sube" ? "↑" : "↓"} vs 2021)
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      <ConclusionCard comparacion={comparacion} />

      {tieneTresAnios ? (
        <section className="panel-soft space-y-4 p-4">
          <h3 className="font-semibold text-ink">Comparación de bloques 2018 · 2021 · 2024</h3>
          <p className="text-xs text-ink-secondary">
            En 2018, MC y Convergencia se suman al bloque PAN y aliados por la coalición PAN-PRD-MC.
          </p>
          <div className="grid gap-6 lg:grid-cols-3">
            <BloquesChart titulo="2018" bloques={comparacion.bloques2018} maxPct={maxBloquePct} />
            <BloquesChart titulo="2021" bloques={comparacion.bloques2021} maxPct={maxBloquePct} />
            <BloquesChart titulo="2024" bloques={comparacion.bloques2024} maxPct={maxBloquePct} />
          </div>
          <DeltaBloques comparacion={comparacion} promedios={promedios} />
        </section>
      ) : fila.alcalde2021 && fila.alcalde2024 ? (
        <section className="panel-soft space-y-4 p-4">
          <h3 className="font-semibold text-ink">Comparación de bloques 2021 vs 2024</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <BloquesChart titulo="2021" bloques={comparacion.bloques2021} maxPct={maxBloquePct} />
            <BloquesChart titulo="2024" bloques={comparacion.bloques2024} maxPct={maxBloquePct} />
          </div>
          <DeltaBloques comparacion={comparacion} promedios={promedios} />
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <AnioDashboard
          titulo="Alcalde 2018"
          anio={2018}
          resultado={fila.alcalde2018}
          partidos={comparacion.topPartidos2018}
          nota="MC y Convergencia contados en PAN y aliados."
        />
        <AnioDashboard
          titulo="Alcalde 2021"
          anio={2021}
          resultado={fila.alcalde2021}
          partidos={comparacion.topPartidos2021}
        />
        <AnioDashboard
          titulo="Alcalde 2024"
          anio={2024}
          resultado={fila.alcalde2024}
          partidos={comparacion.topPartidos2024}
        />
      </div>
    </div>
  );
}

function VsPromedioBadge({
  texto,
  tono,
}: {
  texto: string;
  tono: "arriba" | "abajo" | "linea";
}) {
  const cls =
    tono === "arriba"
      ? "bg-success-bg text-success-text"
      : tono === "abajo"
        ? "bg-warning-bg text-warning-text"
        : "bg-surface-muted text-ink-secondary";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${cls}`}>
      {texto}
    </span>
  );
}

function ConclusionCard({
  comparacion,
}: {
  comparacion: NonNullable<ReturnType<typeof compararVotacionSeccion>>;
}) {
  const badge =
    comparacion.tendencia === "morena"
      ? { label: "Favor MORENA + aliados (2021→2024)", className: "bg-[#9f2241] text-white" }
      : comparacion.tendencia === "pan"
        ? { label: "Favor PAN + aliados (2021→2024)", className: "bg-pin text-white" }
        : { label: "Empate 2021→2024", className: "bg-surface-muted text-ink-secondary" };

  const tiene2124 =
    comparacion.bloques2021.length > 0 && comparacion.bloques2024.length > 0;

  return (
    <section className="rounded-pin border border-line bg-surface p-4 shadow-pin">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-ink">Conclusión por sección (2018 → 2024)</h3>
        {tiene2124 ? (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        ) : null}
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-ink-secondary">
        {comparacion.conclusion.split(/(?<=\.)\s+/).map((oracion) => (
          <p key={oracion} className="break-words">
            {oracion}
          </p>
        ))}
      </div>
    </section>
  );
}

function BloquesChart({
  titulo,
  bloques,
  maxPct,
}: {
  titulo: string;
  bloques: ResumenBloque[];
  maxPct: number;
}) {
  const bloquesVisibles = bloques.filter(
    (bloque) => bloque.bloque !== "mc" || bloque.porcentaje > 0,
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-ink">{titulo}</h4>
      {bloquesVisibles.map((bloque) => (
        <BarraHorizontal
          key={bloque.bloque}
          etiqueta={bloque.etiqueta}
          porcentaje={bloque.porcentaje}
          votos={bloque.votos}
          maxPct={maxPct}
          color={bloque.color}
        />
      ))}
    </div>
  );
}

function DeltaBloques({
  comparacion,
  promedios,
}: {
  comparacion: NonNullable<ReturnType<typeof compararVotacionSeccion>>;
  promedios: PromediosAlcaldia | null;
}) {
  const tiene2018 = comparacion.bloques2018.length > 0 && comparacion.bloques2024.length > 0;

  return (
    <div className="space-y-4">
      {tiene2018 ? (
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-secondary">Variación 2018 → 2024</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DeltaCard
              titulo="MORENA y aliados"
              delta={comparacion.deltaMorena2018_2024}
              color={COLOR_MORENA}
              referencia="2018"
            />
            <DeltaCard
              titulo="PAN y aliados"
              delta={comparacion.deltaPan2018_2024}
              color={COLOR_PAN}
              referencia="2018"
            />
          </div>
        </div>
      ) : null}
      {comparacion.bloques2021.length > 0 && comparacion.bloques2024.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-secondary">Variación 2021 → 2024</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DeltaCard
              titulo="MORENA y aliados"
              delta={comparacion.deltaMorenaPct}
              color={COLOR_MORENA}
              referencia="2021"
              vsPromedio={indicadorVsPromedio(
                pctBloque(comparacion.bloques2024, "morena"),
                promedios?.morena2024 ?? null,
              )}
            />
            <DeltaCard
              titulo="PAN y aliados"
              delta={comparacion.deltaPanPct}
              color={COLOR_PAN}
              referencia="2021"
              vsPromedio={indicadorVsPromedio(
                pctBloque(comparacion.bloques2024, "pan"),
                promedios?.pan2024 ?? null,
              )}
            />
            <DeltaCard
              titulo="MC"
              delta={comparacion.deltaMcPct}
              color={COLOR_MC}
              referencia="2021"
              vsPromedio={indicadorVsPromedio(comparacion.mc2024, promedios?.mc2024 ?? null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pctBloque(bloques: ResumenBloque[], bloque: ResumenBloque["bloque"]) {
  return bloques.find((b) => b.bloque === bloque)?.porcentaje ?? 0;
}

function DeltaCard({
  titulo,
  delta,
  color,
  referencia,
  vsPromedio,
}: {
  titulo: string;
  delta: number;
  color: string;
  referencia: string;
  vsPromedio?: ReturnType<typeof indicadorVsPromedio>;
}) {
  const positivo = delta >= 0;
  return (
    <div className="space-y-1 rounded-lg border border-line bg-surface-soft px-3 py-2">
      <p className="text-xs text-ink-secondary">{titulo}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {positivo ? "+" : ""}
        {delta.toFixed(2)} pp
      </p>
      <p className="text-xs text-ink-secondary">
        {positivo ? "Al alza" : "A la baja"} vs {referencia}
      </p>
      {vsPromedio ? (
        <p className="text-xs text-ink-secondary">
          2024:{" "}
          {vsPromedio.tono === "arriba"
            ? "arriba del prom. Coyoacán"
            : vsPromedio.tono === "abajo"
              ? "debajo del prom. Coyoacán"
              : "en línea con prom. Coyoacán"}
        </p>
      ) : null}
    </div>
  );
}

function AnioDashboard({
  titulo,
  anio,
  resultado,
  partidos,
  nota,
}: {
  titulo: string;
  anio: AnioAlcaldia;
  resultado: ResultadoAlcaldiaSeccion | null;
  partidos: PartidoVotosSeccion[];
  nota?: string;
}) {
  if (!resultado) {
    return (
      <div className="panel-soft p-4 text-sm text-ink-secondary">
        <h3 className="font-semibold text-ink">{titulo}</h3>
        <p className="mt-2">Sin datos importados del IECM.</p>
      </div>
    );
  }

  const maxPct = Math.max(...partidos.map((p) => p.porcentaje), 1);

  return (
    <section className="panel-soft space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-ink">{titulo}</h3>
        <p className="text-xs text-ink-secondary">
          Votación {formatElectores(resultado.votacionTotal)} · Nulos{" "}
          {formatPorcentaje(resultado.votosNulosPct)}
        </p>
      </div>
      {nota ? <p className="text-xs text-ink-secondary">{nota}</p> : null}
      <div className="space-y-2">
        {partidos.map((partido) => (
          <BarraHorizontal
            key={partido.clave}
            etiqueta={partido.etiqueta}
            porcentaje={partido.porcentaje}
            votos={partido.votos}
            maxPct={maxPct}
            color={colorPartido(partido.clave, anio)}
          />
        ))}
      </div>
    </section>
  );
}

function BarraHorizontal({
  etiqueta,
  porcentaje,
  votos,
  maxPct,
  color,
}: {
  etiqueta: string;
  porcentaje: number;
  votos: number;
  maxPct: number;
  color: string;
}) {
  const ancho = Math.max(2, (porcentaje / maxPct) * 100);

  return (
    <div className="min-w-0 space-y-1">
      <div className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-2">
        <span className="min-w-0 break-words font-medium text-ink">{etiqueta}</span>
        <span className="min-w-0 break-words text-ink-secondary sm:text-right">
          {formatPorcentaje(porcentaje)} · {formatElectores(votos)}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${ancho}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
