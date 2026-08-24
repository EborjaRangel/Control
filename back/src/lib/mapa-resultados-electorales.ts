/**
 * Ganador de sección para el mapa: por partido (sin coalición) y por coalición.
 * Fuente: resultados de alcaldía IECM 2015–2024.
 */

import {
  cargarResultadosAlcaldiaCoyoacan,
  resultadosAlcaldiaDisponibles,
  type AnioAlcaldiaResultados,
  type PartidoVotosSeccion,
  type ResultadoAlcaldiaSeccion,
} from "./resultados-alcaldia-iecm.js";
import { SECCIONES_ELECTORALES_COYOACAN } from "./secciones-electorales.js";

export const ANIOS_MAPA_RESULTADOS: AnioAlcaldiaResultados[] = [2015, 2018, 2021, 2024];

/** Colores de partido (PRI en rojo, como se pide en el mapa). */
export const COLOR_PARTIDO: Record<string, string> = {
  PAN: "#0055A4",
  PRI: "#E30613",
  PRD: "#FFD100",
  PVEM: "#009A44",
  MORENA: "#9F2241",
  PT: "#5C0A1A",
  MC: "#F58220",
  PES: "#6A1B9A",
  NA: "#00A9CE",
  PH: "#8E24AA",
  ES: "#546E7A",
  FXM: "#C2185B",
  RSP: "#6D4C41",
  ELIGE: "#37474F",
  OTROS: "#767676",
  EMPATE: "#9E9E9E",
  SIN_DATOS: "#E8E8E8",
};

const ETIQUETA_PARTIDO: Record<string, string> = {
  PAN: "PAN",
  PRI: "PRI",
  PRD: "PRD",
  PVEM: "Verde",
  MORENA: "MORENA",
  PT: "PT",
  MC: "MC",
  PES: "Encuentro Social",
  NA: "Nueva Alianza",
  PH: "Humanista",
  ES: "Encuentro Social",
  FXM: "Fuerza por México",
  RSP: "Redes Sociales Progresistas",
  ELIGE: "Elige",
  OTROS: "Otros",
  EMPATE: "Empate",
  SIN_DATOS: "Sin datos",
};

const ALIAS_TOKEN: Record<string, string> = {
  MOR: "MORENA",
  MORENA: "MORENA",
  CONVERGENCIA: "MC",
  NVA_ALIANZA: "NA",
  NA: "NA",
  PVEM: "PVEM",
  VERDE: "PVEM",
};

/** Candidatura común sin columnas sueltas: se atribuye al partido ancla. */
const ANCLA_CANDIDATURA_COMUN: Record<string, string> = {
  PVEM_PT_MORENA: "MORENA",
  PT_MORENA_PVEM: "MORENA",
  MORENA_PT_PVEM: "MORENA",
  PRD_PT: "PRD",
  PT_PRD: "PRD",
};

const IGNORAR = new Set(["CNR", "NULOS", "VN", "NO_REGISTRADOS"]);

export type GanadorMapa = {
  clave: string;
  etiqueta: string;
  color: string;
  votos: number;
  porcentaje: number;
};

export type SeccionMapaResultados = {
  partido: GanadorMapa;
  coalicion: GanadorMapa;
  votacionTotal: number;
  participacionPct: number;
};

export type LeyendaMapaItem = {
  clave: string;
  etiqueta: string;
  color: string;
  secciones: number;
};

export type AnioMapaResultados = {
  anio: AnioAlcaldiaResultados;
  etiqueta: string;
  notaPartido: string | null;
  notaCoalicion: string | null;
  porSeccion: Record<string, SeccionMapaResultados>;
  resumenPartido: Record<string, number>;
  resumenCoalicion: Record<string, number>;
  leyendaPartido: LeyendaMapaItem[];
  leyendaCoalicion: LeyendaMapaItem[];
};

