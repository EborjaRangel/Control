import {
  formatPorcentaje,
  type PartidoVotosSeccion,
  type ResultadoAlcaldiaSeccion,
} from "@/lib/analisis";

export type BloqueVotacion = "morena" | "pan" | "otros";

export type ResumenBloque = {
  bloque: BloqueVotacion;
  etiqueta: string;
  votos: number;
  porcentaje: number;
  color: string;
};

export type ComparacionBloquesSeccion = {
  bloques2021: ResumenBloque[];
  bloques2024: ResumenBloque[];
  deltaMorenaPct: number;
  deltaPanPct: number;
  tendencia: "morena" | "pan" | "empate";
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

const COLOR_MORENA = "#9f2241";
const COLOR_PAN = "#0055a4";
const COLOR_OTROS = "#767676";

const ETIQUETAS_BLOQUE: Record<BloqueVotacion, string> = {
  morena: "MORENA y aliados",
  pan: "PAN y aliados",
  otros: "Otros",
};

export function esPartidoValido(clave: string): boolean {
  return !CLAVES_META.has(clave.toUpperCase());
}

export function clasificarBloque(clave: string): BloqueVotacion {
  const k = clave.toUpperCase();
  if (k === "MORENA" || k.includes("MORENA")) return "morena";
  if (k === "PAN" || k.startsWith("PAN_")) return "pan";
  return "otros";
}

function filtrarPartidos(partidos: PartidoVotosSeccion[]): PartidoVotosSeccion[] {
  return partidos.filter((p) => esPartidoValido(p.clave) && p.votos > 0);
}

function resumirBloques(resultado: ResultadoAlcaldiaSeccion): ResumenBloque[] {
  const acum: Record<BloqueVotacion, number> = { morena: 0, pan: 0, otros: 0 };

  for (const partido of filtrarPartidos(resultado.partidos)) {
    acum[clasificarBloque(partido.clave)] += partido.votos;
  }

  const total = resultado.votacionTotal;
  const orden: BloqueVotacion[] = ["morena", "pan", "otros"];
  const colores: Record<BloqueVotacion, string> = {
    morena: COLOR_MORENA,
    pan: COLOR_PAN,
    otros: COLOR_OTROS,
  };

  return orden.map((bloque) => ({
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

function generarConclusion(
  bloques2021: ResumenBloque[],
  bloques2024: ResumenBloque[],
  deltaMorenaPct: number,
  deltaPanPct: number,
): string {
  if (!bloques2021.length || !bloques2024.length) {
    return "Solo hay datos completos de un año; no es posible comparar la tendencia 2021 → 2024.";
  }

  const m21 = pctBloque(bloques2021, "morena");
  const m24 = pctBloque(bloques2024, "morena");
  const p21 = pctBloque(bloques2021, "pan");
  const p24 = pctBloque(bloques2024, "pan");

  const deltaMorenaTxt = `${deltaMorenaPct >= 0 ? "+" : ""}${deltaMorenaPct.toFixed(2)} pp`;
  const deltaPanTxt = `${deltaPanPct >= 0 ? "+" : ""}${deltaPanPct.toFixed(2)} pp`;

  let cierre: string;
  if (Math.abs(deltaMorenaPct - deltaPanPct) <= 0.5) {
    cierre =
      "Conclusión: no hubo un avance claro de un bloque sobre el otro; las variaciones fueron similares.";
  } else if (deltaMorenaPct > deltaPanPct) {
    cierre =
      "Conclusión: en esta sección mejoró el bloque de MORENA y sus aliados respecto a 2021.";
  } else {
    cierre =
      "Conclusión: en esta sección mejoró el bloque del PAN y sus aliados respecto a 2021.";
  }

  return [
    `MORENA y aliados: ${formatPorcentaje(m21)} (2021) → ${formatPorcentaje(m24)} (2024), ${deltaMorenaTxt}.`,
    `PAN y aliados: ${formatPorcentaje(p21)} (2021) → ${formatPorcentaje(p24)} (2024), ${deltaPanTxt}.`,
    cierre,
  ].join(" ");
}

export function compararVotacionSeccion(
  alcalde2021: ResultadoAlcaldiaSeccion | null,
  alcalde2024: ResultadoAlcaldiaSeccion | null,
): ComparacionBloquesSeccion | null {
  if (!alcalde2021 && !alcalde2024) return null;

  const bloques2021 = alcalde2021 ? resumirBloques(alcalde2021) : [];
  const bloques2024 = alcalde2024 ? resumirBloques(alcalde2024) : [];

  const deltaMorenaPct =
    alcalde2021 && alcalde2024
      ? Math.round((pctBloque(bloques2024, "morena") - pctBloque(bloques2021, "morena")) * 100) / 100
      : 0;
  const deltaPanPct =
    alcalde2021 && alcalde2024
      ? Math.round((pctBloque(bloques2024, "pan") - pctBloque(bloques2021, "pan")) * 100) / 100
      : 0;

  let tendencia: ComparacionBloquesSeccion["tendencia"] = "empate";
  if (alcalde2021 && alcalde2024) {
    if (Math.abs(deltaMorenaPct - deltaPanPct) <= 0.5) tendencia = "empate";
    else if (deltaMorenaPct > deltaPanPct) tendencia = "morena";
    else tendencia = "pan";
  }

  return {
    bloques2021,
    bloques2024,
    deltaMorenaPct,
    deltaPanPct,
    tendencia,
    conclusion: generarConclusion(bloques2021, bloques2024, deltaMorenaPct, deltaPanPct),
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
    participacion2021: alcalde2021?.participacionPct ?? null,
    participacion2024: alcalde2024?.participacionPct ?? null,
  };
}

export function colorPartido(clave: string): string {
  const bloque = clasificarBloque(clave);
  if (bloque === "morena") return COLOR_MORENA;
  if (bloque === "pan") return COLOR_PAN;
  return COLOR_OTROS;
}
