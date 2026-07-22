import { prisma } from "./prisma.js";
import { cpsDeColonia, nombreColoniaCatalogo, variantesColoniaParaBusqueda } from "./colonias.js";
import { esSeccionValida } from "./secciones-electorales.js";
import { utsParaColonia } from "./unidades-territoriales-match.js";

export type UnidadTerritorialResumen = {
  id: string;
  clave: string;
  nombre: string;
  tipoUt: string | null;
  seccionesElectorales: string[];
};

export async function utsPorColonia(coloniaNombre: string): Promise<UnidadTerritorialResumen[]> {
  const enlaces = await prisma.coloniaUnidadTerritorial.findMany({
    where: { coloniaNombre },
    include: { unidadTerritorial: true },
    orderBy: { unidadTerritorial: { clave: "asc" } },
  });

  return enlaces.map((e) => ({
    id: e.unidadTerritorial.id,
    clave: e.unidadTerritorial.clave,
    nombre: e.unidadTerritorial.nombre,
    tipoUt: e.unidadTerritorial.tipoUt,
    seccionesElectorales: e.unidadTerritorial.seccionesElectorales,
  }));
}

export async function coloniasPorDistritoLocal(distritoLocal: number): Promise<string[]> {
  const enlaces = await prisma.coloniaUnidadTerritorial.findMany({
    where: { unidadTerritorial: { distritoLocal } },
    select: { coloniaNombre: true },
    orderBy: { coloniaNombre: "asc" },
  });
  const unicas = [...new Set(enlaces.map((e) => e.coloniaNombre))];
  return unicas.sort((a, b) => a.localeCompare(b, "es"));
}

/** Distritos locales que incluyen la colonia (catálogo IECM / SEPOMEX). */
export async function distritosPorColonia(coloniaQuery: string): Promise<number[]> {
  const variantes = variantesColoniaParaBusqueda(coloniaQuery);
  if (variantes.length === 0) return [];

  const enlaces = await prisma.coloniaUnidadTerritorial.findMany({
    where: { coloniaNombre: { in: variantes } },
    include: { unidadTerritorial: { select: { distritoLocal: true } } },
  });

  const distritos = new Set<number>();
  for (const enlace of enlaces) {
    if (enlace.unidadTerritorial.distritoLocal != null) {
      distritos.add(enlace.unidadTerritorial.distritoLocal);
    }
  }

  if (distritos.size > 0) {
    return [...distritos].sort((a, b) => a - b);
  }

  const catalogo = nombreColoniaCatalogo(coloniaQuery);
  const utRows = await prisma.unidadTerritorial.findMany({
    select: { id: true, clave: true, nombre: true, distritoLocal: true },
  });
  for (const ut of utsParaColonia(catalogo, utRows)) {
    if (ut.distritoLocal != null) {
      distritos.add(ut.distritoLocal);
    }
  }

  return [...distritos].sort((a, b) => a - b);
}

export async function validarColoniaEnDistritoLocal(
  coloniaNombre: string,
  distritoLocal: number | null | undefined,
): Promise<string | null> {
  if (distritoLocal == null) return null;
  const permitidas = await coloniasPorDistritoLocal(distritoLocal);
  if (permitidas.length === 0) {
    return `No hay colonias registradas para el distrito local ${distritoLocal}`;
  }
  const coloniaCatalogo = coloniaNombre.trim();
  const valida = permitidas.some(
    (c) => c.localeCompare(coloniaCatalogo, "es", { sensitivity: "accent" }) === 0,
  );
  if (!valida) {
    return `La colonia debe pertenecer al distrito local ${distritoLocal}`;
  }
  return null;
}

/** Secciones de la colonia (y UT opcional). null = sin catálogo IECM para la colonia. */
export async function seccionesPorColonia(
  coloniaNombre: string,
  unidadTerritorialId?: string | null,
): Promise<string[] | null> {
  const enlaces = await prisma.coloniaUnidadTerritorial.findMany({
    where: { coloniaNombre },
    include: { unidadTerritorial: true },
    orderBy: { unidadTerritorial: { clave: "asc" } },
  });

  if (enlaces.length === 0) return null;

  const uts = unidadTerritorialId
    ? enlaces.filter((e) => e.unidadTerritorialId === unidadTerritorialId)
    : enlaces;

  if (uts.length === 0) return [];

  const secciones = new Set<string>();
  for (const e of uts) {
    for (const s of e.unidadTerritorial.seccionesElectorales) {
      secciones.add(s);
    }
  }

  return [...secciones].sort((a, b) => Number(a) - Number(b));
}

export async function validarSeccionParaColonia(
  coloniaNombre: string,
  seccionElectoral: string,
  unidadTerritorialId?: string | null,
): Promise<string | null> {
  const permitidas = await seccionesPorColonia(coloniaNombre, unidadTerritorialId);
  if (permitidas === null) return null;
  if (permitidas.length === 0) return null;
  if (!permitidas.includes(seccionElectoral)) {
    if (esSeccionValida(seccionElectoral)) return null;
    return "La sección electoral no corresponde a la colonia seleccionada";
  }
  return null;
}

