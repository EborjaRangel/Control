import {
  formatPorcentaje,
  type AnalisisSeccionRow,
  type ColoniasSeccionInfo,
  type PartidoVotosSeccion,
  type ResultadoAlcaldiaSeccion,
} from "@/lib/analisis";
import {
  ANIOS_ELECCION_ALCALDIA,
  COLOR_MC,
  COLOR_MORENA,
  COLOR_OTROS,
  COLOR_PAN,
  COLOR_PRD_PT,
  COLOR_PRI,
  esPartidoValido,
  type AnioAlcaldia,
} from "@/lib/analisis-votacion";

export type EscenarioProyeccionId =
  | "morena_pt_prd_pan_pri_mc"
  | "partidos_solos"
  | "morena_prd_pan_pri_mc"
  | "pan_pri_mc_vs_morena_pt_prd_verde"
  | "intermedias_morena_pt_pan_pri";

export type BloqueProyeccionResumen = {
  id: string;
  etiqueta: string;
  votos: number;
  porcentaje: number;
  color: string;
};

export type SerieHistoricaBloque = {
  anio: AnioAlcaldia;
  porcentaje: number;
  votos: number;
};

export type ProyeccionSeccion2027 = {
  seccion: string;
  colonias: string;
  coloniasDetalle: ColoniasSeccionInfo;
  distritoLocal: number | null;
  aniosDisponibles: AnioAlcaldia[];
  historico: Record<string, SerieHistoricaBloque[]>;
  proyeccion2027: BloqueProyeccionResumen[];
  participacionHistorica: { anio: AnioAlcaldia; pct: number }[];
  participacion2027: number;
  votacionEstimada2027: number;
  ganadorSeccion: string | "empate";
  ganadorSeccionEtiqueta: string;
  margenGanadorPct: number;
  errorValidacionPp: number | null;
  confianza: "alta" | "media" | "baja";
};

/** Opciones para acotar qué elecciones entran a la regresión OLS por sección. */
export type OpcionesProyeccionSeccion = {
  /** Por defecto 2015, 2018, 2021 y 2024. */
  aniosRegresion?: AnioAlcaldia[];
};

export type ProyeccionAlcaldia2027 = {
  escenarioId: EscenarioProyeccionId;
  escenario: string;
  bloques: BloqueProyeccionResumen[];
  ganadorVotos: string | "empate";
  ganadorPorcentaje: string | "empate";
  ganadorEtiqueta: string;
  votacionEstimadaTotal: number;
  seccionesProyectadas: number;
  seccionesGanaPorBloque: Record<string, number>;
  seccionesEmpate: number;
  errorValidacionMediaPp: number;
  errorValidacionMaxPp: number;
  verificacion: VerificacionProyeccion2027;
  partidosDisponibles?: PartidoSoloOpcion[];
  contextoHistorico: ContextoHistoricoProyeccion;
  aniosRegresion: AnioAlcaldia[];
};

export type MaximoHistoricoBloque = {
  id: string;
  etiqueta: string;
  /** Mayor % observado en una sola sección y elección. */
  maximoSeccionPct: number;
  /** Mayor promedio alcaldial anual del bloque (promedio de secciones). */
  maximoPromedioAlcaldiaPct: number;
  anioPicoPromedio: AnioAlcaldia | null;
  proyeccion2027Pct: number;
  superaMaximoPromedio: boolean;
};

export type TendenciaBloqueSecciones = {
  id: string;
  etiqueta: string;
  seccionesSube: number;
  seccionesBaja: number;
  seccionesEstable: number;
  /** Secciones cuya proyección 2027 supera el máximo propio 2015–2024. */
  seccionesSobreMaximoPropio: number;
};

export type ContextoHistoricoProyeccion = {
  seccionesConRegresionPropia: number;
  tendenciasPorBloque: TendenciaBloqueSecciones[];
  maximosPorBloque: MaximoHistoricoBloque[];
};

export type PartidoSoloOpcion = {
  id: string;
  etiqueta: string;
  color: string;
};

export type VerificacionProyeccion2027 = {
  seccionesConCuatroAnios: number;
  seccionesConTresAnios: number;
  seccionesConDosAnios: number;
  seccionesSinDatos: number;
  cuadreHistoricoOk: number;
  cuadreHistoricoFallo: number;
  maxDesviacionCuadrePct: number;
};

export type ConfigEscenarioProyeccion = {
  id: EscenarioProyeccionId;
  etiqueta: string;
  descripcion: string;
  bloques: { id: string; etiqueta: string; color: string }[];
  distribuir: (clave: string, votos: number) => Record<string, number>;
  /** Por defecto 2015, 2018, 2021 y 2024. */
  aniosRegresion?: AnioAlcaldia[];
};

const ANIO_PROYECCION = 2027;
const UMBRAL_EMPATE_PP = 0.5;
const COLOR_PT = "#c62828";
const COLOR_PVEM = "#00843d";

/** Elecciones intermedias (sin presidente ni jefe de gobierno), comparables a 2027. */
export const ANIOS_INTERMEDIAS: AnioAlcaldia[] = [2015, 2021];
export const META_GLOBAL_PAN_PCT = 58;

export const ESCENARIOS_PROYECCION: ConfigEscenarioProyeccion[] = [
  {
    id: "morena_pt_prd_pan_pri_mc",
    etiqueta: "MORENA+PT+PRD · PAN+PRI · MC",
    descripcion: "MORENA, PT y PRD juntos · PAN con PRI · MC solo.",
    bloques: [
      { id: "morena_aliados", etiqueta: "MORENA + PT + PRD", color: COLOR_MORENA },
      { id: "pan_aliados", etiqueta: "PAN + PRI", color: COLOR_PAN },
      { id: "mc", etiqueta: "MC", color: COLOR_MC },
    ],
    distribuir: distribuirEscenarioMorenaPtPrd,
  },
  {
    id: "morena_prd_pan_pri_mc",
    etiqueta: "MORENA+PRD · PAN+PRI · MC",
    descripcion: "MORENA con PRD (sin PT) · PAN con PRI · MC solo · PT aparte.",
    bloques: [
      { id: "morena_prd", etiqueta: "MORENA + PRD", color: COLOR_MORENA },
      { id: "pan_aliados", etiqueta: "PAN + PRI", color: COLOR_PAN },
      { id: "mc", etiqueta: "MC", color: COLOR_MC },
      { id: "pt", etiqueta: "PT", color: COLOR_PT },
    ],
    distribuir: distribuirEscenarioMorenaPrd,
  },
  {
    id: "pan_pri_mc_vs_morena_pt_prd_verde",
    etiqueta: "PAN+PRI+MC vs MORENA+PT+PRD+Verde",
    descripcion: "PAN, PRI y MC juntos · MORENA, PT, PRD y PVEM (Verde) juntos.",
    bloques: [
      { id: "pan_pri_mc", etiqueta: "PAN + PRI + MC", color: COLOR_PAN },
      { id: "morena_pt_prd_verde", etiqueta: "MORENA + PT + PRD + Verde", color: COLOR_PVEM },
    ],
    distribuir: distribuirEscenarioPanPriMcVsMorena,
  },
  {
    id: "intermedias_morena_pt_pan_pri",
    etiqueta: "Intermedias MORENA+PT · PAN+PRI · demás solos",
    descripcion:
      "Regresión solo con elecciones intermedias 2015 y 2021 (comparables a 2027). MORENA con PT · PAN con PRI · MC, PRD y Verde por separado. Cubre las 403 secciones.",
    bloques: [
      { id: "morena_pt", etiqueta: "MORENA + PT", color: COLOR_MORENA },
      { id: "pan_pri", etiqueta: "PAN + PRI", color: COLOR_PAN },
      { id: "MC", etiqueta: "MC", color: COLOR_MC },
      { id: "PRD", etiqueta: "PRD", color: COLOR_PRD_PT },
      { id: "PVEM", etiqueta: "PVEM (Verde)", color: COLOR_PVEM },
    ],
    distribuir: distribuirEscenarioIntermedias,
    aniosRegresion: ANIOS_INTERMEDIAS,
  },
  {
    id: "partidos_solos",
    etiqueta: "Partidos solos",
    descripcion: "Cada partido compite por separado · selecciona uno en el combo.",
    bloques: [],
    distribuir: distribuirPartidoSolo,
  },
];

export const VISTA_META_PAN_SOLO_58 = "meta_pan_solo_58" as const;

