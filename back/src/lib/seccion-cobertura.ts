import { prisma } from "./prisma.js";
import { SECCIONES_ELECTORALES_COYOACAN } from "./secciones-electorales.js";
import { filtroEstatusListado } from "./filtro-dirigentes.js";

export type DirigenteSeccionResumen = {
  id: string;
  nombreCompleto: string;
  tipo: string;
  colonia: string | null;
};

export type SeccionCobertura = {
  asignada: boolean;
  cantidad: number;
  nombres: string;
  colonias: string;
  dirigentes: DirigenteSeccionResumen[];
};

export type CoberturaSeccionesResponse = {
  totalSecciones: number;
  resumen: {
    asignadas: number;
    sinAsignar: number;
    totalDirigentes: number;
  };
  porSeccion: Record<string, SeccionCobertura>;
};

function nombreCompletoDirigente(d: {
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
}) {
  const apellidos = [d.primerApellido, d.segundoApellido].filter(Boolean).join(" ");
  return `${d.nombre} ${apellidos}`.trim();
}

async function coloniasCatalogoPorSeccion(): Promise<Map<string, Set<string>>> {
  const enlaces = await prisma.coloniaUnidadTerritorial.findMany({
    include: {
      unidadTerritorial: { select: { seccionesElectorales: true } },
    },
  });

  const mapa = new Map<string, Set<string>>();
  for (const enlace of enlaces) {
    for (const seccion of enlace.unidadTerritorial.seccionesElectorales) {
      const lista = mapa.get(seccion) ?? new Set<string>();
      lista.add(enlace.coloniaNombre);
      mapa.set(seccion, lista);
    }
  }
  return mapa;
}

function etiquetaColonias(colonias: Set<string>): string {
  const ordenadas = [...colonias]
    .map((c) => c.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));
  return ordenadas.join(", ");
}

export async function coberturaSeccionesCoyoacan(): Promise<CoberturaSeccionesResponse> {
  const coloniasCatalogo = await coloniasCatalogoPorSeccion();

  const dirigentes = await prisma.dirigente.findMany({
    where: {
      ...filtroEstatusListado(false),
      NOT: { seccionElectoral: "" },
    },
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
      seccionElectoral: true,
      tipo: true,
      colonia: true,
    },
    orderBy: [{ primerApellido: "asc" }, { nombre: "asc" }],
  });

  const agrupado = new Map<string, DirigenteSeccionResumen[]>();
  const coloniasDirigentes = new Map<string, Set<string>>();

  for (const d of dirigentes) {
    const seccion = d.seccionElectoral.trim();
    if (!seccion) continue;
    const lista = agrupado.get(seccion) ?? [];
    lista.push({
      id: d.id,
      nombreCompleto: nombreCompletoDirigente(d),
      tipo: d.tipo,
      colonia: d.colonia?.trim() || null,
    });
    agrupado.set(seccion, lista);

    const colonia = d.colonia?.trim();
    if (colonia) {
      const set = coloniasDirigentes.get(seccion) ?? new Set<string>();
      set.add(colonia);
      coloniasDirigentes.set(seccion, set);
    }
  }

  const porSeccion: Record<string, SeccionCobertura> = {};
  let asignadas = 0;
  let sinAsignar = 0;

  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    const lista = agrupado.get(seccion) ?? [];
    const asignada = lista.length > 0;
    if (asignada) asignadas += 1;
    else sinAsignar += 1;

    const colonias = new Set<string>([
      ...(coloniasDirigentes.get(seccion) ?? []),
      ...(coloniasCatalogo.get(seccion) ?? []),
    ]);

    porSeccion[seccion] = {
      asignada,
      cantidad: lista.length,
      nombres: lista.map((x) => x.nombreCompleto).join(", "),
      colonias: etiquetaColonias(colonias),
      dirigentes: lista,
    };
  }

  return {
    totalSecciones: SECCIONES_ELECTORALES_COYOACAN.length,
    resumen: {
      asignadas,
      sinAsignar,
      totalDirigentes: dirigentes.length,
    },
    porSeccion,
  };
}
