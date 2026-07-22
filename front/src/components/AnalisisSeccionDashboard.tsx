"use client";

import {
  formatElectores,
  formatPorcentaje,
  type AnalisisSeccionRow,
  type PartidoVotosSeccion,
  type ResultadoAlcaldiaSeccion,
} from "@/lib/analisis";
import {
  colorPartido,
  compararVotacionSeccion,
  type ResumenBloque,
} from "@/lib/analisis-votacion";

export function AnalisisSeccionDashboard({ fila }: { fila: AnalisisSeccionRow }) {
  const comparacion = compararVotacionSeccion(fila.alcalde2021, fila.alcalde2024);

  if (!comparacion) {
    return (
      <p className="text-sm text-ink-secondary">
        Sin datos de votación IECM para esta sección.
      </p>
    );
  }

  const maxBloquePct = Math.max(
    ...comparacion.bloques2021.map((b) => b.porcentaje),
    ...comparacion.bloques2024.map((b) => b.porcentaje),
    1,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <p>
          <span className="text-ink-secondary">Electores: </span>
          <span className="font-semibold text-ink">{formatElectores(fila.totalElectores)}</span>
        </p>
        {comparacion.participacion2021 != null ? (
          <p>
            <span className="text-ink-secondary">Participación 2021: </span>
            <span className="font-medium">{formatPorcentaje(comparacion.participacion2021)}</span>
          </p>
        ) : null}
        {comparacion.participacion2024 != null ? (
          <p>
            <span className="text-ink-secondary">Participación 2024: </span>
            <span className="font-medium">{formatPorcentaje(comparacion.participacion2024)}</span>
          </p>
        ) : null}
      </div>

      <ConclusionCard comparacion={comparacion} />

      {fila.alcalde2021 && fila.alcalde2024 ? (
        <section className="panel-soft space-y-4 p-4">
          <h3 className="font-semibold text-ink">Comparación de bloques 2021 vs 2024</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <BloquesChart titulo="2021" bloques={comparacion.bloques2021} maxPct={maxBloquePct} />
            <BloquesChart titulo="2024" bloques={comparacion.bloques2024} maxPct={maxBloquePct} />
          </div>
          <DeltaBloques comparacion={comparacion} />
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <AnioDashboard
          titulo="Alcalde 2021"
          resultado={fila.alcalde2021}
          partidos={comparacion.topPartidos2021}
        />
        <AnioDashboard
          titulo="Alcalde 2024"
          resultado={fila.alcalde2024}
          partidos={comparacion.topPartidos2024}
        />
      </div>
    </div>
  );
}

function ConclusionCard({
  comparacion,
}: {
  comparacion: NonNullable<ReturnType<typeof compararVotacionSeccion>>;
}) {
  const badge =
    comparacion.tendencia === "morena"
      ? { label: "MORENA + aliados", className: "bg-[#9f2241] text-white" }
      : comparacion.tendencia === "pan"
        ? { label: "PAN + aliados", className: "bg-pin text-white" }
        : { label: "Empate", className: "bg-surface-muted text-ink-secondary" };

  const tieneAmbosAnios =
    comparacion.bloques2021.length > 0 && comparacion.bloques2024.length > 0;

  return (
    <section className="rounded-pin border border-line bg-surface p-4 shadow-pin">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-ink">Análisis 2021 → 2024</h3>
        {tieneAmbosAnios ? (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-ink-secondary">{comparacion.conclusion}</p>
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
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-ink">{titulo}</h4>
      {bloques.map((bloque) => (
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
}: {
  comparacion: NonNullable<ReturnType<typeof compararVotacionSeccion>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DeltaCard
        titulo="MORENA y aliados"
        delta={comparacion.deltaMorenaPct}
        color={COLOR_MORENA}
      />
      <DeltaCard titulo="PAN y aliados" delta={comparacion.deltaPanPct} color={COLOR_PAN} />
    </div>
  );
}

const COLOR_MORENA = "#9f2241";
const COLOR_PAN = "#0055a4";

function DeltaCard({
  titulo,
  delta,
  color,
}: {
  titulo: string;
  delta: number;
  color: string;
}) {
  const positivo = delta >= 0;
  return (
    <div className="rounded-lg border border-line bg-surface-soft px-3 py-2">
      <p className="text-xs text-ink-secondary">{titulo}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {positivo ? "+" : ""}
        {delta.toFixed(2)} pp
      </p>
      <p className="text-xs text-ink-secondary">
        {positivo ? "Incremento" : "Disminución"} vs 2021
      </p>
    </div>
  );
}

function AnioDashboard({
  titulo,
  resultado,
  partidos,
}: {
  titulo: string;
  resultado: ResultadoAlcaldiaSeccion | null;
  partidos: PartidoVotosSeccion[];
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
      <div className="space-y-2">
        {partidos.map((partido) => (
          <BarraHorizontal
            key={partido.clave}
            etiqueta={partido.etiqueta}
            porcentaje={partido.porcentaje}
            votos={partido.votos}
            maxPct={maxPct}
            color={colorPartido(partido.clave)}
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
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium text-ink">{etiqueta}</span>
        <span className="shrink-0 whitespace-nowrap text-ink-secondary">
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