export type VistaProyeccionId = EscenarioProyeccionId | typeof VISTA_META_PAN_SOLO_58;

export const OPCIONES_VISTA_PROYECCION: {
  id: VistaProyeccionId;
  etiqueta: string;
  descripcion: string;
}[] = [
  ...ESCENARIOS_PROYECCION.map((esc) => ({
    id: esc.id,
    etiqueta: esc.etiqueta,
    descripcion: esc.descripcion,
  })),
  {
    id: VISTA_META_PAN_SOLO_58,
    etiqueta: `Meta ${META_GLOBAL_PAN_PCT}% PAN solo`,
    descripcion:
      "Solo secciones donde el PAN ganó solo (voto PAN, sin coalición) en 2015, 2018, 2021 y 2024. Muestra cuántos votos extra hacen falta en esas secciones para llegar al 58% de la votación total de la alcaldía.",
  },
];

export function esVistaMetaPanSolo58(id: VistaProyeccionId): id is typeof VISTA_META_PAN_SOLO_58 {
  return id === VISTA_META_PAN_SOLO_58;
}

export function escenarioDesdeVista(id: VistaProyeccionId): EscenarioProyeccionId {
  if (esVistaMetaPanSolo58(id)) return "partidos_solos";
  return id;
}

const PARTIDOS_SOLOS_CANONICOS: PartidoSoloOpcion[] = [
  { id: "MORENA", etiqueta: "MORENA", color: COLOR_MORENA },
  { id: "PAN", etiqueta: "PAN", color: COLOR_PAN },
  { id: "PRI", etiqueta: "PRI", color: COLOR_PRI },
  { id: "MC", etiqueta: "MC", color: COLOR_MC },
  { id: "PRD", etiqueta: "PRD", color: COLOR_PRD_PT },
  { id: "PT", etiqueta: "PT", color: COLOR_PT },
  { id: "PVEM", etiqueta: "PVEM (Verde)", color: COLOR_PVEM },
];

const TOKENS_MORENA = new Set(["MOR", "MORENA", "PT", "PRD", "PES", "PVEM"]);
const TOKENS_PAN = new Set(["PAN", "PRI"]);
const TOKENS_MORENA_SIN_PT = new Set(["MOR", "MORENA", "PRD", "PES"]);
const TOKENS_BLOQUE_IZQ = new Set(["MOR", "MORENA", "PT", "PRD", "PES", "PVEM"]);
const TOKENS_BLOQUE_DER = new Set(["PAN", "PRI", "MC"]);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function filtrarPartidos(partidos: PartidoVotosSeccion[]): PartidoVotosSeccion[] {
  return partidos.filter((p) => esPartidoValido(p.clave) && p.votos > 0);
}

function vacio(ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, 0]));
}

function repartoCoalicion(
  clave: string,
  votos: number,
  mapToken: (token: string) => string | null,
): Record<string, number> | null {
  const tokens = clave.toUpperCase().split("_").filter(Boolean);
  const asignaciones: string[] = [];

  for (const token of tokens) {
    if (token === "CONVERGENCIA") asignaciones.push("MC");
    else {
      const dest = mapToken(token);
      if (dest) asignaciones.push(dest);
    }
  }

  if (asignaciones.length <= 1) return null;

  const counts: Record<string, number> = {};
  for (const a of asignaciones) counts[a] = (counts[a] ?? 0) + 1;
  const total = asignaciones.length;
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(counts)) {
    out[id] = (votos * n) / total;
  }
  return out;
}

function mapTokenMorenaPtPrd(token: string): string | null {
  if (token === "MC") return "mc";
  if (TOKENS_PAN.has(token)) return "pan_aliados";
  if (TOKENS_MORENA.has(token)) return "morena_aliados";
  return null;
}

function mapTokenMorenaPrd(token: string): string | null {
  if (token === "MC") return "mc";
  if (TOKENS_PAN.has(token)) return "pan_aliados";
  if (token === "PT") return "pt";
  if (TOKENS_MORENA_SIN_PT.has(token)) return "morena_prd";
  return null;
}

function mapTokenDosBloques(token: string): string | null {
  if (TOKENS_BLOQUE_DER.has(token) || token === "MC") return "pan_pri_mc";
  if (TOKENS_BLOQUE_IZQ.has(token)) return "morena_pt_prd_verde";
  return null;
}

function mapTokenPartidoSolo(token: string): string | null {
  if (token === "MOR") return "MORENA";
  if (["MORENA", "PAN", "PRI", "MC", "PRD", "PT", "PVEM", "PES"].includes(token)) return token;
  return null;
}

function mapTokenIntermedias(token: string): string | null {
  if (token === "MC" || token === "CONVERGENCIA") return "MC";
  if (token === "PRD") return "PRD";
  if (token === "PVEM") return "PVEM";
  if (token === "PAN" || token === "PRI") return "pan_pri";
  if (token === "MOR" || token === "MORENA" || token === "PT") return "morena_pt";
  return null;
}

function aplicarDistribucion(
  clave: string,
  votos: number,
  bloqueIds: string[],
  reglas: (k: string, v: number, out: Record<string, number>) => void,
): Record<string, number> {
  const out = vacio([...bloqueIds, "otros"]);
  reglas(clave.toUpperCase(), votos, out);
  return out;
}

function distribuirEscenarioMorenaPtPrd(clave: string, votos: number): Record<string, number> {
  return aplicarDistribucion(clave, votos, ["morena_aliados", "pan_aliados", "mc"], (k, v, out) => {
    if (k === "MC" || k.includes("CONVERGENCIA")) {
      out.mc = v;
      return;
    }
    if (k === "MORENA" || k.includes("MORENA")) {
      out.morena_aliados = v;
      return;
    }
    if (k === "PRD_PT" || k === "PT_PRD" || k === "PRD" || k === "PT") {
      out.morena_aliados = v;
      return;
    }
    if (k === "PAN" || k === "PRI" || k.startsWith("PRI_") || k === "PAN_PRI") {
      out.pan_aliados = v;
      return;
    }
    if (["PT_MOR", "MOR_PES", "PT_MOR_PES", "PT_MORENA", "PVEM_PT_MORENA"].includes(k)) {
      out.morena_aliados = v;
      return;
    }
    const split = repartoCoalicion(k, v, mapTokenMorenaPtPrd);
    if (split) {
      for (const [id, val] of Object.entries(split)) out[id] = (out[id] ?? 0) + val;
      return;
    }
    out.otros = v;
  });
}

function distribuirEscenarioMorenaPrd(clave: string, votos: number): Record<string, number> {
  return aplicarDistribucion(clave, votos, ["morena_prd", "pan_aliados", "mc", "pt"], (k, v, out) => {
    if (k === "MC" || k.includes("CONVERGENCIA")) {
      out.mc = v;
      return;
    }
    if (k === "MORENA" || k.includes("MORENA") || k === "PRD") {
      out.morena_prd = v;
      return;
    }
    if (k === "PRD_PT" || k === "PT_PRD") {
      out.morena_prd = v * 0.5;
      out.pt = v * 0.5;
      return;
    }
    if (k === "PT") {
      out.pt = v;
      return;
    }
    if (k === "PAN" || k === "PRI" || k.startsWith("PRI_") || k === "PAN_PRI") {
      out.pan_aliados = v;
      return;
    }
    if (["MOR_PES", "PT_MOR", "PT_MOR_PES"].includes(k)) {
      out.morena_prd = v;
      return;
    }
    if (k === "PT_MORENA") {
      out.morena_prd = v * 0.5;
      out.pt = v * 0.5;
      return;
    }
    if (k === "PVEM_PT_MORENA") {
      out.morena_prd = v * (2 / 3);
      out.pt = v / 3;
      return;
    }
    const split = repartoCoalicion(k, v, mapTokenMorenaPrd);
    if (split) {
      for (const [id, val] of Object.entries(split)) out[id] = (out[id] ?? 0) + val;
      return;
    }
    out.otros = v;
  });
}

