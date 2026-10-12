import { prisma } from "./prisma.js";
import { nombreCompleto } from "./dirigentes.js";

export function normalizarTextoBusqueda(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function coincideNombreDirigente(
  d: { nombre: string; primerApellido: string; segundoApellido: string | null },
  frase: string,
): boolean {
  const tokens = normalizarTextoBusqueda(frase).split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const blob = normalizarTextoBusqueda(
    [d.nombre, d.primerApellido, d.segundoApellido ?? ""].join(" "),
  );
  return tokens.every((t) => blob.includes(t));
}

export type ResultadoConvocarMaterial = {
  eventoId: string;
  eventoTitulo: string;
  resultados: Array<{
    buscar: string;
    estado: "ya_convocado" | "agregado" | "no_encontrado" | "ambiguo";
    dirigenteId?: string;
    nombreCompleto?: string;
    candidatos?: string[];
    mensaje?: string;
  }>;
};

export async function convocarDirigentesAEventoMaterial(
  eventoId: string,
  frasesBusqueda: string[],
): Promise<ResultadoConvocarMaterial> {
  const evento = await prisma.eventoEntregaMaterial.findUnique({ where: { id: eventoId } });
  if (!evento) {
    throw new Error("Evento no encontrado");
  }

  const asignaciones = await prisma.asignacionMaterialEntrega.findMany({
    where: { eventoId },
    take: 50,
  });
  const porDirigente = new Map<string, typeof asignaciones>();
  for (const a of asignaciones) {
    const list = porDirigente.get(a.dirigenteId) ?? [];
    list.push(a);
    porDirigente.set(a.dirigenteId, list);
  }
  const lineasPlantilla = [...porDirigente.values()][0];
  if (!lineasPlantilla?.length) {
    throw new Error("El evento no tiene material asignado para copiar a nuevos convocados");
  }

  const activos = await prisma.dirigente.findMany({
    where: { activo: true, status: "ACTIVO" },
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
    },
  });

  const resultados: ResultadoConvocarMaterial["resultados"] = [];

  for (const buscar of frasesBusqueda) {
    const matches = activos.filter((d) => coincideNombreDirigente(d, buscar));
    if (matches.length === 0) {
      resultados.push({ buscar, estado: "no_encontrado", mensaje: "Sin dirigente activo coincidente" });
      continue;
    }
    if (matches.length > 1) {
      resultados.push({
        buscar,
        estado: "ambiguo",
        candidatos: matches.map((m) => `${nombreCompleto(m)} (${m.id})`),
        mensaje: "Varios dirigentes coinciden; refine la búsqueda o use ID",
      });
      continue;
    }

    const dirigente = matches[0]!;
    const ya = await prisma.eventoEntregaMaterialDirigente.findUnique({
      where: { eventoId_dirigenteId: { eventoId, dirigenteId: dirigente.id } },
    });
    if (ya) {
      resultados.push({
        buscar,
        estado: "ya_convocado",
        dirigenteId: dirigente.id,
        nombreCompleto: nombreCompleto(dirigente),
      });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.eventoEntregaMaterialDirigente.create({
        data: { eventoId, dirigenteId: dirigente.id },
      });
      for (const linea of lineasPlantilla) {
        await tx.asignacionMaterialEntrega.create({
          data: {
            eventoId,
            dirigenteId: dirigente.id,
            descripcion: linea.descripcion,
            fotoUrl: linea.fotoUrl,
            cantidad: linea.cantidad,
          },
        });
      }
    });

    resultados.push({
      buscar,
      estado: "agregado",
      dirigenteId: dirigente.id,
      nombreCompleto: nombreCompleto(dirigente),
    });
  }

  return { eventoId, eventoTitulo: evento.titulo, resultados };
}

export async function convocarEnEventoMaterialAbiertoPorTitulo(
  tituloContiene: string,
  frasesBusqueda: string[],
): Promise<ResultadoConvocarMaterial> {
  const evento = await prisma.eventoEntregaMaterial.findFirst({
    where: {
      estado: "ABIERTO",
      titulo: { contains: tituloContiene, mode: "insensitive" },
    },
    orderBy: { abiertoAt: "desc" },
  });
  if (!evento) {
    throw new Error(`No hay evento ABIERTO con «${tituloContiene}» en el título`);
  }
  return convocarDirigentesAEventoMaterial(evento.id, frasesBusqueda);
}