export type MapaResultadosResponse = {
  disponible: boolean;
  anios: AnioAlcaldiaResultados[];
  leyendaPartido: { clave: string; etiqueta: string; color: string }[];
  leyendaCoalicion: { clave: string; etiqueta: string; color: string }[];
  porAnio: Record<string, AnioMapaResultados>;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function normalizarClave(clave: string) {
  return clave.trim().toUpperCase().replace(/-/g, "_").replace(/\s+/g, "_");
}

function tokensPartido(claveRaw: string): string[] {
  const k = normalizarClave(claveRaw);
  if (!k || IGNORAR.has(k)) return [];
  if (ALIAS_TOKEN[k]) return [ALIAS_TOKEN[k]];
  if (k === "PRD_PT" || k === "PT_PRD") return ["PRD", "PT"];
  if (k === "NVA_ALIANZA") return ["NA"];

  const partes = k.split("_").filter(Boolean);
  if (partes.length <= 1) {
    return [ALIAS_TOKEN[k] ?? k];
  }

  const tokens: string[] = [];
  for (let i = 0; i < partes.length; i += 1) {
    const a = partes[i];
    const b = partes[i + 1];
    if (a === "NVA" && b === "ALIANZA") {
      tokens.push("NA");
      i += 1;
      continue;
    }
    tokens.push(ALIAS_TOKEN[a] ?? a);
  }
  return tokens;
}

function colorDe(clave: string) {
  return COLOR_PARTIDO[clave] ?? COLOR_PARTIDO.OTROS;
}

function etiquetaDe(clave: string) {
  return ETIQUETA_PARTIDO[clave] ?? clave.replaceAll("_", "-");
}

function ganadorDeMapa(votos: Map<string, number>, total: number): GanadorMapa {
  const entries = [...votos.entries()].filter(([clave, n]) => n > 0 && clave !== "CNR");
  if (!entries.length || total <= 0) {
    return {
      clave: "SIN_DATOS",
      etiqueta: etiquetaDe("SIN_DATOS"),
      color: COLOR_PARTIDO.SIN_DATOS,
      votos: 0,
      porcentaje: 0,
    };
  }

  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const [clave, n] = entries[0]!;
  const segundo = entries[1]?.[1] ?? 0;
  if (n === segundo) {
    return {
      clave: "EMPATE",
      etiqueta: etiquetaDe("EMPATE"),
      color: COLOR_PARTIDO.EMPATE,
      votos: n,
      porcentaje: round2((n / total) * 100),
    };
  }

  return {
    clave,
    etiqueta: etiquetaDe(clave),
    color: colorDe(clave),
    votos: Math.round(n),
    porcentaje: round2((n / total) * 100),
  };
}

/** Suma votos a cada partido; las combinaciones se reparte o van al ancla si no hay sueltos. */
export function votosPorPartido(partidos: PartidoVotosSeccion[]): Map<string, number> {
  const sueltos = new Map<string, number>();
  const combos: { clave: string; tokens: string[]; votos: number }[] = [];

  for (const p of partidos) {
    if (p.votos <= 0) continue;
    const clave = normalizarClave(p.clave);
    const tokens = tokensPartido(p.clave);
    if (!tokens.length) continue;
    if (tokens.length === 1) {
      sueltos.set(tokens[0]!, (sueltos.get(tokens[0]!) ?? 0) + p.votos);
    } else {
      combos.push({ clave, tokens, votos: p.votos });
    }
  }

  const out = new Map(sueltos);
  for (const combo of combos) {
    const ancla = ANCLA_CANDIDATURA_COMUN[combo.clave];
    const pesos = combo.tokens.map((t) => sueltos.get(t) ?? 0);
    const sumaPesos = pesos.reduce((a, b) => a + b, 0);

    if (sumaPesos > 0) {
      combo.tokens.forEach((token, i) => {
        out.set(token, (out.get(token) ?? 0) + (combo.votos * pesos[i]!) / sumaPesos);
      });
    } else if (ancla) {
      out.set(ancla, (out.get(ancla) ?? 0) + combo.votos);
    } else {
      const parte = combo.votos / combo.tokens.length;
      for (const token of combo.tokens) {
        out.set(token, (out.get(token) ?? 0) + parte);
      }
    }
  }

  return out;
}

type DefCoalicion = {
  clave: string;
  etiqueta: string;
  color: string;
  match: (claveNorm: string, tokens: string[]) => boolean;
};

function coalicionesDelAnio(anio: AnioAlcaldiaResultados): DefCoalicion[] {
  if (anio === 2015) {
    return [
      {
        clave: "PRD_PT",
        etiqueta: "PRD-PT",
        color: COLOR_PARTIDO.PRD,
        match: (k, tokens) =>
          k === "PRD_PT" ||
          k === "PT_PRD" ||
          (tokens.length === 1 && (tokens[0] === "PRD" || tokens[0] === "PT")),
      },
    ];
  }

  if (anio === 2018) {
    const jhh = new Set(["MORENA", "PT", "PES"]);
    const oposicion = new Set(["PAN", "PRD", "MC"]);
    return [
      {
        clave: "JHH",
        etiqueta: "PT-MORENA-PES",
        color: COLOR_PARTIDO.MORENA,
        match: (_k, tokens) => tokens.length > 0 && tokens.every((t) => jhh.has(t)),
      },
      {
        clave: "PAN_PRD_MC",
        etiqueta: "PAN-PRD-MC",
        color: COLOR_PARTIDO.PAN,
        match: (_k, tokens) => tokens.length > 0 && tokens.every((t) => oposicion.has(t)),
      },
    ];
  }

  const jhh = new Set(["MORENA", "PT", "PVEM"]);
  const vxm = new Set(["PAN", "PRI", "PRD"]);
  return [
    {
      clave: "JHH",
      etiqueta: "MORENA-PT-Verde",
      color: COLOR_PARTIDO.MORENA,
      match: (_k, tokens) => tokens.length > 0 && tokens.every((t) => jhh.has(t)),
    },
    {
      clave: "VXM",
      etiqueta: "PAN-PRI-PRD",
      color: COLOR_PARTIDO.PAN,
      match: (_k, tokens) => tokens.length > 0 && tokens.every((t) => vxm.has(t)),
    },
  ];
}

export function votosPorCoalicion(
  partidos: PartidoVotosSeccion[],
  anio: AnioAlcaldiaResultados,
): Map<string, number> {
  const defs = coalicionesDelAnio(anio);
  const out = new Map<string, number>();

  for (const p of partidos) {
    if (p.votos <= 0) continue;
    const clave = normalizarClave(p.clave);
    const tokens = tokensPartido(p.clave);
    if (!tokens.length) continue;

    const coalicion = defs.find((d) => d.match(clave, tokens));
    if (coalicion) {
      out.set(coalicion.clave, (out.get(coalicion.clave) ?? 0) + p.votos);
      continue;
    }

    const partido = tokens.length === 1 ? tokens[0]! : "OTROS";
    out.set(partido, (out.get(partido) ?? 0) + p.votos);
  }

  return out;
}

function etiquetaCargo(anio: AnioAlcaldiaResultados) {
  return anio === 2015 ? "Jefe delegacional 2015" : `Alcalde ${anio}`;
}

function notaPartido(anio: AnioAlcaldiaResultados): string | null {
  if (anio === 2024) {
    return "En 2024 MORENA, PT y Verde fueron candidatura común: ese voto se pinta como MORENA.";
  }
  if (anio === 2015) {
    return "En 2015 PRD y PT fueron candidatura común: ese voto se pinta como PRD.";
  }
  return null;
}

function notaCoalicion(anio: AnioAlcaldiaResultados): string | null {
  if (anio === 2015) {
    return "PRD-PT se pinta en amarillo. PAN, PRI y MORENA conservan su color porque contendieron solos.";
  }
  if (anio === 2018) {
    return "PT-MORENA-PES se pinta en guinda y PAN-PRD-MC en azul. PRI y Verde conservan su color.";
  }
  return "MORENA-PT-Verde se pinta en guinda y PAN-PRI-PRD en azul. Los partidos que fueron solos conservan su color.";
}

function ganadorCoalicionVista(
  votos: Map<string, number>,
  total: number,
  anio: AnioAlcaldiaResultados,
): GanadorMapa {
  const defs = coalicionesDelAnio(anio);
  const base = ganadorDeMapa(votos, total);
  const def = defs.find((d) => d.clave === base.clave);
  if (!def) {
    return { ...base, etiqueta: etiquetaDe(base.clave), color: colorDe(base.clave) };
  }
  return { ...base, etiqueta: def.etiqueta, color: def.color };
}

function incrementar(resumen: Record<string, number>, clave: string) {
  resumen[clave] = (resumen[clave] ?? 0) + 1;
}

const ORDEN_LEYENDA = [
  "MORENA",
  "JHH",
  "PT",
  "PVEM",
  "PRD",
  "PRD_PT",
  "PAN",
  "PAN_PRD_MC",
  "VXM",
  "PRI",
  "MC",
  "PES",
  "NA",
  "EMPATE",
];

function leyendaDeResumen(
  resumen: Record<string, number>,
  anio: AnioAlcaldiaResultados,
  modo: "partido" | "coalicion",
): LeyendaMapaItem[] {
  const defs = new Map(coalicionesDelAnio(anio).map((d) => [d.clave, d]));
  return Object.entries(resumen)
    .filter(([clave, n]) => clave !== "SIN_DATOS" && n > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      const ia = ORDEN_LEYENDA.indexOf(a[0]);
      const ib = ORDEN_LEYENDA.indexOf(b[0]);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a[0].localeCompare(b[0]);
    })
    .map(([clave, secciones]) => {
      const def = modo === "coalicion" ? defs.get(clave) : undefined;
      return {
        clave,
        etiqueta: def?.etiqueta ?? etiquetaDe(clave),
        color: def?.color ?? colorDe(clave),
        secciones,
      };
    });
}