function distribuirEscenarioPanPriMcVsMorena(clave: string, votos: number): Record<string, number> {
  return aplicarDistribucion(
    clave,
    votos,
    ["pan_pri_mc", "morena_pt_prd_verde"],
    (k, v, out) => {
      if (k === "MC" || k.includes("CONVERGENCIA")) {
        out.pan_pri_mc = v;
        return;
      }
      if (k === "MORENA" || k.includes("MORENA") || k === "PRD" || k === "PT" || k === "PVEM") {
        out.morena_pt_prd_verde = v;
        return;
      }
      if (k === "PRD_PT" || k === "PT_PRD") {
        out.morena_pt_prd_verde = v;
        return;
      }
      if (k === "PAN" || k === "PRI" || k.startsWith("PRI_") || k === "PAN_PRI") {
        out.pan_pri_mc = v;
        return;
      }
      if (["PT_MOR", "MOR_PES", "PT_MOR_PES", "PT_MORENA", "PVEM_PT_MORENA"].includes(k)) {
        out.morena_pt_prd_verde = v;
        return;
      }
      const split = repartoCoalicion(k, v, mapTokenDosBloques);
      if (split) {
        for (const [id, val] of Object.entries(split)) out[id] = (out[id] ?? 0) + val;
        return;
      }
      out.otros = v;
    },
  );
}

function distribuirPartidoSolo(clave: string, votos: number): Record<string, number> {
  const ids = PARTIDOS_SOLOS_CANONICOS.map((p) => p.id);
  return aplicarDistribucion(clave, votos, ids, (k, v, out) => {
    if (k === "CONVERGENCIA" || k.includes("CONVERGENCIA")) {
      out.MC = v;
      return;
    }
    if (k === "PRD_PT" || k === "PT_PRD") {
      out.PRD = v * 0.5;
      out.PT = v * 0.5;
      return;
    }
    if (ids.includes(k)) {
      out[k] = v;
      return;
    }
    const split = repartoCoalicion(k, v, mapTokenPartidoSolo);
    if (split) {
      for (const [id, val] of Object.entries(split)) out[id] = (out[id] ?? 0) + val;
      return;
    }
    out.otros = v;
  });
}

const IDS_INTERMEDIAS = ["morena_pt", "pan_pri", "MC", "PRD", "PVEM"];

function distribuirEscenarioIntermedias(clave: string, votos: number): Record<string, number> {
  return aplicarDistribucion(clave, votos, IDS_INTERMEDIAS, (k, v, out) => {
    if (k === "MC" || k.includes("CONVERGENCIA")) {
      out.MC = v;
      return;
    }
    if (k === "PRD") {
      out.PRD = v;
      return;
    }
    if (k === "PVEM") {
      out.PVEM = v;
      return;
    }
    if (k === "PVEM_PT_MORENA") {
      out.morena_pt = v * (2 / 3);
      out.PVEM = v / 3;
      return;
    }
    if (k === "PRD_PT" || k === "PT_PRD") {
      out.morena_pt = v * 0.5;
      out.PRD = v * 0.5;
      return;
    }
    if (
      k === "MORENA" ||
      k.includes("MORENA") ||
      k === "PT" ||
      k === "PT_MOR" ||
      k === "PT_MORENA" ||
      k === "MOR_PES" ||
      k === "PT_MOR_PES"
    ) {
      out.morena_pt = v;
      return;
    }
    if (k === "PAN" || k === "PRI" || k.startsWith("PRI_") || k === "PAN_PRI") {
      out.pan_pri = v;
      return;
    }
    const split = repartoCoalicion(k, v, mapTokenIntermedias);
    if (split) {
      for (const [id, val] of Object.entries(split)) out[id] = (out[id] ?? 0) + val;
      return;
    }
    out.otros = v;
  });
}

/** @deprecated Usar id de bloque genérico. */
export type BloqueProyeccion2027 = "morena_aliados" | "pan_aliados" | "mc" | "otros";

export function getEscenarioProyeccion(id: EscenarioProyeccionId): ConfigEscenarioProyeccion {
  const esc = ESCENARIOS_PROYECCION.find((e) => e.id === id);
  if (!esc) return ESCENARIOS_PROYECCION[0];
  return esc;
}

function bloquesEscenario(escenario: ConfigEscenarioProyeccion): { id: string; etiqueta: string; color: string }[] {
  if (escenario.id === "partidos_solos") return PARTIDOS_SOLOS_CANONICOS;
  return escenario.bloques;
}

export function resumirBloquesEscenario(
  resultado: ResultadoAlcaldiaSeccion,
  escenario: ConfigEscenarioProyeccion,
): BloqueProyeccionResumen[] {
  const defs = bloquesEscenario(escenario);
  const acum = vacio([...defs.map((b) => b.id), "otros"]);

  for (const partido of filtrarPartidos(resultado.partidos)) {
    const partes = escenario.distribuir(partido.clave, partido.votos);
    for (const [id, val] of Object.entries(partes)) {
      acum[id] = (acum[id] ?? 0) + val;
    }
  }

  const sumClasificado = Object.values(acum).reduce((a, b) => a + b, 0);
  const faltante = resultado.votacionTotal - sumClasificado;
  if (faltante > 0) acum.otros = (acum.otros ?? 0) + faltante;

  const total = resultado.votacionTotal;
  const orden = [...defs.map((b) => b.id), "otros"];

  return orden.map((id) => {
    const def = defs.find((b) => b.id === id);
    return {
      id,
      etiqueta: def?.etiqueta ?? (id === "otros" ? "Otros" : id),
      votos: Math.round(acum[id] ?? 0),
      porcentaje: total > 0 ? round2(((acum[id] ?? 0) / total) * 100) : 0,
      color: def?.color ?? COLOR_OTROS,
    };
  });
}

/** @deprecated */
export function resumirBloquesProyeccion2027(resultado: ResultadoAlcaldiaSeccion): BloqueProyeccionResumen[] {
  return resumirBloquesEscenario(resultado, getEscenarioProyeccion("morena_pt_prd_pan_pri_mc"));
}

export function regresionLinealProyectar(
  puntos: { x: number; y: number }[],
  xProyectar: number = ANIO_PROYECCION,
): number | null {
  if (puntos.length < 2) return puntos.length === 1 ? puntos[0].y : null;

  const n = puntos.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const { x, y } of puntos) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-9) return round2(sumY / n);

  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return round2(a + b * xProyectar);
}

/** Pendiente OLS (pp por año): positiva = tendencia al alza entre elecciones. */
export function pendienteRegresionLineal(puntos: { x: number; y: number }[]): number | null {
  if (puntos.length < 2) return null;

  const n = puntos.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const { x, y } of puntos) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-9) return 0;

  return round2((n * sumXY - sumX * sumY) / denom);
}

export function errorValidacionLeaveOneOut(puntos: { x: number; y: number }[]): number | null {
  if (puntos.length < 3) return null;

  let sumAbs = 0;
  for (const omitido of puntos) {
    const entrenamiento = puntos.filter((p) => p.x !== omitido.x || p.y !== omitido.y);
    const pred = regresionLinealProyectar(entrenamiento, omitido.x);
    if (pred == null) continue;
    sumAbs += Math.abs(pred - omitido.y);
  }
  return round2(sumAbs / puntos.length);
}

function renormalizarBloquesPrincipales(
  pct: Record<string, number>,
  principales: string[],
): Record<string, number> {
  const o = Math.max(0, pct.otros ?? 0);
  const main = principales.map((id) => Math.max(0, pct[id] ?? 0));
  const sumMain = main.reduce((a, b) => a + b, 0);
  const out: Record<string, number> = { otros: round2(o) };

  if (sumMain <= 0) {
    for (const id of principales) out[id] = 0;
    return out;
  }

  const escala = (100 - o) / sumMain;
  for (let i = 0; i < principales.length; i += 1) {
    out[principales[i]] = round2(main[i] * escala);
  }
  return out;
}

function resultadoPorAnio(fila: AnalisisSeccionRow, anio: AnioAlcaldia): ResultadoAlcaldiaSeccion | null {
  if (anio === 2015) return fila.alcalde2015;
  if (anio === 2018) return fila.alcalde2018;
  if (anio === 2021) return fila.alcalde2021;
  return fila.alcalde2024;
}

function ganadorEntreBloques(
  bloques: Pick<BloqueProyeccionResumen, "id" | "porcentaje">[],
  principales: string[],
): { ganador: string | "empate"; margen: number } {
  const main = bloques.filter((b) => principales.includes(b.id));
  if (!main.length) return { ganador: "empate", margen: 0 };

  const sorted = [...main].sort((a, b) => b.porcentaje - a.porcentaje);
  const top = sorted[0];
  const second = sorted[1] ?? { porcentaje: 0 };

  if (Math.abs(top.porcentaje - second.porcentaje) <= UMBRAL_EMPATE_PP) {
    return { ganador: "empate", margen: 0 };
  }
  return { ganador: top.id, margen: round2(top.porcentaje - second.porcentaje) };
}