export async function validarUnidadTerritorialParaColonia(
  coloniaNombre: string,
  unidadTerritorialId: string | null | undefined,
): Promise<string | null> {
  const uts = await utsPorColonia(coloniaNombre);

  if (uts.length === 0) {
    return unidadTerritorialId ? "Esta colonia no tiene unidades territoriales registradas" : null;
  }

  if (uts.length === 1) {
    if (unidadTerritorialId && unidadTerritorialId !== uts[0].id) {
      return "La unidad territorial no corresponde a la colonia seleccionada";
    }
    return null;
  }

  if (!unidadTerritorialId) {
    return null;
  }

  if (!uts.some((ut) => ut.id === unidadTerritorialId)) {
    return "La unidad territorial no corresponde a la colonia seleccionada";
  }

  return null;
}

export async function resolverUnidadTerritorialId(
  coloniaNombre: string,
  unidadTerritorialId: string | null | undefined,
): Promise<string | null> {
  const uts = await utsPorColonia(coloniaNombre);
  if (uts.length === 0) return null;
  if (uts.length === 1) return uts[0].id;
  return unidadTerritorialId ?? null;
}

export function etiquetaUnidadTerritorial(ut: { clave: string; nombre: string }) {
  return `${ut.clave} — ${ut.nombre}`;
}

export type CatalogoSeccionElectoral = {
  colonias: string[];
  unidadesTerritoriales: UnidadTerritorialResumen[];
};

function resumenUt(ut: {
  id: string;
  clave: string;
  nombre: string;
  tipoUt: string | null;
  seccionesElectorales: string[];
}): UnidadTerritorialResumen {
  return {
    id: ut.id,
    clave: ut.clave,
    nombre: ut.nombre,
    tipoUt: ut.tipoUt,
    seccionesElectorales: ut.seccionesElectorales,
  };
}

/** Colonias y UTs válidas por sección (misma fuente que el formulario de dirigente). */
export async function cargarCatalogoElectoralPorSeccion(): Promise<
  Map<string, CatalogoSeccionElectoral>
> {
  const enlaces = await prisma.coloniaUnidadTerritorial.findMany({
    include: { unidadTerritorial: true },
  });

  const mapa = new Map<string, { colonias: Set<string>; uts: Map<string, UnidadTerritorialResumen> }>();

  for (const enlace of enlaces) {
    const ut = resumenUt(enlace.unidadTerritorial);
    for (const seccion of enlace.unidadTerritorial.seccionesElectorales) {
      const entry = mapa.get(seccion) ?? { colonias: new Set<string>(), uts: new Map() };
      entry.colonias.add(enlace.coloniaNombre);
      entry.uts.set(ut.id, ut);
      mapa.set(seccion, entry);
    }
  }

  return new Map(
    [...mapa.entries()].map(([seccion, entry]) => [
      seccion,
      {
        colonias: [...entry.colonias].sort((a, b) => a.localeCompare(b, "es")),
        unidadesTerritoriales: [...entry.uts.values()].sort((a, b) =>
          a.clave.localeCompare(b.clave, "es"),
        ),
      },
    ]),
  );
}

/** Asigna colonia y UT solo desde el catálogo de la sección (sin usar textos externos). */
export async function asignarColoniaUtDesdeCatalogoSeccion(
  seccionElectoral: string,
  catalogo: CatalogoSeccionElectoral,
): Promise<{
  colonia: string | null;
  codigoPostal: string | null;
  unidadTerritorialId: string | null;
  unidadTerritorialClave: string | null;
  motivo: string;
}> {
  const { colonias, unidadesTerritoriales } = catalogo;

  for (const colonia of colonias) {
    const unidadTerritorialId = await resolverUtParaColoniaEnSeccion(colonia, seccionElectoral);
    if (!unidadTerritorialId) continue;

    const ut = unidadesTerritoriales.find((u) => u.id === unidadTerritorialId);
    return {
      colonia,
      codigoPostal: cpsDeColonia(colonia)[0] ?? null,
      unidadTerritorialId,
      unidadTerritorialClave: ut?.clave ?? null,
      motivo:
        colonias.length > 1
          ? "colonia y UT del catálogo de la sección"
          : "catálogo de la sección",
    };
  }

  if (unidadesTerritoriales.length === 1) {
    const ut = unidadesTerritoriales[0]!;
    const colonia = colonias[0] ?? null;
    return {
      colonia,
      codigoPostal: colonia ? (cpsDeColonia(colonia)[0] ?? null) : null,
      unidadTerritorialId: ut.id,
      unidadTerritorialClave: ut.clave,
      motivo: "UT única de la sección",
    };
  }

  return {
    colonia: null,
    codigoPostal: null,
    unidadTerritorialId: null,
    unidadTerritorialClave: null,
    motivo: colonias.length === 0 ? "sección sin colonias en catálogo" : "sin par colonia-UT en catálogo",
  };
}

/** Resuelve UT igual que el alta/edición de dirigente: colonia → UT que incluye la sección. */
export async function resolverUtParaColoniaEnSeccion(
  coloniaNombre: string,
  seccionElectoral: string,
): Promise<string | null> {
  const uts = await utsPorColonia(coloniaNombre);
  const conSeccion = uts.filter((ut) => ut.seccionesElectorales.includes(seccionElectoral));
  if (conSeccion.length >= 1) return conSeccion[0]!.id;
  return resolverUnidadTerritorialId(coloniaNombre, null);
}
