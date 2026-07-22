import {
  formatPorcentaje,
  type AnalisisSeccionRow,
  type PartidoVotosSeccion,
  type ResultadoAlcaldiaSeccion,
} from "@/lib/analisis";

export type BloqueVotacion = "morena" | "pan" | "mc" | "otros";

export type ResumenBloque = {
  bloque: BloqueVotacion;
  etiqueta: string;
  votos: number;
  porcentaje: number;
  color: string;
};

export type PromediosAlcaldia = {
  participacion2021: number | null;
  participacion2024: number | null;
  morena2021: number | null;
  morena2024: number | null;
  pan2021: number | null;
  pan2024: number | null;
  mc2021: number | null;
  mc2024: number | null;
  secciones2021: number;
  secciones2024: number;
};

export type ComparacionBloquesSeccion = {
  bloques2021: ResumenBloque[];
  bloques2024: ResumenBloque[];
  deltaMorenaPct: number;
  deltaPanPct: number;
  deltaMcPct: number;
  mc2021: number;
  mc2024: number;
  tendencia: "morena" | "pan" | "empate";
  tendenciaParticipacion: "sube" | "baja" | "estable";
  conclusion: string;
  topPartidos2021: PartidoVotosSeccion[];
  topPartidos2024: PartidoVotosSeccion[];
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

export function clasificarBloque(clave: string): BloqueVotacion {
  const k = clave.toUpperCase();
  if (k === "MORENA" || k.includes("MORENA")) return "morena";
  if (k === "PAN" || k.startsWith("PAN_")) return "pan";
  if (k === "MC") return "mc";
  return "otros";
}

function filtrarPartidos(partidos: PartidoVotosSeccion[]): PartidoVotosSeccion[] {
  return partidos.filter((p) => esPartidoValido(p.clave) && p.votos > 0);
}

function pctVotos(resultado: ResultadoAlcaldiaSeccion, clave: string): number {
  const partido = filtrarPartidos(resultado.partidos).find((p) => p.clave.toUpperCase() === clave);
  if (!partido || resultado.votacionTotal <= 0) return 0;
  return Math.round((partido.votos / resultado.votacionTotal) * 10000) / 100;
}

function resumirBloques(resultado: ResultadoAlcaldiaSeccion): ResumenBloque[] {
  const acum: Record<BloqueVotacion, number> = { morena: 0, pan: 0, mc: 0, otros: 0 };

  for (const partido of filtrarPartidos(resultado.partidos)) {
    acum[clasificarBloque(partido.clave)] += partido.votos;
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
    etiqueta: ETIQUETAS_BLOQUE[bloque],
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

export function calcularPromediosAlcaldia(filas: AnalisisSeccionRow[]): PromediosAlcaldia {
  const p21: number[] = [];
  const p24: number[] = [];
  const m21: number[] = [];
  const m24: number[] = [];
  const pan21: number[] = [];
  const pan24: number[] = [];
  const mc21: number[] = [];
  const mc24: number[] = [];

  for (const fila of filas) {
    if (fila.alcalde2021) {
      p21.push(fila.alcalde2021.participacionPct);
      m21.push(pctBloque(resumirBloques(fila.alcalde2021), "morena"));
      pan21.push(pctBloque(resumirBloques(fila.alcalde2021), "pan"));
      mc21.push(pctVotos(fila.alcalde2021, "MC"));
    }
    if (fila.alcalde2024) {
      p24.push(fila.alcalde2024.participacionPct);
      m24.push(pctBloque(resumirBloques(fila.alcalde2024), "morena"));
      pan24.push(pctBloque(resumirBloques(fila.alcalde2024), "pan"));
      mc24.push(pctVotos(fila.alcalde2024, "MC"));
    }
  }

  return {
    participacion2021: promedio(p21),
    participacion2024: promedio(p24),
    morena2021: promedio(m21),
    morena2024: promedio(m24),
    pan2021: promedio(pan21),
    pan2024: promedio(pan24),
    mc2021: promedio(mc21),
    mc2024: promedio(mc24),
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

function tendenciaParticipacion(p21: number | null, p24: number | null): ComparacionBloquesSeccion["tendenciaParticipacion"] {
  if (p21 == null || p24 == null) return "estable";
  const diff = p24 - p21;
  if (Math.abs(diff) <= 0.5) return "estable";
  return diff > 0 ? "sube" : "baja";
}

function generarConclusion(
  bloques2021: ResumenBloque[],
  bloques2024: ResumenBloque[],
  deltaMorenaPct: number,
  deltaPanPct: number,
  deltaMcPct: number,
  mc2021: number,
  mc2024: number,
  participacion2021: number | null,
  participacion2024: number | null,
  promedios: PromediosAlcaldia | null,
): string {
  if (!bloques2021.length || !bloques2024.length) {
    return "Solo hay datos completos de un año; no es posible comparar la tendencia 2021 → 2024.";
  }

  const m21 = pctBloque(bloques2021, "morena");
  const m24 = pctBloque(bloques2024, "morena");
  const p21 = pctBloque(bloques2021, "pan");
  const p24 = pctBloque(bloques2024, "pan");
  const tendPart = tendenciaParticipacion(participacion2021, participacion2024);

  const partes: string[] = [];

  if (participacion2021 != null && participacion2024 != null) {
    const deltaPart = Math.round((participacion2024 - participacion2021) * 100) / 100;
    const dirPart =
      tendPart === "sube"
        ? "hacia arriba"
        : tendPart === "baja"
          ? "hacia abajo"
          : "sin cambio relevante";
    partes.push(
      `Participación: ${formatPorcentaje(participacion2021)} (2021) → ${formatPorcentaje(participacion2024)} (2024), ${deltaPart >= 0 ? "+" : ""}${deltaPart.toFixed(2)} pp, tendencia ${dirPart}.`,
    );
    const vsP21 = textoVsPromedio(participacion2021, promedios?.participacion2021 ?? null, "En 2021 la participación quedó");
    const vsP24 = textoVsPromedio(participacion2024, promedios?.participacion2024 ?? null, "En 2024 la participación quedó");
    if (vsP21) partes.push(vsP21);
    if (vsP24) partes.push(vsP24);
  }

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

  partes.push(
    `MC: ${formatPorcentaje(mc2021)} → ${formatPorcentaje(mc2024)} (${deltaMcPct >= 0 ? "+" : ""}${deltaMcPct.toFixed(2)} pp).`,
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

  let cierre: string;
  const diffBloques = deltaMorenaPct - deltaPanPct;
  if (Math.abs(diffBloques) <= 0.5) {
    cierre =
      "Conclusión: la tendencia entre MORENA+aliados y PAN+aliados es equilibrada; no hay un bloque claramente favorecido.";
  } else if (diffBloques > 0) {
    const dir =
      deltaMorenaPct > 0
        ? "con avance al alza"
        : deltaMorenaPct < 0
          ? "aunque con retroceso, menos pronunciado que el PAN"
          : "manteniéndose estable";
    cierre = `Conclusión: la tendencia favorece a MORENA y sus aliados (${dir}) frente al PAN y sus aliados.`;
  } else {
    const dir =
      deltaPanPct > 0
        ? "con avance al alza"
        : deltaPanPct < 0
          ? "aunque con retroceso, menos pronunciado que MORENA"
          : "manteniéndose estable";
    cierre = `Conclusión: la tendencia favorece al PAN y sus aliados (${dir}) frente a MORENA y sus aliados.`;
  }

  if (tendPart === "sube" && diffBloques > 0) {
    cierre += " La participación también sube, lo que refuerza el momentum de MORENA en la sección.";
  } else if (tendPart === "sube" && diffBloques < 0) {
    cierre += " A pesar de mayor participación, el bloque PAN+aliados capturó mejor el voto adicional.";
  } else if (tendPart === "baja" && diffBloques > 0) {
    cierre += " Con participación a la baja, MORENA+aliados resistieron mejor que PAN+aliados.";
  } else if (tendPart === "baja" && diffBloques < 0) {
    cierre += " La caída de participación acompañó una pérdida relativa de MORENA frente a PAN+aliados.";
  }

  if (mcSube && diffBloques < 0) {
    cierre += " El crecimiento de MC pudo haber afectado principalmente al bloque PAN+aliados.";
  } else if (mcSube && diffBloques > 0) {
    cierre += " MC creció, pero no impidió el avance de MORENA+aliados.";
  }

  partes.push(cierre);
  return partes.join(" ");
}

export function compararVotacionSeccion(
  alcalde2021: ResultadoAlcaldiaSeccion | null,
  alcalde2024: ResultadoAlcaldiaSeccion | null,
  promedios: PromediosAlcaldia | null = null,
): ComparacionBloquesSeccion | null {
  if (!alcalde2021 && !alcalde2024) return null;

  const bloques2021 = alcalde2021 ? resumirBloques(alcalde2021) : [];
  const bloques2024 = alcalde2024 ? resumirBloques(alcalde2024) : [];

  const mc2021 = alcalde2021 ? pctVotos(alcalde2021, "MC") : 0;
  const mc2024 = alcalde2024 ? pctVotos(alcalde2024, "MC") : 0;

  const deltaMorenaPct =
    alcalde2021 && alcalde2024
      ? Math.round((pctBloque(bloques2024, "morena") - pctBloque(bloques2021, "morena")) * 100) / 100
      : 0;
  const deltaPanPct =
    alcalde2021 && alcalde2024
      ? Math.round((pctBloque(bloques2024, "pan") - pctBloque(bloques2021, "pan")) * 100) / 100
      : 0;
  const deltaMcPct = alcalde2021 && alcalde2024 ? Math.round((mc2024 - mc2021) * 100) / 100 : 0;

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
    bloques2021,
    bloques2024,
    deltaMorenaPct,
    deltaPanPct,
    deltaMcPct,
    mc2021,
    mc2024,
    tendencia,
    tendenciaParticipacion: tendenciaParticipacion(participacion2021, participacion2024),
    conclusion: generarConclusion(
      bloques2021,
      bloques2024,
      deltaMorenaPct,
      deltaPanPct,
      deltaMcPct,
      mc2021,
      mc2024,
      participacion2021,
      participacion2024,
      promedios,
    ),
    topPartidos2021: alcalde2021
      ? filtrarPartidos(alcalde2021.partidos)
          .slice()
          .sort((a, b) => b.votos - a.votos)
          .slice(0, 8)
      : [],
    topPartidos2024: alcalde2024
      ? filtrarPartidos(alcalde2024.partidos)
          .slice()
          .sort((a, b) => b.votos - a.votos)
          .slice(0, 8)
      : [],
    participacion2021,
    participacion2024,
  };
}

export function colorPartido(clave: string): string {
  const k = clave.toUpperCase();
  if (k === "MC") return COLOR_MC;
  const bloque = clasificarBloque(clave);
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