function confianzaSeccion(anios: number, errorPp: number | null): ProyeccionSeccion2027["confianza"] {
  if (anios >= 4 && (errorPp == null || errorPp <= 2.5)) return "alta";
  if (anios >= 3 && (errorPp == null || errorPp <= 4)) return "media";
  return "baja";
}

function etiquetaBloque(id: string, escenario: ConfigEscenarioProyeccion): string {
  const def = bloquesEscenario(escenario).find((b) => b.id === id);
  if (def) return def.etiqueta;
  if (id === "empate") return "Empate técnico";
  return id;
}

export function proyectarSeccionEscenario(
  fila: AnalisisSeccionRow,
  escenario: ConfigEscenarioProyeccion,
  opciones?: OpcionesProyeccionSeccion,
): ProyeccionSeccion2027 | null {
  const aniosRegresion = opciones?.aniosRegresion ?? ANIOS_ELECCION_ALCALDIA;
  const defs = bloquesEscenario(escenario);
  const principales = defs.map((b) => b.id);
  const historico: Record<string, SerieHistoricaBloque[]> = Object.fromEntries(
    [...principales, "otros"].map((id) => [id, []]),
  );

  const participacionHistorica: { anio: AnioAlcaldia; pct: number }[] = [];
  const aniosDisponibles: AnioAlcaldia[] = [];
  const erroresBloque: number[] = [];

  for (const anio of aniosRegresion) {
    const resultado = resultadoPorAnio(fila, anio);
    if (!resultado) continue;

    aniosDisponibles.push(anio);
    participacionHistorica.push({ anio, pct: resultado.participacionPct });

    const bloques = resumirBloquesEscenario(resultado, escenario);
    for (const id of Object.keys(historico)) {
      const row = bloques.find((b) => b.id === id);
      historico[id].push({
        anio,
        porcentaje: row?.porcentaje ?? 0,
        votos: row?.votos ?? 0,
      });
    }
  }

  if (aniosDisponibles.length < 2) return null;

  const puntosParticipacion = participacionHistorica.map((p) => ({ x: p.anio, y: p.pct }));
  const participacion2027 =
    regresionLinealProyectar(puntosParticipacion) ?? puntosParticipacion.at(-1)!.y;

  const listaBase =
    fila.alcalde2024?.listaNominal ??
    fila.alcalde2021?.listaNominal ??
    fila.alcalde2018?.listaNominal ??
    fila.alcalde2015?.listaNominal ??
    fila.totalElectores;
  const votacionEstimada2027 = Math.round((listaBase * participacion2027) / 100);

  const pctProyectados: Record<string, number> = Object.fromEntries(
    Object.keys(historico).map((id) => [id, 0]),
  );

  for (const id of Object.keys(historico)) {
    const puntos = historico[id].map((h) => ({ x: h.anio, y: h.porcentaje }));
    const err = errorValidacionLeaveOneOut(puntos);
    if (err != null) erroresBloque.push(err);
    pctProyectados[id] = regresionLinealProyectar(puntos) ?? puntos.at(-1)?.y ?? 0;
  }

  const normalizados = renormalizarBloquesPrincipales(pctProyectados, principales);

  const proyeccion2027: BloqueProyeccionResumen[] = [...principales, "otros"].map((id) => {
    const def = defs.find((b) => b.id === id);
    return {
      id,
      etiqueta: def?.etiqueta ?? (id === "otros" ? "Otros" : id),
      porcentaje: normalizados[id] ?? 0,
      votos: Math.round((votacionEstimada2027 * (normalizados[id] ?? 0)) / 100),
      color: def?.color ?? COLOR_OTROS,
    };
  });

  const { ganador, margen } = ganadorEntreBloques(proyeccion2027, principales);
  const errorValidacionPp =
    erroresBloque.length > 0
      ? round2(erroresBloque.reduce((a, b) => a + b, 0) / erroresBloque.length)
      : null;

  return {
    seccion: fila.seccion,
    colonias: fila.colonias,
    coloniasDetalle: fila.coloniasDetalle,
    distritoLocal: fila.distritoLocal,
    aniosDisponibles,
    historico,
    proyeccion2027,
    participacionHistorica,
    participacion2027: round2(participacion2027),
    votacionEstimada2027,
    ganadorSeccion: ganador,
    ganadorSeccionEtiqueta: etiquetaBloque(ganador, escenario),
    margenGanadorPct: margen,
    errorValidacionPp,
    confianza: confianzaSeccion(aniosDisponibles.length, errorValidacionPp),
  };
}

export function verificarDatosHistoricos(
  filas: AnalisisSeccionRow[],
  escenario: ConfigEscenarioProyeccion = getEscenarioProyeccion("morena_pt_prd_pan_pri_mc"),
): VerificacionProyeccion2027 {
  let seccionesConCuatroAnios = 0;
  let seccionesConTresAnios = 0;
  let seccionesConDosAnios = 0;
  let seccionesSinDatos = 0;
  let cuadreHistoricoOk = 0;
  let cuadreHistoricoFallo = 0;
  let maxDesviacionCuadrePct = 0;

  for (const fila of filas) {
    let anios = 0;
    for (const anio of ANIOS_ELECCION_ALCALDIA) {
      const resultado = resultadoPorAnio(fila, anio);
      if (!resultado) continue;
      anios += 1;

      const bloques = resumirBloquesEscenario(resultado, escenario);
      const sumPct = bloques.reduce((a, b) => a + b.porcentaje, 0);
      const desviacion = Math.abs(sumPct - 100);
      maxDesviacionCuadrePct = Math.max(maxDesviacionCuadrePct, desviacion);
      if (desviacion <= 1.5) cuadreHistoricoOk += 1;
      else cuadreHistoricoFallo += 1;
    }

    if (anios >= 4) seccionesConCuatroAnios += 1;
    else if (anios === 3) seccionesConTresAnios += 1;
    else if (anios === 2) seccionesConDosAnios += 1;
    else seccionesSinDatos += 1;
  }

  return {
    seccionesConCuatroAnios,
    seccionesConTresAnios,
    seccionesConDosAnios,
    seccionesSinDatos,
    cuadreHistoricoOk,
    cuadreHistoricoFallo,
    maxDesviacionCuadrePct: round2(maxDesviacionCuadrePct),
  };
}

const UMBRAL_PENDIENTE_TENDENCIA_PP_ANIO = 0.12;

function calcularContextoHistoricoProyeccion(
  proyecciones: ProyeccionSeccion2027[],
  bloquesResumen: BloqueProyeccionResumen[],
  escenario: ConfigEscenarioProyeccion,
): ContextoHistoricoProyeccion {
  const principales = bloquesEscenario(escenario).map((b) => b.id);
  const tendenciasPorBloque: TendenciaBloqueSecciones[] = [];
  const maximosPorBloque: MaximoHistoricoBloque[] = [];

  for (const bloqueId of principales) {
    const def = bloquesEscenario(escenario).find((b) => b.id === bloqueId);
    const etiqueta = def?.etiqueta ?? bloqueId;
    let seccionesSube = 0;
    let seccionesBaja = 0;
    let seccionesEstable = 0;
    let seccionesSobreMaximoPropio = 0;
    let maximoSeccionPct = 0;

    const promediosAnuales: { anio: AnioAlcaldia; pct: number }[] = [];

    for (const anio of ANIOS_ELECCION_ALCALDIA) {
      let sum = 0;
      let count = 0;
      for (const proy of proyecciones) {
        const h = proy.historico[bloqueId]?.find((x) => x.anio === anio);
        if (h) {
          sum += h.porcentaje;
          count += 1;
          maximoSeccionPct = Math.max(maximoSeccionPct, h.porcentaje);
        }
      }
      if (count > 0) {
        promediosAnuales.push({ anio, pct: round2(sum / count) });
      }
    }

    const picoPromedio = promediosAnuales.reduce(
      (best, row) => (row.pct > best.pct ? row : best),
      { anio: ANIOS_ELECCION_ALCALDIA[0], pct: 0 },
    );
    const maximoPromedioAlcaldiaPct = picoPromedio.pct;
    const proyeccionRow = bloquesResumen.find((b) => b.id === bloqueId);

    for (const proy of proyecciones) {
      const serie = proy.historico[bloqueId] ?? [];
      const puntos = serie.map((h) => ({ x: h.anio, y: h.porcentaje }));
      const pendiente = pendienteRegresionLineal(puntos);

      if (pendiente != null) {
        if (pendiente > UMBRAL_PENDIENTE_TENDENCIA_PP_ANIO) seccionesSube += 1;
        else if (pendiente < -UMBRAL_PENDIENTE_TENDENCIA_PP_ANIO) seccionesBaja += 1;
        else seccionesEstable += 1;
      }

      const maxPropio = serie.reduce((m, h) => Math.max(m, h.porcentaje), 0);
      const proyPct = proy.proyeccion2027.find((b) => b.id === bloqueId)?.porcentaje ?? 0;
      if (proyPct > maxPropio + 0.05) seccionesSobreMaximoPropio += 1;
    }

    tendenciasPorBloque.push({
      id: bloqueId,
      etiqueta,
      seccionesSube,
      seccionesBaja,
      seccionesEstable,
      seccionesSobreMaximoPropio,
    });

    maximosPorBloque.push({
      id: bloqueId,
      etiqueta,
      maximoSeccionPct: round2(maximoSeccionPct),
      maximoPromedioAlcaldiaPct: round2(maximoPromedioAlcaldiaPct),
      anioPicoPromedio: promediosAnuales.length ? picoPromedio.anio : null,
      proyeccion2027Pct: proyeccionRow?.porcentaje ?? 0,
      superaMaximoPromedio:
        (proyeccionRow?.porcentaje ?? 0) > maximoPromedioAlcaldiaPct + 0.05,
    });
  }

  return {
    seccionesConRegresionPropia: proyecciones.length,
    tendenciasPorBloque,
    maximosPorBloque,
  };
}

