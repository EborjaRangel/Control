import type { Prisma } from "../generated/prisma/client.js";
import {
  COLONIAS_COYOACAN,
  variantesColoniaParaBusqueda,
} from "./colonias.js";
import { normalizarTextoGuardado } from "./normalizar-texto.js";
import { distritosPorColonia } from "./unidades-territoriales.js";

const modo = "insensitive" as const;

/** Extrae número de sección de textos como "345", "sección 345" o "sec. 501". */
export function parseSeccionDeBusqueda(query: string): string | null {
  const trimmed = query.trim();
  const conEtiqueta = trimmed.match(/(?:secci[oó]n|sec\.?)\s*#?\s*(\d+)/i);
  if (conEtiqueta) return conEtiqueta[1];

  if (/^\d{3,4}$/.test(trimmed)) return trimmed;

  return null;
}

/** Colonias del catálogo cuyo nombre contiene el texto buscado. */
export function coloniasCatalogoCoincidentes(query: string): string[] {
  const normalizado = normalizarTextoGuardado(query);
  if (normalizado.length < 3) return [];

  const unicas = [...new Set(COLONIAS_COYOACAN.map((c) => c.nombre))];
  return unicas.filter((nombre) => normalizarTextoGuardado(nombre).includes(normalizado));
}

function condicionesNombre(buscar: string, terminos: string[]): Prisma.DirigenteWhereInput[] {
  const condiciones: Prisma.DirigenteWhereInput[] = [
    { nombre: { contains: buscar, mode: modo } },
    { primerApellido: { contains: buscar, mode: modo } },
    { segundoApellido: { contains: buscar, mode: modo } },
  ];

  if (terminos.length > 1) {
    condiciones.push({
      AND: terminos.map((termino) => ({
        OR: [
          { nombre: { contains: termino, mode: modo } },
          { primerApellido: { contains: termino, mode: modo } },
          { segundoApellido: { contains: termino, mode: modo } },
        ],
      })),
    });
  }

  return condiciones;
}

/** Filtro OR para la caja de búsqueda (nombre, ID, sección, colonia). */
export async function buildFiltroBuscarDirigentes(
  buscar: string,
): Promise<Prisma.DirigenteWhereInput | undefined> {
  const texto = buscar.trim();
  if (!texto) return undefined;

  const terminos = texto.split(/\s+/).filter(Boolean);
  const or: Prisma.DirigenteWhereInput[] = [
    { id: { contains: texto, mode: modo } },
    ...condicionesNombre(texto, terminos),
    { seccionElectoral: { contains: texto, mode: modo } },
    { colonia: { contains: texto, mode: modo } },
  ];

  const seccion = parseSeccionDeBusqueda(texto);
  if (seccion) {
    or.push({ seccionElectoral: seccion });
  }

  const coloniasCoincidentes = coloniasCatalogoCoincidentes(texto);
  if (coloniasCoincidentes.length > 0) {
    const variantesColonia = new Set<string>();
    const distritos = new Set<number>();

    for (const colonia of coloniasCoincidentes) {
      for (const variante of variantesColoniaParaBusqueda(colonia)) {
        variantesColonia.add(variante);
      }
      for (const distrito of await distritosPorColonia(colonia)) {
        distritos.add(distrito);
      }
    }

    if (variantesColonia.size > 0) {
      or.push({ colonia: { in: [...variantesColonia] } });
    }
    if (distritos.size > 0) {
      or.push({ distritoLocal: { in: [...distritos] } });
    }
  }

  return { OR: or };
}

/** Filtro por colonia del formulario (coincidencia en campo colonia del dirigente). */
export function filtroColoniaDirigente(colonia: string): Prisma.DirigenteWhereInput | undefined {
  const variantes = variantesColoniaParaBusqueda(colonia);
  if (!colonia.trim() || variantes.length === 0) return undefined;
  return { colonia: { in: variantes } };
}

/** ALTA (Excel) = ACTIVO + activo true. BAJA = status BAJA + activo false. */
export function filtroEstatusListado(incluirBajas: boolean): Prisma.DirigenteWhereInput {
  if (incluirBajas) {
    return { status: "BAJA", activo: false };
  }
  return { status: "ACTIVO", activo: true };
}

/** Por defecto el listado admin muestra solo altas si no se pide explícitamente bajas. */
export function modoEstatusListadoDirigentes(query: {
  incluirBajas?: unknown;
  estatus?: unknown;
}): "alta" | "baja" {
  if (query.incluirBajas === "true") return "baja";
  const estatus =
    typeof query.estatus === "string" ? query.estatus.trim().toLowerCase() : "";
  if (estatus === "baja") return "baja";
  return "alta";
}
