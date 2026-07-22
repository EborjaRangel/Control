import {
  formatPorcentaje,
  type AnalisisSeccionRow,
  type PartidoVotosSeccion,
  type ResultadoAlcaldiaSeccion,
} from "@/lib/analisis";

export type AnioAlcaldia = 2018 | 2021 | 2024;

export type BloqueVotacion = "morena" | "pan" | "mc" | "otros";

export type ResumenBloque = {
  bloque: BloqueVotacion;
  etiqueta: string;
  votos: number;
  porcentaje: number;
  color: string;
};

export type PromediosAlcaldia = {
  participacion2018: number | null;
  participacion2021: number | null;
  participacion2024: number | null;
  morena2018: number | null;
  morena2021: number | null;
  morena2024: number | null;
  pan2018: number | null;
  pan2021: number | null;
  pan2024: number | null;
  mc2021: number | null;
  mc2024: number | null;
  secciones2018: number;
  secciones2021: number;
  secciones2024: number;
};

export type ComparacionBloquesSeccion = {
  bloques2018: ResumenBloque[];
  bloques2021: ResumenBloque[];
  bloques2024: ResumenBloque[];
  deltaMorenaPct: number;
  deltaPanPct: number;
  deltaMcPct: number;
  deltaMorena2018_2024: number;
  deltaPan2018_2024: number;
  mc2021: number;
  mc2024: number;
  tendencia: "morena" | "pan" | "empate";
  tendenciaParticipacion: "sube" | "baja" | "estable";
  conclusion: string;
  topPartidos2018: PartidoVotosSeccion[];
  topPartidos2021: PartidoVotosSeccion[];
  topPartidos2024: PartidoVotosSeccion[];
  participacion2018: number | null;
  participacion2021: number | null;
  participacion2024: number | null;
};

const CLAVES_META = new Set([
  "CNR",
  "DISTRITO_LOCAL",
  "CLAVE_DEM",
  "ID_CASILLA",
  "SECCION",
  "CASILLA",
  "TIPO_CASILLA",
  "EXT_CONTIGUA",
]);

export const COLOR_MORENA = "#9f2241";
export const COLOR_PAN = "#0055a4";
export const COLOR_MC = "#e65100";
export const COLOR_OTROS = "#767676";

const ETIQUETAS_BLOQUE: Record<BloqueVotacion, string> = {
  morena: "MORENA y aliados",
  pan: "PAN y aliados",
  mc: "MC",
  otros: "Otros",
};

const ORDEN_BLOQUES: BloqueVotacion[] = ["morena", "pan", "mc", "otros"];

export function esPartidoValido(clave: string): boolean {
  return !CLAVES_META.has(clave.toUpperCase());
}

function esAliadoPan2018(clave: string): boolean {
  const k = clave.toUpperCase();
  return k === "MC" || k === "CONVERGENCIA" || k.includes("CONVERGENCIA");
}

export function clasificarBloque(clave: string, anio?: AnioAlcaldia): BloqueVotacion {
  const k = clave.toUpperCase();
  if (k === "MORENA" || k.includes("MORENA")) return "morena";
  if (k === "PAN" || k.startsWith("PAN_")) return "pan";
  if (anio === 2018 && esAliadoPan2018(clave)) return "pan";
  if (k === "MC") return "mc";
  return "otros";
}

function etiquetaBloque(bloque: BloqueVotacion, anio?: AnioAlcaldia): string {
  if (anio === 2018 && bloque === "pan") {
    return "PAN y aliados (incl. MC/Convergencia)";
  }
  return ETIQUETAS_BLOQUE[bloque];
}

function filtrarPartidos(partidos: PartidoVotosSeccion[]): PartidoVotosSeccion[] {
  return partidos.filter((p) => esPartidoValido(p.clave) && p.votos > 0);
}

function pctVotos(resultado: ResultadoAlcaldiaSeccion, clave: string): number {
  const partido = filtrarPartidos(resultado.partidos).find((p) => p.clave.toUpperCase() === clave);
  if (!partido || resultado.votacionTotal <= 0) return 0;
  return Math.round((partido.votos / resultado.votacionTotal) * 10000) / 100;
}