export function calcularProyeccionAlcaldia2027(
  filas: AnalisisSeccionRow[],
  escenarioId: EscenarioProyeccionId = "morena_pt_prd_pan_pri_mc",
): {
  proyecciones: ProyeccionSeccion2027[];
  resumen: ProyeccionAlcaldia2027;
} {
  const escenario = getEscenarioProyeccion(escenarioId);
  const principales = bloquesEscenario(escenario).map((b) => b.id);
  const aniosRegresion = escenario.aniosRegresion ?? ANIOS_ELECCION_ALCALDIA;

  const proyecciones = filas
    .map((f) => proyectarSeccionEscenario(f, escenario, { aniosRegresion }))
    .filter((p): p is ProyeccionSeccion2027 => p != null);

  const acumVotos: Record<string, number> = Object.fromEntries(
    [...principales, "otros"].map((id) => [id, 0]),
  );
  const seccionesGanaPorBloque: Record<string, number> = Object.fromEntries(
    principales.map((id) => [id, 0]),
  );

  let seccionesEmpate = 0;
  let votacionEstimadaTotal = 0;
  const errores: number[] = [];

  for (const proy of proyecciones) {
    votacionEstimadaTotal += proy.votacionEstimada2027;
    if (proy.errorValidacionPp != null) errores.push(proy.errorValidacionPp);

    if (proy.ganadorSeccion === "empate") seccionesEmpate += 1;
    else if (seccionesGanaPorBloque[proy.ganadorSeccion] != null) {
      seccionesGanaPorBloque[proy.ganadorSeccion] += 1;
    }

    for (const bloque of proy.proyeccion2027) {
      acumVotos[bloque.id] = (acumVotos[bloque.id] ?? 0) + bloque.votos;
    }
  }

  const bloques: BloqueProyeccionResumen[] = [...principales, "otros"].map((id) => {
    const def = bloquesEscenario(escenario).find((b) => b.id === id);
    return {
      id,
      etiqueta: def?.etiqueta ?? (id === "otros" ? "Otros" : id),
      votos: acumVotos[id] ?? 0,
      porcentaje:
        votacionEstimadaTotal > 0
          ? round2(((acumVotos[id] ?? 0) / votacionEstimadaTotal) * 100)
          : 0,
      color: def?.color ?? COLOR_OTROS,
    };
  });

  const { ganador: ganadorVotos } = ganadorEntreBloques(bloques, principales);
  const { ganador: ganadorPorcentaje } = ganadorEntreBloques(bloques, principales);

  const ganadorEtiqueta =
    ganadorVotos === "empate" ? "Empate técnico" : etiquetaBloque(ganadorVotos, escenario);

  const contextoHistorico = calcularContextoHistoricoProyeccion(proyecciones, bloques, escenario);

  return {
    proyecciones,
    resumen: {
      escenarioId,
      escenario: `${escenario.etiqueta} · proyección OLS ${etiquetaAniosRegresion(aniosRegresion)} por sección`,
      bloques,
      ganadorVotos,
      ganadorPorcentaje,
      ganadorEtiqueta,
      votacionEstimadaTotal,
      seccionesProyectadas: proyecciones.length,
      seccionesGanaPorBloque,
      seccionesEmpate,
      errorValidacionMediaPp:
        errores.length > 0 ? round2(errores.reduce((a, b) => a + b, 0) / errores.length) : 0,
      errorValidacionMaxPp: errores.length > 0 ? round2(Math.max(...errores)) : 0,
      verificacion: verificarDatosHistoricos(filas, escenario),
      partidosDisponibles:
        escenarioId === "partidos_solos" ? PARTIDOS_SOLOS_CANONICOS : undefined,
      contextoHistorico,
      aniosRegresion,
    },
  };
}

export function etiquetaAniosRegresion(anios: AnioAlcaldia[]): string {
  if (anios.length <= 1) return String(anios[0] ?? "");
  if (anios.length === 2) return `${anios[0]} y ${anios[1]}`;
  return `${anios[0]}–${anios[anios.length - 1]}`;
}

export function etiquetaConfianza(confianza: ProyeccionSeccion2027["confianza"]): string {
  if (confianza === "alta") return "Alta (4 elecciones, error ≤ 2.5 pp)";
  if (confianza === "media") return "Media (3 elecciones o error moderado)";
  return "Baja (pocos datos históricos)";
}

export function colorGanadorProyeccion(
  ganador: string | "empate",
  escenarioId?: EscenarioProyeccionId,
): string {
  if (ganador === "empate") return COLOR_OTROS;

  const escenario = getEscenarioProyeccion(escenarioId ?? "morena_pt_prd_pan_pri_mc");
  const def = bloquesEscenario(escenario).find((b) => b.id === ganador);
  if (def) return def.color;

  const solo = PARTIDOS_SOLOS_CANONICOS.find((p) => p.id === ganador);
  return solo?.color ?? COLOR_OTROS;
}

function claveEsPanSolo(clave: string): boolean {
  return clave.toUpperCase() === "PAN";
}

/** Gana el PAN solo si el ticket PAN (sin coalición) supera a cualquier otro partido o alianza. */
function panSoloGanoEnAnio(resultado: ResultadoAlcaldiaSeccion): boolean {
  const partidos = filtrarPartidos(resultado.partidos);
  const pan = partidos.find((p) => claveEsPanSolo(p.clave))?.votos ?? 0;
  if (pan <= 0) return false;

  let maxOtros = 0;
  for (const partido of partidos) {
    if (claveEsPanSolo(partido.clave)) continue;
    maxOtros = Math.max(maxOtros, partido.votos);
  }

  const total = resultado.votacionTotal;
  if (total <= 0) return pan > maxOtros;
  return ((pan - maxOtros) / total) * 100 > UMBRAL_EMPATE_PP;
}

/** Años 2015–2024 en los que el PAN ganó solo. Vacío si no ganó las cuatro elecciones en solitario. */
export function aniosPanSoloGanoSiempre(fila: AnalisisSeccionRow): AnioAlcaldia[] {
  const anios: AnioAlcaldia[] = [];
  for (const anio of ANIOS_ELECCION_ALCALDIA) {
    const resultado = resultadoPorAnio(fila, anio);
    if (!resultado || !panSoloGanoEnAnio(resultado)) return [];
    anios.push(anio);
  }
  return anios;
}