function computarAnio(
  anio: AnioAlcaldiaResultados,
  porSeccion: Record<string, ResultadoAlcaldiaSeccion> | undefined,
): AnioMapaResultados {
  const resumenPartido: Record<string, number> = {};
  const resumenCoalicion: Record<string, number> = {};
  const mapa: Record<string, SeccionMapaResultados> = {};

  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    const res = porSeccion?.[seccion];
    if (!res || res.votacionTotal <= 0) {
      const vacio: GanadorMapa = {
        clave: "SIN_DATOS",
        etiqueta: etiquetaDe("SIN_DATOS"),
        color: COLOR_PARTIDO.SIN_DATOS,
        votos: 0,
        porcentaje: 0,
      };
      mapa[seccion] = {
        partido: vacio,
        coalicion: vacio,
        votacionTotal: 0,
        participacionPct: 0,
      };
      incrementar(resumenPartido, "SIN_DATOS");
      incrementar(resumenCoalicion, "SIN_DATOS");
      continue;
    }

    const partido = ganadorDeMapa(votosPorPartido(res.partidos), res.votacionTotal);
    const coalicion = ganadorCoalicionVista(
      votosPorCoalicion(res.partidos, anio),
      res.votacionTotal,
      anio,
    );
    mapa[seccion] = {
      partido,
      coalicion,
      votacionTotal: res.votacionTotal,
      participacionPct: res.participacionPct,
    };
    incrementar(resumenPartido, partido.clave);
    incrementar(resumenCoalicion, coalicion.clave);
  }

  return {
    anio,
    etiqueta: etiquetaCargo(anio),
    notaPartido: notaPartido(anio),
    notaCoalicion: notaCoalicion(anio),
    porSeccion: mapa,
    resumenPartido,
    resumenCoalicion,
    leyendaPartido: leyendaDeResumen(resumenPartido, anio, "partido"),
    leyendaCoalicion: leyendaDeResumen(resumenCoalicion, anio, "coalicion"),
  };
}

