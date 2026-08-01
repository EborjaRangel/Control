import { prisma } from "./prisma.js";
import { SECCIONES_ELECTORALES_COYOACAN } from "./secciones-electorales.js";
import { filtroEstatusListado } from "./filtro-dirigentes.js";
import {
  cargarCasillasCoyoacan,
  casillasDatasetDisponible,
  type SeccionCasillasResumenDTO,
} from "./casillas-electorales.js";
import {
  cargarDatosColoniasSeccion,
  estimarColoniasSeccion,
  type ColoniasSeccionInfo,
} from "./colonias-seccion.js";

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
  coloniasDetalle: ColoniasSeccionInfo;
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
  const { mapa } = await cargarDatosColoniasSeccion();
  return mapa;
}

function totalElectoresSeccion(info: SeccionCasillasResumenDTO | null): number {
  if (!info?.casillas?.length) return 0;
  return info.casillas.reduce((sum, casilla) => sum + casilla.listaNominal, 0);
}

export async function coberturaSeccionesCoyoacan(): Promise<CoberturaSeccionesResponse> {
  const [datosColonias, coloniasCatalogo] = await Promise.all([
    cargarDatosColoniasSeccion(),
    coloniasCatalogoPorSeccion(),
  ]);
  const dataset = casillasDatasetDisponible() ? cargarCasillasCoyoacan() : null;

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
    const totalElectores = totalElectoresSeccion(dataset?.porSeccion[seccion] ?? null);
    const coloniasDetalle = estimarColoniasSeccion(
      seccion,
      [...colonias],
      totalElectores,
      datosColonias.dirigentesPorSeccionColonia.get(seccion) ?? new Map(),
      {
        utsPorColonia: datosColonias.utsPorColonia,
        uts: datosColonias.uts,
        enlacesColoniaUt: datosColonias.enlacesColoniaUt,
      },
    );

    porSeccion[seccion] = {
      asignada,
      cantidad: lista.length,
      nombres: lista.map((x) => x.nombreCompleto).join(", "),
      colonias: coloniasDetalle.etiquetaLista,
      coloniasDetalle,
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