function asignarVotosProporcional(capacidades: number[], totalAsignar: number): number[] {
  const capTotal = capacidades.reduce((a, b) => a + b, 0);
  if (capTotal <= 0 || totalAsignar <= 0) return capacidades.map(() => 0);

  const objetivo = Math.min(totalAsignar, capTotal);
  const crudos = capacidades.map((c) => (c / capTotal) * objetivo);
  const enteros = crudos.map((x) => Math.floor(x));
  let restante = objetivo - enteros.reduce((a, b) => a + b, 0);

  const orden = crudos
    .map((x, i) => ({ i, frac: x - Math.floor(x), cap: capacidades[i] }))
    .sort((a, b) => b.frac - a.frac || b.cap - a.cap || a.i - b.i);

  for (const { i } of orden) {
    if (restante <= 0) break;
    const hueco = capacidades[i] - enteros[i];
    if (hueco <= 0) continue;
    const add = Math.min(hueco, restante);
    enteros[i] += add;
    restante -= add;
  }

  return enteros;
}

export type CrecimientoSeccionMeta58 = {
  seccion: string;
  colonias: string;
  coloniasDetalle: ColoniasSeccionInfo;
  distritoLocal: number | null;
  aniosGanoPan: AnioAlcaldia[];
  votacionEstimada2027: number;
  votosPanProyectados: number;
  porcentajePanProyectado: number;
  techoCrecimientoVotos: number;
  crecimientoAsignadoVotos: number;
  votosMeta: number;
  porcentajeMetaSeccion: number;
};

export type CrecimientoMetaGlobalPan = {
  metaPct: number;
  bloqueId: string;
  bloqueEtiqueta: string;
  votacionEstimadaTotal: number;
  votosPanActuales: number;
  porcentajePanActual: number;
  votosMetaGlobal: number;
  faltanteGlobal: number;
  seccionesHistoricasPan: number;
  votosPanEnHistoricas: number;
  techoCrecimientoHistoricas: number;
  crecimientoAsignadoTotal: number;
  deficitFueraDeHistoricas: number;
  alcanzableSoloEnHistoricas: boolean;
  filas: CrecimientoSeccionMeta58[];
};

/**
 * En secciones donde el PAN ganó solo (voto PAN, sin coalición) las cuatro elecciones
 * 2015–2024, reparte el faltante para llegar a `metaPct` de la votación global 2027.
 * Los votos 2027 son siempre del PAN en solitario, no de alianzas del escenario.
 */
export function calcularCrecimientoMetaGlobalPan(
  filas: AnalisisSeccionRow[],
  proyecciones: ProyeccionSeccion2027[],
  resumen: ProyeccionAlcaldia2027,
  metaPct: number = META_GLOBAL_PAN_PCT,
): CrecimientoMetaGlobalPan {
  const bloqueId = "PAN";
  const bloqueEtiqueta = "PAN";
  const escenarioPan = getEscenarioProyeccion("partidos_solos");
  const proyeccionesPan =
    resumen.escenarioId === "partidos_solos"
      ? proyecciones
      : filas
          .map((fila) => proyectarSeccionEscenario(fila, escenarioPan))
          .filter((p): p is ProyeccionSeccion2027 => p != null);

  let votosPanActuales = 0;
  for (const proy of proyeccionesPan) {
    votosPanActuales += proy.proyeccion2027.find((b) => b.id === bloqueId)?.votos ?? 0;
  }

  const votacionEstimadaTotal = resumen.votacionEstimadaTotal;
  const votosMetaGlobal = Math.round((votacionEstimadaTotal * metaPct) / 100);
  const faltanteGlobal = Math.max(0, votosMetaGlobal - votosPanActuales);
  const porcentajePanActual =
    votacionEstimadaTotal > 0 ? round2((votosPanActuales / votacionEstimadaTotal) * 100) : 0;

  const porSeccion = new Map(proyeccionesPan.map((p) => [p.seccion, p]));
  const candidatas: Omit<CrecimientoSeccionMeta58, "crecimientoAsignadoVotos" | "votosMeta" | "porcentajeMetaSeccion">[] =
    [];

  for (const fila of filas) {
    const aniosGanoPan = aniosPanSoloGanoSiempre(fila);
    if (!aniosGanoPan.length) continue;
    const proy = porSeccion.get(fila.seccion);
    if (!proy) continue;

    const pan = proy.proyeccion2027.find((b) => b.id === bloqueId);
    const votosPanProyectados = pan?.votos ?? 0;
    const porcentajePanProyectado = pan?.porcentaje ?? 0;
    const techoCrecimientoVotos = Math.max(0, proy.votacionEstimada2027 - votosPanProyectados);

    candidatas.push({
      seccion: proy.seccion,
      colonias: proy.colonias,
      coloniasDetalle: proy.coloniasDetalle,
      distritoLocal: proy.distritoLocal,
      aniosGanoPan,
      votacionEstimada2027: proy.votacionEstimada2027,
      votosPanProyectados,
      porcentajePanProyectado,
      techoCrecimientoVotos,
    });
  }

  const techoCrecimientoHistoricas = candidatas.reduce((a, f) => a + f.techoCrecimientoVotos, 0);
  const votosPanEnHistoricas = candidatas.reduce((a, f) => a + f.votosPanProyectados, 0);
  const asignados = asignarVotosProporcional(
    candidatas.map((f) => f.techoCrecimientoVotos),
    faltanteGlobal,
  );
  const crecimientoAsignadoTotal = asignados.reduce((a, n) => a + n, 0);
  const deficitFueraDeHistoricas = Math.max(0, faltanteGlobal - techoCrecimientoHistoricas);

  const filasMeta: CrecimientoSeccionMeta58[] = candidatas
    .map((fila, i) => {
      const crecimientoAsignadoVotos = asignados[i] ?? 0;
      const votosMeta = fila.votosPanProyectados + crecimientoAsignadoVotos;
      return {
        ...fila,
        crecimientoAsignadoVotos,
        votosMeta,
        porcentajeMetaSeccion:
          fila.votacionEstimada2027 > 0 ? round2((votosMeta / fila.votacionEstimada2027) * 100) : 0,
      };
    })
    .sort(
      (a, b) =>
        b.crecimientoAsignadoVotos - a.crecimientoAsignadoVotos ||
        b.techoCrecimientoVotos - a.techoCrecimientoVotos ||
        Number(a.seccion) - Number(b.seccion),
    );

  return {
    metaPct,
    bloqueId,
    bloqueEtiqueta,
    votacionEstimadaTotal,
    votosPanActuales,
    porcentajePanActual,
    votosMetaGlobal,
    faltanteGlobal,
    seccionesHistoricasPan: filasMeta.length,
    votosPanEnHistoricas,
    techoCrecimientoHistoricas,
    crecimientoAsignadoTotal,
    deficitFueraDeHistoricas,
    alcanzableSoloEnHistoricas: deficitFueraDeHistoricas === 0,
    filas: filasMeta,
  };
}

export function formatResumenGanador(resumen: ProyeccionAlcaldia2027): string {
  const principales = resumen.bloques.filter((b) => b.id !== "otros");
  const bloqueGanador = [...principales].sort((a, b) => b.porcentaje - a.porcentaje)[0];

  if (!bloqueGanador || resumen.ganadorPorcentaje === "empate") {
    return "Proyección 2027: empate técnico entre los bloques principales.";
  }

  return `Proyección 2027: ${resumen.ganadorEtiqueta} gana con ${formatPorcentaje(bloqueGanador.porcentaje)} del voto estimado (${bloqueGanador.votos.toLocaleString("es-MX")} votos) · error medio de validación ${resumen.errorValidacionMediaPp.toFixed(2)} pp.`;
}

/** Compatibilidad con código previo. */
export function proyectarSeccion2027(fila: AnalisisSeccionRow): ProyeccionSeccion2027 | null {
  return proyectarSeccionEscenario(fila, getEscenarioProyeccion("morena_pt_prd_pan_pri_mc"));
}

export function segmentosTituloEscenario(escenarioId: EscenarioProyeccionId): { texto: string; color: string }[] {
  switch (escenarioId) {
    case "morena_pt_prd_pan_pri_mc":
      return [
        { texto: "MORENA+PT+PRD", color: COLOR_MORENA },
        { texto: "PAN+PRI", color: COLOR_PAN },
        { texto: "MC", color: COLOR_MC },
      ];
    case "morena_prd_pan_pri_mc":
      return [
        { texto: "MORENA+PRD", color: COLOR_MORENA },
        { texto: "PAN+PRI", color: COLOR_PAN },
        { texto: "MC", color: COLOR_MC },
        { texto: "PT", color: COLOR_PT },
      ];
    case "pan_pri_mc_vs_morena_pt_prd_verde":
      return [
        { texto: "PAN+PRI+MC", color: COLOR_PAN },
        { texto: "MORENA+PT+PRD+Verde", color: COLOR_PVEM },
      ];
    case "partidos_solos":
      return [{ texto: "Partidos solos", color: COLOR_OTROS }];
    case "intermedias_morena_pt_pan_pri":
      return [
        { texto: "MORENA+PT", color: COLOR_MORENA },
        { texto: "PAN+PRI", color: COLOR_PAN },
        { texto: "MC", color: COLOR_MC },
        { texto: "PRD", color: COLOR_PRD_PT },
        { texto: "Verde", color: COLOR_PVEM },
      ];
  }
}