function resumirBloques(resultado: ResultadoAlcaldiaSeccion, anio?: AnioAlcaldia): ResumenBloque[] {
  const acum: Record<BloqueVotacion, number> = { morena: 0, pan: 0, mc: 0, otros: 0 };

  for (const partido of filtrarPartidos(resultado.partidos)) {
    acum[clasificarBloque(partido.clave, anio)] += partido.votos;
  }

  const total = resultado.votacionTotal;
  const colores: Record<BloqueVotacion, string> = {
    morena: COLOR_MORENA,
    pan: COLOR_PAN,
    mc: COLOR_MC,
    otros: COLOR_OTROS,
  };

  return ORDEN_BLOQUES.map((bloque) => ({
    bloque,
    etiqueta: etiquetaBloque(bloque, anio),
    votos: acum[bloque],
    porcentaje: total > 0 ? Math.round((acum[bloque] / total) * 10000) / 100 : 0,
    color: colores[bloque],
  }));
}

function pctBloque(bloques: ResumenBloque[], bloque: BloqueVotacion): number {
  return bloques.find((b) => b.bloque === bloque)?.porcentaje ?? 0;
}

function promedio(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

function pushPromediosAnio(
  fila: AnalisisSeccionRow,
  anio: AnioAlcaldia,
  resultado: ResultadoAlcaldiaSeccion | null,
  buckets: {
    participacion: number[];
    morena: number[];
    pan: number[];
    mc?: number[];
  },
) {
  if (!resultado) return;
  buckets.participacion.push(resultado.participacionPct);
  const bloques = resumirBloques(resultado, anio);
  buckets.morena.push(pctBloque(bloques, "morena"));
  buckets.pan.push(pctBloque(bloques, "pan"));
  if (buckets.mc && anio !== 2018) {
    buckets.mc.push(pctVotos(resultado, "MC"));
  }
}

export function calcularPromediosAlcaldia(filas: AnalisisSeccionRow[]): PromediosAlcaldia {
  const p18: number[] = [];
  const p21: number[] = [];
  const p24: number[] = [];
  const m18: number[] = [];
  const m21: number[] = [];
  const m24: number[] = [];
  const pan18: number[] = [];
  const pan21: number[] = [];
  const pan24: number[] = [];
  const mc21: number[] = [];
  const mc24: number[] = [];

  for (const fila of filas) {
    pushPromediosAnio(fila, 2018, fila.alcalde2018, {
      participacion: p18,
      morena: m18,
      pan: pan18,
    });
    pushPromediosAnio(fila, 2021, fila.alcalde2021, {
      participacion: p21,
      morena: m21,
      pan: pan21,
      mc: mc21,
    });
    pushPromediosAnio(fila, 2024, fila.alcalde2024, {
      participacion: p24,
      morena: m24,
      pan: pan24,
      mc: mc24,
    });
  }

  return {
    participacion2018: promedio(p18),
    participacion2021: promedio(p21),
    participacion2024: promedio(p24),
    morena2018: promedio(m18),
    morena2021: promedio(m21),
    morena2024: promedio(m24),
    pan2018: promedio(pan18),
    pan2021: promedio(pan21),
    pan2024: promedio(pan24),
    mc2021: promedio(mc21),
    mc2024: promedio(mc24),
    secciones2018: p18.length,
    secciones2021: p21.length,
    secciones2024: p24.length,
  };
}

function textoVsPromedio(
  valor: number,
  promedioAlcaldia: number | null,
  etiqueta: string,
): string | null {
  if (promedioAlcaldia == null) return null;
  const diff = Math.round((valor - promedioAlcaldia) * 100) / 100;
  if (Math.abs(diff) <= 0.5) {
    return `${etiqueta} en línea con el promedio de Coyoacán (${formatPorcentaje(promedioAlcaldia)}).`;
  }
  if (diff > 0) {
    return `${etiqueta} por encima del promedio de Coyoacán (${formatPorcentaje(valor)} vs ${formatPorcentaje(promedioAlcaldia)}, +${diff.toFixed(2)} pp).`;
  }
  return `${etiqueta} por debajo del promedio de Coyoacán (${formatPorcentaje(valor)} vs ${formatPorcentaje(promedioAlcaldia)}, ${diff.toFixed(2)} pp).`;
}

function tendenciaParticipacion(
  anterior: number | null,
  actual: number | null,
): ComparacionBloquesSeccion["tendenciaParticipacion"] {
  if (anterior == null || actual == null) return "estable";
  const diff = actual - anterior;
  if (Math.abs(diff) <= 0.5) return "estable";
  return diff > 0 ? "sube" : "baja";
}

function deltaPct(actual: number, anterior: number): number {
  return Math.round((actual - anterior) * 100) / 100;
}

function generarConclusion(
  bloques2018: ResumenBloque[],
  bloques2021: ResumenBloque[],
  bloques2024: ResumenBloque[],
  deltaMorenaPct: number,
  deltaPanPct: number,
  deltaMcPct: number,
  deltaMorena2018_2024: number,
  deltaPan2018_2024: number,
  mc2021: number,
  mc2024: number,
  participacion2018: number | null,
  participacion2021: number | null,
  participacion2024: number | null,
  promedios: PromediosAlcaldia | null,
): string {
  const tiene2018 = bloques2018.length > 0;
  const tiene2124 = bloques2021.length > 0 && bloques2024.length > 0;

  if (!tiene2018 && !tiene2124) {
    return "No hay datos IECM suficientes para comparar esta sección.";
  }

  const m18 = pctBloque(bloques2018, "morena");
  const m21 = pctBloque(bloques2021, "morena");
  const m24 = pctBloque(bloques2024, "morena");
  const p18 = pctBloque(bloques2018, "pan");
  const p21 = pctBloque(bloques2021, "pan");
  const p24 = pctBloque(bloques2024, "pan");
  const tendPart2124 = tendenciaParticipacion(participacion2021, participacion2024);

  const partes: string[] = [];

  if (tiene2018) {
    partes.push(
      "En 2018, MC y Convergencia se contabilizan dentro de PAN y aliados por la coalición PAN-PRD-MC.",
    );
  }

  if (participacion2018 != null && participacion2021 != null && participacion2024 != null) {
    const delta1824 = deltaPct(participacion2024, participacion2018);
    partes.push(
      `Participación: ${formatPorcentaje(participacion2018)} (2018) → ${formatPorcentaje(participacion2021)} (2021) → ${formatPorcentaje(participacion2024)} (2024), ${delta1824 >= 0 ? "+" : ""}${delta1824.toFixed(2)} pp entre 2018 y 2024.`,
    );
  } else if (participacion2021 != null && participacion2024 != null) {
    const deltaPart = deltaPct(participacion2024, participacion2021);
    const dirPart =
      tendPart2124 === "sube"
        ? "hacia arriba"
        : tendPart2124 === "baja"
          ? "hacia abajo"
          : "sin cambio relevante";
    partes.push(
      `Participación: ${formatPorcentaje(participacion2021)} (2021) → ${formatPorcentaje(participacion2024)} (2024), ${deltaPart >= 0 ? "+" : ""}${deltaPart.toFixed(2)} pp, tendencia ${dirPart}.`,
    );
    const vsP21 = textoVsPromedio(
      participacion2021,
      promedios?.participacion2021 ?? null,
      "En 2021 la participación quedó",
    );
    const vsP24 = textoVsPromedio(
      participacion2024,
      promedios?.participacion2024 ?? null,
      "En 2024 la participación quedó",
    );
    if (vsP21) partes.push(vsP21);
    if (vsP24) partes.push(vsP24);
  }

  if (tiene2018 && bloques2024.length > 0) {
    partes.push(
      `MORENA y aliados: ${formatPorcentaje(m18)} (2018) → ${formatPorcentaje(m21)} (2021) → ${formatPorcentaje(m24)} (2024); ${deltaMorena2018_2024 >= 0 ? "+" : ""}${deltaMorena2018_2024.toFixed(2)} pp de 2018 a 2024.`,
    );
    partes.push(
      `PAN y aliados: ${formatPorcentaje(p18)} (2018) → ${formatPorcentaje(p21)} (2021) → ${formatPorcentaje(p24)} (2024); ${deltaPan2018_2024 >= 0 ? "+" : ""}${deltaPan2018_2024.toFixed(2)} pp de 2018 a 2024.`,
    );
    const vsM24 = textoVsPromedio(m24, promedios?.morena2024 ?? null, "MORENA y aliados en 2024");
    const vsPan24 = textoVsPromedio(p24, promedios?.pan2024 ?? null, "PAN y aliados en 2024");
    if (vsM24) partes.push(vsM24);
    if (vsPan24) partes.push(vsPan24);
  } else if (tiene2124) {
    partes.push(
      `MORENA y aliados: ${formatPorcentaje(m21)} → ${formatPorcentaje(m24)} (${deltaMorenaPct >= 0 ? "+" : ""}${deltaMorenaPct.toFixed(2)} pp).`,
    );
    const vsM24 = textoVsPromedio(m24, promedios?.morena2024 ?? null, "MORENA y aliados en 2024");
    if (vsM24) partes.push(vsM24);

    partes.push(
      `PAN y aliados: ${formatPorcentaje(p21)} → ${formatPorcentaje(p24)} (${deltaPanPct >= 0 ? "+" : ""}${deltaPanPct.toFixed(2)} pp).`,
    );
    const vsPan24 = textoVsPromedio(p24, promedios?.pan2024 ?? null, "PAN y aliados en 2024");
    if (vsPan24) partes.push(vsPan24);
  }

  if (tiene2124) {
    partes.push(
      `MC (bloque independiente desde 2021): ${formatPorcentaje(mc2021)} → ${formatPorcentaje(mc2024)} (${deltaMcPct >= 0 ? "+" : ""}${deltaMcPct.toFixed(2)} pp).`,
    );
    const vsMc21 = textoVsPromedio(mc2021, promedios?.mc2021 ?? null, "MC en 2021");
    const vsMc24 = textoVsPromedio(mc2024, promedios?.mc2024 ?? null, "MC en 2024");
    if (vsMc21) partes.push(vsMc21);
    if (vsMc24) partes.push(vsMc24);

    const mcSube = deltaMcPct > 0.5;
    const mcBaja = deltaMcPct < -0.5;
    if (mcSube) {
      partes.push("MC ganó terreno en la sección respecto a 2021.");
    } else if (mcBaja) {
      partes.push("MC perdió terreno en la sección respecto a 2021.");
    }
  }

  if (!tiene2124) {
    partes.push("No hay comparación 2021→2024 completa para esta sección.");
    return partes.join(" ");
  }

  let cierre: string;
  const diffBloques = deltaMorenaPct - deltaPanPct;
  if (Math.abs(diffBloques) <= 0.5) {
    cierre =
      "Conclusión 2021→2024: la tendencia entre MORENA+aliados y PAN+aliados es equilibrada; no hay un bloque claramente favorecido.";
  } else if (diffBloques > 0) {
    const dir =
      deltaMorenaPct > 0
        ? "con avance al alza"
        : deltaMorenaPct < 0
          ? "aunque con retroceso, menos pronunciado que el PAN"
          : "manteniéndose estable";
    cierre = `Conclusión 2021→2024: la tendencia favorece a MORENA y sus aliados (${dir}) frente al PAN y sus aliados.`;
  } else {
    const dir =
      deltaPanPct > 0
        ? "con avance al alza"
        : deltaPanPct < 0
          ? "aunque con retroceso, menos pronunciado que MORENA"
          : "manteniéndose estable";
    cierre = `Conclusión 2021→2024: la tendencia favorece al PAN y sus aliados (${dir}) frente a MORENA y sus aliados.`;
  }

  if (tiene2018 && bloques2024.length > 0) {
    const diffLargo = deltaMorena2018_2024 - deltaPan2018_2024;
    if (Math.abs(diffLargo) > 0.5) {
      cierre +=
        diffLargo > 0
          ? " En el periodo 2018→2024 el bloque MORENA+aliados acumula mayor avance relativo."
          : " En el periodo 2018→2024 el bloque PAN+aliados acumula mayor avance relativo.";
    }
  }

  if (tendPart2124 === "sube" && diffBloques > 0) {
    cierre += " La participación también sube, lo que refuerza el momentum de MORENA en la sección.";
  } else if (tendPart2124 === "sube" && diffBloques < 0) {
    cierre += " A pesar de mayor participación, el bloque PAN+aliados capturó mejor el voto adicional.";
  } else if (tendPart2124 === "baja" && diffBloques > 0) {
    cierre += " Con participación a la baja, MORENA+aliados resistieron mejor que PAN+aliados.";
  } else if (tendPart2124 === "baja" && diffBloques < 0) {
    cierre += " La caída de participación acompañó una pérdida relativa de MORENA frente a PAN+aliados.";
  }

  partes.push(cierre);
  return partes.join(" ");
}

function topPartidos(resultado: ResultadoAlcaldiaSeccion | null): PartidoVotosSeccion[] {
  if (!resultado) return [];
  return filtrarPartidos(resultado.partidos)
    .slice()
    .sort((a, b) => b.votos - a.votos)
    .slice(0, 8);
}

export function compararVotacionSeccion(
  alcalde2018: ResultadoAlcaldiaSeccion | null,
  alcalde2021: ResultadoAlcaldiaSeccion | null,
  alcalde2024: ResultadoAlcaldiaSeccion | null,
  promedios: PromediosAlcaldia | null = null,
): ComparacionBloquesSeccion | null {
  if (!alcalde2018 && !alcalde2021 && !alcalde2024) return null;

  const bloques2018 = alcalde2018 ? resumirBloques(alcalde2018, 2018) : [];
  const bloques2021 = alcalde2021 ? resumirBloques(alcalde2021, 2021) : [];
  const bloques2024 = alcalde2024 ? resumirBloques(alcalde2024, 2024) : [];

  const mc2021 = alcalde2021 ? pctVotos(alcalde2021, "MC") : 0;
  const mc2024 = alcalde2024 ? pctVotos(alcalde2024, "MC") : 0;

  const deltaMorenaPct =
    alcalde2021 && alcalde2024
      ? deltaPct(pctBloque(bloques2024, "morena"), pctBloque(bloques2021, "morena"))
      : 0;
  const deltaPanPct =
    alcalde2021 && alcalde2024
      ? deltaPct(pctBloque(bloques2024, "pan"), pctBloque(bloques2021, "pan"))
      : 0;
  const deltaMcPct = alcalde2021 && alcalde2024 ? deltaPct(mc2024, mc2021) : 0;
  const deltaMorena2018_2024 =
    alcalde2018 && alcalde2024
      ? deltaPct(pctBloque(bloques2024, "morena"), pctBloque(bloques2018, "morena"))
      : 0;
  const deltaPan2018_2024 =
    alcalde2018 && alcalde2024
      ? deltaPct(pctBloque(bloques2024, "pan"), pctBloque(bloques2018, "pan"))
      : 0;

  const participacion2018 = alcalde2018?.participacionPct ?? null;
  const participacion2021 = alcalde2021?.participacionPct ?? null;
  const participacion2024 = alcalde2024?.participacionPct ?? null;

  let tendencia: ComparacionBloquesSeccion["tendencia"] = "empate";
  if (alcalde2021 && alcalde2024) {
    const diffBloques = deltaMorenaPct - deltaPanPct;
    if (Math.abs(diffBloques) <= 0.5) tendencia = "empate";
    else if (diffBloques > 0) tendencia = "morena";
    else tendencia = "pan";
  }

  return {
    bloques2018,
    bloques2021,
    bloques2024,
    deltaMorenaPct,
    deltaPanPct,
    deltaMcPct,
    deltaMorena2018_2024,
    deltaPan2018_2024,
    mc2021,
    mc2024,
    tendencia,
    tendenciaParticipacion: tendenciaParticipacion(participacion2021, participacion2024),
    conclusion: generarConclusion(
      bloques2018,
      bloques2021,
      bloques2024,
      deltaMorenaPct,
      deltaPanPct,
      deltaMcPct,
      deltaMorena2018_2024,
      deltaPan2018_2024,
      mc2021,
      mc2024,
      participacion2018,
      participacion2021,
      participacion2024,
      promedios,
    ),
    topPartidos2018: topPartidos(alcalde2018),
    topPartidos2021: topPartidos(alcalde2021),
    topPartidos2024: topPartidos(alcalde2024),
    participacion2018,
    participacion2021,
    participacion2024,
  };
}

export function colorPartido(clave: string, anio?: AnioAlcaldia): string {
  const k = clave.toUpperCase();
  if (anio === 2018 && esAliadoPan2018(clave)) return COLOR_PAN;
  if (k === "MC") return COLOR_MC;
  const bloque = clasificarBloque(clave, anio);
  if (bloque === "morena") return COLOR_MORENA;
  if (bloque === "pan") return COLOR_PAN;
  return COLOR_OTROS;
}

export function indicadorVsPromedio(
  valor: number | null,
  promedio: number | null,
): { texto: string; tono: "arriba" | "abajo" | "linea" } | null {
  if (valor == null || promedio == null) return null;
  const diff = valor - promedio;
  if (Math.abs(diff) <= 0.5) return { texto: "≈ promedio Coyoacán", tono: "linea" };
  if (diff > 0) return { texto: `+${diff.toFixed(1)} pp vs prom.`, tono: "arriba" };
  return { texto: `${diff.toFixed(1)} pp vs prom.`, tono: "abajo" };
}

export type ResumenTendenciasAlcaldia = {
  favorMorena: number;
  favorPan: number;
  empate: number;
  sinComparacion: number;
  comparables: number;
};

export type TendenciaSeccion = "morena" | "pan" | "empate" | "sin_datos";

export type TendenciaSeccionFiltro = "" | TendenciaSeccion;

export const ETIQUETAS_TENDENCIA: Record<TendenciaSeccion, string> = {
  morena: "Favor MORENA + aliados",
  pan: "Favor PAN + aliados",
  empate: "Empate técnico",
  sin_datos: "Sin comparación",
};

export function tendenciaSeccion(
  fila: AnalisisSeccionRow,
  promedios: PromediosAlcaldia | null = null,
): TendenciaSeccion {
  const cmp = compararVotacionSeccion(
    fila.alcalde2018,
    fila.alcalde2021,
    fila.alcalde2024,
    promedios,
  );
  if (!cmp || !fila.alcalde2021 || !fila.alcalde2024) return "sin_datos";
  return cmp.tendencia;
}

/** Cuenta secciones cuya tendencia 2021→2024 favorece a cada bloque. */
export function resumirTendenciasAlcaldia(
  filas: AnalisisSeccionRow[],
  promedios: PromediosAlcaldia | null = null,
): ResumenTendenciasAlcaldia {
  let favorMorena = 0;
  let favorPan = 0;
  let empate = 0;
  let sinComparacion = 0;

  for (const fila of filas) {
    const cmp = compararVotacionSeccion(
      fila.alcalde2018,
      fila.alcalde2021,
      fila.alcalde2024,
      promedios,
    );
    if (!cmp || !fila.alcalde2021 || !fila.alcalde2024) {
      sinComparacion += 1;
      continue;
    }
    if (cmp.tendencia === "morena") favorMorena += 1;
    else if (cmp.tendencia === "pan") favorPan += 1;
    else empate += 1;
  }

  return {
    favorMorena,
    favorPan,
    empate,
    sinComparacion,
    comparables: favorMorena + favorPan + empate,
  };
}
