import { prisma } from "./prisma.js";
import { esColoniaValida, nombreColoniaCatalogo } from "./colonias.js";
import { SECCIONES_ELECTORALES_COYOACAN } from "./secciones-electorales.js";
import {
  COLONIAS_EXCLUIDAS_POR_SECCION,
  coloniasPorUtEnSeccion,
  pesosColoniasPorUtEnSeccion,
  type EnlaceColoniaUt,
  type PesoColoniaUt,
  type UtColoniaEnlace,
} from "./colonias-seccion-filtro.js";

export type MetodoEstimacionColonia = "dirigentes" | "unidad_territorial" | "ut_catalogo" | "partes_iguales";

export type ColoniaSeccionDetalle = {
  nombre: string;
  porcentajeEstimado: number;
  electoresEstimados: number;
  utClave: string | null;
  utNombre: string | null;
};

export type ColoniasSeccionInfo = {
  compartida: boolean;
  colonias: ColoniaSeccionDetalle[];
  metodoEstimacion: MetodoEstimacionColonia;
  etiquetaMetodo: string;
  /** Texto legible para listados (incluye % si la sección es compartida). */
  etiquetaLista: string;
};

type UtSeccion = {
  seccionesElectorales: string[];
};

export type ContextoColoniasSeccion = {
  utsPorColonia: Map<string, UtSeccion[]>;
  uts: UtColoniaEnlace[];
  enlacesColoniaUt: EnlaceColoniaUt[];
};

export { COLONIAS_EXCLUIDAS_POR_SECCION };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function etiquetaMetodo(metodo: MetodoEstimacionColonia): string {
  if (metodo === "dirigentes") {
    return "Proporción estimada según dirigentes activos por colonia en la sección.";
  }
  if (metodo === "unidad_territorial") {
    return "Proporción estimada según muestreo geográfico (sección ∩ UT IECM); barrios con la misma UT se reparten por punto de referencia del barrio.";
  }
  if (metodo === "ut_catalogo") {
    return "Proporción estimada según catálogo IECM (1 ÷ secciones de la UT); sin polígonos de intersección disponibles.";
  }
  return "Proporción estimada a partes iguales entre colonias del catálogo.";
}

function normalizarPorcentajes(
  pesos: Map<string, PesoColoniaUt>,
  totalElectores: number,
): ColoniaSeccionDetalle[] {
  const entries = [...pesos.entries()].filter(([, w]) => w.peso > 0);
  if (!entries.length) return [];

  const suma = entries.reduce((a, [, w]) => a + w.peso, 0);
  if (suma <= 0) return [];

  const ordenadas = entries.sort((a, b) => a[0].localeCompare(b[0], "es"));
  const result: ColoniaSeccionDetalle[] = [];
  let acumPct = 0;

  for (let i = 0; i < ordenadas.length; i += 1) {
    const [nombre, meta] = ordenadas[i];
    const pct =
      i === ordenadas.length - 1
        ? round2(Math.max(0, 100 - acumPct))
        : round2((meta.peso / suma) * 100);
    acumPct = round2(acumPct + pct);
    result.push({
      nombre,
      porcentajeEstimado: pct,
      electoresEstimados: Math.round((totalElectores * pct) / 100),
      utClave: meta.utClave,
      utNombre: meta.utNombre,
    });
  }

  return result;
}

function pesosPorDirigentes(
  nombresColonias: string[],
  conteoDirigentes: Map<string, number>,
  pesosUt: Map<string, PesoColoniaUt>,
): Map<string, PesoColoniaUt> {
  const pesos = new Map<string, PesoColoniaUt>();
  const catalogo = new Set(nombresColonias);
  for (const [colonia, n] of conteoDirigentes) {
    if (!catalogo.has(colonia) || n <= 0) continue;
    const ut = pesosUt.get(colonia);
    pesos.set(colonia, {
      peso: n,
      utClave: ut?.utClave ?? "",
      utNombre: ut?.utNombre ?? "",
    });
  }
  return pesos;
}

function pesosPartesIguales(
  nombresColonias: string[],
  pesosUt: Map<string, PesoColoniaUt>,
): Map<string, PesoColoniaUt> {
  const pesos = new Map<string, PesoColoniaUt>();
  for (const colonia of nombresColonias) {
    const ut = pesosUt.get(colonia);
    pesos.set(colonia, {
      peso: 1,
      utClave: ut?.utClave ?? "",
      utNombre: ut?.utNombre ?? "",
    });
  }
  return pesos;
}

function construirEtiquetaLista(colonias: ColoniaSeccionDetalle[], compartida: boolean): string {
  if (!colonias.length) return "—";
  if (!compartida) return colonias[0].nombre;
  return colonias
    .map((c) => `${c.nombre} (${c.porcentajeEstimado.toFixed(1)}%)`)
    .join(", ");
}