/** Resalta en negrita y color los nombres de bloques dentro de un párrafo. */
export function patronesResaltadoBloques(
  escenarioId: EscenarioProyeccionId,
): { patron: string; color: string }[] {
  const base = [
    { patron: "MORENA + PT + PRD", color: COLOR_MORENA },
    { patron: "MORENA+PT+PRD+Verde", color: COLOR_PVEM },
    { patron: "MORENA+PT+PRD", color: COLOR_MORENA },
    { patron: "MORENA + PT", color: COLOR_MORENA },
    { patron: "MORENA+PT", color: COLOR_MORENA },
    { patron: "MORENA + PRD", color: COLOR_MORENA },
    { patron: "MORENA+PRD", color: COLOR_MORENA },
    { patron: "PAN + PRI + MC", color: COLOR_PAN },
    { patron: "PAN+PRI+MC", color: COLOR_PAN },
    { patron: "PAN + PRI", color: COLOR_PAN },
    { patron: "PAN+PRI", color: COLOR_PAN },
    { patron: "MORENA y aliados", color: COLOR_MORENA },
    { patron: "PAN y aliados", color: COLOR_PAN },
    { patron: "PVEM (Verde)", color: COLOR_PVEM },
  ];
  if (escenarioId === "partidos_solos") {
    return [
      ...PARTIDOS_SOLOS_CANONICOS.map((p) => ({ patron: p.etiqueta, color: p.color })),
      { patron: "MORENA", color: COLOR_MORENA },
      { patron: "PAN", color: COLOR_PAN },
      { patron: "PRI", color: COLOR_PRI },
      { patron: "MC", color: COLOR_MC },
      { patron: "PRD", color: COLOR_PRD_PT },
      { patron: "PT", color: COLOR_PT },
      { patron: "PVEM", color: COLOR_PVEM },
    ].sort((a, b) => b.patron.length - a.patron.length);
  }
  return [...base, { patron: "MC", color: COLOR_MC }, { patron: "PT", color: COLOR_PT }].sort(
    (a, b) => b.patron.length - a.patron.length,
  );
}

export function colorPartidoSolo(id: string): string {
  return PARTIDOS_SOLOS_CANONICOS.find((p) => p.id === id)?.color ?? COLOR_OTROS;
}

export type AnalisisNarrativoProyeccion = {
  titulo: string;
  parrafos: string[];
  palabras: number;
};

const MAX_PALABRAS_ANALISIS = 500;

function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

function truncarPalabras(texto: string, max: number): string {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  if (palabras.length <= max) return texto.trim();
  return `${palabras.slice(0, max).join(" ")}…`;
}

function bloquesPrincipalesOrdenados(resumen: ProyeccionAlcaldia2027): BloqueProyeccionResumen[] {
  return resumen.bloques
    .filter((b) => b.id !== "otros")
    .sort((a, b) => b.porcentaje - a.porcentaje);
}

function textoExplicacionOls(resumen: ProyeccionAlcaldia2027): string {
  const anios = etiquetaAniosRegresion(resumen.aniosRegresion);
  const cuantos = resumen.aniosRegresion.length;
  return (
    `¿Qué hace el OLS? La regresión lineal por mínimos cuadrados (OLS) traza la recta que mejor ` +
    `ajusta los ${cuantos} puntos históricos (${anios}) de cada bloque en cada sección: ` +
    "minimiza la suma de los errores al cuadrado entre el valor real y el valor que la recta " +
    "predice. Esa recta captura la tendencia local (sube, baja o se mantiene) y se prolonga hasta 2027. " +
    "No es un promedio simple: una sección donde MORENA creció en las últimas elecciones proyectará " +
    "más que otra donde se estancó, aunque hoy tengan porcentajes parecidos."
  );
}

function textoTendenciasPorSeccion(resumen: ProyeccionAlcaldia2027): string {
  const { contextoHistorico } = resumen;
  const partes = contextoHistorico.tendenciasPorBloque.map((t) => {
    return (
      `${t.etiqueta}: ${t.seccionesSube} secciones con tendencia al alza, ${t.seccionesBaja} a la baja ` +
      `y ${t.seccionesEstable} estables (pendiente OLS ±${UMBRAL_PENDIENTE_TENDENCIA_PP_ANIO} pp/año)`
    );
  });
  return (
    `Tendencias por sección: en las ${contextoHistorico.seccionesConRegresionPropia} secciones proyectadas ` +
    `cada bloque tiene su propia recta OLS (no se aplica un solo promedio alcaldial). ${partes.join(". ")}.`
  );
}

function textoMaximosHistoricos(resumen: ProyeccionAlcaldia2027): string {
  const partes = resumen.contextoHistorico.maximosPorBloque.map((m) => {
    const pico =
      m.anioPicoPromedio != null
        ? ` (pico promedio alcaldial en ${m.anioPicoPromedio}: ${formatPorcentaje(m.maximoPromedioAlcaldiaPct)})`
        : "";
    const comparacion = m.superaMaximoPromedio
      ? ` La proyección 2027 (${formatPorcentaje(m.proyeccion2027Pct)}) supera ese pico histórico: es extrapolación más allá de lo observado.`
      : ` La proyección 2027 (${formatPorcentaje(m.proyeccion2027Pct)}) queda dentro o por debajo del pico histórico.`;
    const sobreSeccion = resumen.contextoHistorico.tendenciasPorBloque.find((t) => t.id === m.id);
    const notaSeccion =
      sobreSeccion && sobreSeccion.seccionesSobreMaximoPropio > 0
        ? ` En ${sobreSeccion.seccionesSobreMaximoPropio} secciones la proyección supera el máximo propio 2015–2024.`
        : "";
    return (
      `${m.etiqueta}: máximo en una sección ${formatPorcentaje(m.maximoSeccionPct)}${pico}.${comparacion}${notaSeccion}`
    );
  });
  return (
    "Máximos históricos: se revisan los techos de 2015–2024 por bloque y se comparan con 2027. " +
    "No se impone un tope automático al pronóstico, pero sí se señala cuando la extrapolación OLS " +
    "queda por encima de lo ya visto. " +
    partes.join(" ")
  );
}

function textoMetodologiaBase(resumen: ProyeccionAlcaldia2027): string {
  return (
    `La estimación parte de ${resumen.seccionesProyectadas} secciones con histórico IECM ` +
    `(${etiquetaAniosRegresion(resumen.aniosRegresion)}). En cada sección se homologan los ` +
    `votos al escenario seleccionado y se calcula el porcentaje de cada bloque por elección. ` +
    `La participación también se extrapola con OLS para estimar votos. ` +
    `La validación cruzada leave-one-out arroja un error medio de ${resumen.errorValidacionMediaPp.toFixed(2)} ` +
    `puntos porcentuales por sección (máximo ${resumen.errorValidacionMaxPp.toFixed(2)} pp). ` +
    `${resumen.verificacion.seccionesConCuatroAnios} secciones tienen las cuatro elecciones en base.`
  );
}

function textoPronosticoAgregado(resumen: ProyeccionAlcaldia2027): string {
  const ordenados = bloquesPrincipalesOrdenados(resumen);
  const primero = ordenados[0];
  const segundo = ordenados[1];

  if (!primero) {
    return "No hay bloques principales suficientes para emitir un pronóstico agregado.";
  }

  if (resumen.ganadorPorcentaje === "empate" || !segundo) {
    return (
      `El pronóstico agregado apunta a un escenario muy reñido: ningún bloque consolida ventaja clara ` +
      `sobre el resto. La votación estimada total es de ${resumen.votacionEstimadaTotal.toLocaleString("es-MX")} votos.`
    );
  }

  const margen = round2(primero.porcentaje - segundo.porcentaje);
  const seccionesPrimero = resumen.seccionesGanaPorBloque[primero.id] ?? 0;
  const seccionesSegundo = resumen.seccionesGanaPorBloque[segundo.id] ?? 0;

  return (
    `Pronóstico 2027: ${primero.etiqueta} encabeza con ${formatPorcentaje(primero.porcentaje)} ` +
    `(${primero.votos.toLocaleString("es-MX")} votos estimados), seguido de ${segundo.etiqueta} con ` +
    `${formatPorcentaje(segundo.porcentaje)}. La ventaja es de ${margen.toFixed(2)} pp a nivel alcaldía. ` +
    `En geografía electoral, ${primero.etiqueta} ganaría ${seccionesPrimero} secciones frente a ` +
    `${seccionesSegundo} de ${segundo.etiqueta}` +
    `${resumen.seccionesEmpate > 0 ? ` (${resumen.seccionesEmpate} en empate técnico)` : ""}. ` +
    `Total de votación proyectada: ${resumen.votacionEstimadaTotal.toLocaleString("es-MX")}.`
  );
}