function leyendaDesdeResumenes(
  porAnio: Record<string, AnioMapaResultados>,
  campo: "resumenPartido" | "resumenCoalicion",
): { clave: string; etiqueta: string; color: string }[] {
  const claves = new Set<string>();
  for (const anio of ANIOS_MAPA_RESULTADOS) {
    const resumen = porAnio[String(anio)]?.[campo] ?? {};
    for (const clave of Object.keys(resumen)) {
      if (clave === "SIN_DATOS") continue;
      claves.add(clave);
    }
  }

  const coalicionMeta = new Map<string, { etiqueta: string; color: string }>();
  for (const anio of ANIOS_MAPA_RESULTADOS) {
    for (const d of coalicionesDelAnio(anio)) {
      coalicionMeta.set(d.clave, { etiqueta: d.etiqueta, color: d.color });
    }
  }

  const orden = [
    "MORENA",
    "JHH",
    "PT",
    "PVEM",
    "PRD",
    "PRD_PT",
    "PAN",
    "PAN_PRD_MC",
    "VXM",
    "PRI",
    "MC",
    "PES",
    "NA",
    "EMPATE",
  ];

  return [...claves]
    .sort((a, b) => {
      const ia = orden.indexOf(a);
      const ib = orden.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b);
    })
    .map((clave) => {
      const meta = coalicionMeta.get(clave);
      return {
        clave,
        etiqueta: meta?.etiqueta ?? etiquetaDe(clave),
        color: meta?.color ?? colorDe(clave),
      };
    });
}

export function mapaResultadosElectorales(): MapaResultadosResponse {
  if (!resultadosAlcaldiaDisponibles()) {
    return {
      disponible: false,
      anios: [],
      leyendaPartido: [],
      leyendaCoalicion: [],
      porAnio: {},
    };
  }

  const data = cargarResultadosAlcaldiaCoyoacan();
  const porAnio: Record<string, AnioMapaResultados> = {};
  const anios: AnioAlcaldiaResultados[] = [];

  for (const anio of ANIOS_MAPA_RESULTADOS) {
    const bloque = data[String(anio) as keyof typeof data];
    if (!bloque || !Object.keys(bloque.porSeccion).length) continue;
    anios.push(anio);
    porAnio[String(anio)] = computarAnio(anio, bloque.porSeccion);
  }

  return {
    disponible: anios.length > 0,
    anios,
    leyendaPartido: leyendaDesdeResumenes(porAnio, "resumenPartido"),
    leyendaCoalicion: leyendaDesdeResumenes(porAnio, "resumenCoalicion"),
    porAnio,
  };
}