/** Estima reparto de la sección entre colonias del catálogo IECM. */
export function estimarColoniasSeccion(
  seccion: string,
  nombresColonias: string[],
  totalElectores: number,
  conteoDirigentesPorColonia: Map<string, number>,
  contexto: ContextoColoniasSeccion,
): ColoniasSeccionInfo {
  const coloniasOrdenadas = [...new Set(nombresColonias.map((c) => c.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "es"),
  );

  if (!coloniasOrdenadas.length) {
    return {
      compartida: false,
      colonias: [],
      metodoEstimacion: "partes_iguales",
      etiquetaMetodo: etiquetaMetodo("partes_iguales"),
      etiquetaLista: "—",
    };
  }

  const { pesos: pesosUtBase, usarGeo } = pesosColoniasPorUtEnSeccion(
    seccion,
    contexto.uts,
    contexto.enlacesColoniaUt,
  );

  if (coloniasOrdenadas.length === 1) {
    const nombre = coloniasOrdenadas[0];
    const ut = pesosUtBase.get(nombre);
    return {
      compartida: false,
      colonias: [
        {
          nombre,
          porcentajeEstimado: 100,
          electoresEstimados: totalElectores,
          utClave: ut?.utClave ?? null,
          utNombre: ut?.utNombre ?? null,
        },
      ],
      metodoEstimacion: ut ? (usarGeo ? "unidad_territorial" : "ut_catalogo") : "partes_iguales",
      etiquetaMetodo: ut
        ? etiquetaMetodo(usarGeo ? "unidad_territorial" : "ut_catalogo")
        : "Una sola colonia en el catálogo de la sección.",
      etiquetaLista: nombre,
    };
  }

  const pesosFiltrados = new Map<string, PesoColoniaUt>();
  for (const colonia of coloniasOrdenadas) {
    const p = pesosUtBase.get(colonia);
    if (p) pesosFiltrados.set(colonia, p);
  }

  const pesosDirigentes = pesosPorDirigentes(
    coloniasOrdenadas,
    conteoDirigentesPorColonia,
    pesosUtBase,
  );

  let metodo: MetodoEstimacionColonia = "partes_iguales";
  let pesos: Map<string, PesoColoniaUt>;

  if (usarGeo && pesosFiltrados.size >= 2) {
    pesos = pesosFiltrados;
    metodo = "unidad_territorial";
  } else if (usarGeo && pesosFiltrados.size === 1) {
    pesos = pesosFiltrados;
    metodo = "unidad_territorial";
  } else if (pesosFiltrados.size >= 2) {
    pesos = pesosFiltrados;
    metodo = "ut_catalogo";
  } else if (pesosFiltrados.size === 1) {
    pesos = pesosFiltrados;
    metodo = "ut_catalogo";
  } else if (pesosDirigentes.size >= 2) {
    pesos = pesosDirigentes;
    metodo = "dirigentes";
  } else {
    pesos = pesosPartesIguales(coloniasOrdenadas, pesosUtBase);
    metodo = "partes_iguales";
  }

  const colonias = normalizarPorcentajes(pesos, totalElectores);
  const compartida = colonias.length > 1;

  return {
    compartida,
    colonias,
    metodoEstimacion: metodo,
    etiquetaMetodo: etiquetaMetodo(metodo),
    etiquetaLista: construirEtiquetaLista(colonias, compartida),
  };
}

export async function cargarDatosColoniasSeccion(): Promise<
  ContextoColoniasSeccion & {
    mapa: Map<string, Set<string>>;
    dirigentesPorSeccionColonia: Map<string, Map<string, number>>;
  }
> {
  const [enlaces, uts, dirigentes] = await Promise.all([
    prisma.coloniaUnidadTerritorial.findMany({
      include: {
        unidadTerritorial: {
          select: { clave: true, nombre: true, seccionesElectorales: true },
        },
      },
    }),
    prisma.unidadTerritorial.findMany({
      select: { clave: true, nombre: true, seccionesElectorales: true },
    }),
    prisma.dirigente.findMany({
      where: { status: { not: "BAJA" }, NOT: { seccionElectoral: "" } },
      select: { seccionElectoral: true, colonia: true },
    }),
  ]);

  const utsPorColonia = new Map<string, UtSeccion[]>();
  const enlacesColoniaUt: EnlaceColoniaUt[] = [];

  for (const enlace of enlaces) {
    const ut = {
      clave: enlace.unidadTerritorial.clave,
      nombre: enlace.unidadTerritorial.nombre,
      seccionesElectorales: enlace.unidadTerritorial.seccionesElectorales,
    };
    enlacesColoniaUt.push({ coloniaNombre: enlace.coloniaNombre, utClave: ut.clave });

    const listaUts = utsPorColonia.get(enlace.coloniaNombre) ?? [];
    listaUts.push({ seccionesElectorales: ut.seccionesElectorales });
    utsPorColonia.set(enlace.coloniaNombre, listaUts);
  }

  const dirigentesPorSeccionColonia = new Map<string, Map<string, number>>();
  for (const d of dirigentes) {
    const seccion = d.seccionElectoral.trim();
    const coloniaRaw = d.colonia?.trim();
    if (!seccion || !coloniaRaw) continue;
    const colonia = nombreColoniaCatalogo(coloniaRaw);
    if (!esColoniaValida(colonia)) continue;
    const porColonia = dirigentesPorSeccionColonia.get(seccion) ?? new Map<string, number>();
    porColonia.set(colonia, (porColonia.get(colonia) ?? 0) + 1);
    dirigentesPorSeccionColonia.set(seccion, porColonia);
  }

  const contexto: ContextoColoniasSeccion = {
    utsPorColonia,
    uts,
    enlacesColoniaUt,
  };

  const mapa = new Map<string, Set<string>>();
  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    let colonias = coloniasPorUtEnSeccion(seccion, uts, enlacesColoniaUt);
    const { pesos } = pesosColoniasPorUtEnSeccion(seccion, uts, enlacesColoniaUt);
    if (pesos.size) {
      colonias = colonias.filter((c) => (pesos.get(c)?.peso ?? 0) > 0);
    }

    if (!colonias.length) {
      const coloniasDirigentes = [...(dirigentesPorSeccionColonia.get(seccion)?.keys() ?? [])].filter(
        (c) => esColoniaValida(c),
      );
      colonias = coloniasDirigentes;
    }

    if (colonias.length) mapa.set(seccion, new Set(colonias));
  }

  return { ...contexto, mapa, dirigentesPorSeccionColonia };
}