function textoDesgloseBloques(resumen: ProyeccionAlcaldia2027): string {
  const partes = bloquesPrincipalesOrdenados(resumen).map((b) => {
    const sec = resumen.seccionesGanaPorBloque[b.id] ?? 0;
    return `${b.etiqueta}: ${formatPorcentaje(b.porcentaje)} (${b.votos.toLocaleString("es-MX")} votos, ${sec} secciones)`;
  });
  return `Desglose estimado: ${partes.join(" · ")}.`;
}

function homologacionEscenario(escenarioId: EscenarioProyeccionId): string {
  switch (escenarioId) {
    case "morena_pt_prd_pan_pri_mc":
      return (
        "En este escenario MORENA, PT y PRD (incluida la alianza PRD-PT de 2015 y tickets como PVEM_PT_MORENA) " +
        "suman un solo bloque; PAN y PRI forman otro; MC compite solo (Convergencia se homologa a MC en 2015). " +
        "Las coaliciones mixtas del IECM se reparten por componentes del ticket para no duplicar votos."
      );
    case "morena_prd_pan_pri_mc":
      return (
        "Aquí MORENA va con PRD pero sin PT: el PT queda como fuerza independiente. PAN y PRI siguen juntos y MC solo. " +
        "Sirve para simular una alianza morenista más estrecha (sin Workers) mientras el PT conserva candidatura o voto propio."
      );
    case "pan_pri_mc_vs_morena_pt_prd_verde":
      return (
        "Este escenario reduce la contienda a dos mega-bloques: PAN+PRI+MC frente a MORENA+PT+PRD+PVEM (Verde). " +
        "Convergencia/MC de 2015 entra al bloque opositor; los tickets combinados del IECM se asignan proporcionalmente."
      );
    case "partidos_solos":
      return (
        "Cada partido compite por separado: MORENA, PAN, PRI, MC, PRD, PT y PVEM. Los votos de coalición histórica " +
        "se reparten entre los partidos del ticket (p. ej. PAN_PRI_PRD aporta a PAN, PRI y PRD). " +
        "El ganador de la alcaldía sería quien más votos agregue en este escenario fragmentado."
      );
    case "intermedias_morena_pt_pan_pri":
      return (
        "Este escenario usa solo las elecciones intermedias 2015 y 2021 (sin presidente ni jefe de gobierno), " +
        "las más parecidas a 2027. MORENA va con PT; PAN va con PRI; MC, PRD y PVEM (Verde) compiten solos. " +
        "La alianza PRD-PT de 2015 se parte a la mitad entre PRD y el bloque MORENA+PT. " +
        "La recta OLS de cada sección se traza con esos dos puntos y se prolonga a 2027 en las 403 secciones."
      );
  }
}

function analisisPartidoSolo(
  resumen: ProyeccionAlcaldia2027,
  partidoSoloId: string,
): string {
  const ordenados = bloquesPrincipalesOrdenados(resumen);
  const partido = ordenados.find((b) => b.id === partidoSoloId);
  if (!partido) return "";

  const posicion = ordenados.findIndex((b) => b.id === partidoSoloId) + 1;
  const lider = ordenados[0];
  const diffLider =
    lider && lider.id !== partidoSoloId ? round2(lider.porcentaje - partido.porcentaje) : 0;
  const secciones = resumen.seccionesGanaPorBloque[partidoSoloId] ?? 0;

  if (posicion === 1) {
    return (
      `${partido.etiqueta} lideraría la proyección a partidos solos con ${formatPorcentaje(partido.porcentaje)} ` +
      `y ${partido.votos.toLocaleString("es-MX")} votos, ganando ${secciones} de ${resumen.seccionesProyectadas} secciones. ` +
      `La tendencia OLS 2015–2024 favorece a este partido frente al resto en agregado alcaldial.`
    );
  }

  return (
    `Con foco en ${partido.etiqueta}: ocuparía el ${posicion}.º lugar con ${formatPorcentaje(partido.porcentaje)} ` +
    `(${partido.votos.toLocaleString("es-MX")} votos) y ganaría ${secciones} secciones. ` +
    `${lider ? `${lider.etiqueta} iría arriba por ${diffLider.toFixed(2)} pp.` : ""} ` +
    `Útil para ver el techo de crecimiento de ${partido.etiqueta} sin coaliciones.`
  );
}

/** Narrativa dinámica (≤500 palabras) según escenario y controles activos. */
export function generarAnalisisNarrativoProyeccion(
  escenarioId: EscenarioProyeccionId,
  resumen: ProyeccionAlcaldia2027,
  partidoSoloId?: string,
): AnalisisNarrativoProyeccion {
  const escenario = getEscenarioProyeccion(escenarioId);
  const parrafos: string[] = [
    homologacionEscenario(escenarioId),
    textoExplicacionOls(resumen),
    textoMetodologiaBase(resumen),
    textoTendenciasPorSeccion(resumen),
    textoMaximosHistoricos(resumen),
    textoPronosticoAgregado(resumen),
    textoDesgloseBloques(resumen),
  ];

  if (escenarioId === "partidos_solos" && partidoSoloId) {
    const foco = analisisPartidoSolo(resumen, partidoSoloId);
    if (foco) parrafos.push(foco);
  }

  if (escenarioId === "morena_pt_prd_pan_pri_mc") {
    const mc = resumen.bloques.find((b) => b.id === "mc");
    const secMc = resumen.seccionesGanaPorBloque.mc ?? 0;
    parrafos.push(
      `MC aparece como tercera fuerza con ${mc ? formatPorcentaje(mc.porcentaje) : "—"}; ` +
        `rara vez gana secciones en bloque (${secMc}), pero condiciona márgenes donde PAN+PRI y MORENA+aliados compiten.`,
    );
  }

  if (escenarioId === "morena_prd_pan_pri_mc") {
    const pt = resumen.bloques.find((b) => b.id === "pt");
    parrafos.push(
      `El PT separado captura ${pt ? formatPorcentaje(pt.porcentaje) : "—"}; su proyección refleja si el voto duro ` +
        `del trabajo perdura aunque MORENA y PRD vayan juntos, restándole espacio a ambos bloques principales.`,
    );
  }

  if (escenarioId === "pan_pri_mc_vs_morena_pt_prd_verde") {
    parrafos.push(
      "Este duelo binario concentra el voto útil: quien gane secciones en el centro de Coyoacán probablemente arrastre " +
        "la alcaldía. La suma de los dos bloques concentra la mayor parte del electorado proyectado.",
    );
  }

  if (escenarioId === "intermedias_morena_pt_pan_pri") {
    parrafos.push(
      "Al omitir 2018 y 2024 (años concurrentes con presidencia y jefatura de gobierno) se evita que el arrastre " +
        "presidencial distorsione la tendencia de una elección intermedia como 2027. MC, PRD y Verde quedan como " +
        "fuerzas propias y pueden restar margen a MORENA+PT o a PAN+PRI según la sección.",
    );
  }

  let textoCompleto = parrafos.join("\n\n");
  let palabras = contarPalabras(textoCompleto);
  if (palabras > MAX_PALABRAS_ANALISIS) {
    textoCompleto = truncarPalabras(textoCompleto, MAX_PALABRAS_ANALISIS);
    palabras = contarPalabras(textoCompleto);
    parrafos.length = 0;
    parrafos.push(textoCompleto);
  }

  return {
    titulo: `Análisis del escenario: ${escenario.etiqueta}`,
    parrafos: palabras <= MAX_PALABRAS_ANALISIS ? parrafos : [textoCompleto],
    palabras,
  };
}
