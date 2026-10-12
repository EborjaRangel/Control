import { prisma } from "./prisma.js";
import { nombreCompleto } from "./dirigentes.js";

export function normalizarTextoBusqueda(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function partesNombreDirigente(d: {
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
}) {
  return normalizarTextoBusqueda(
    [d.nombre, d.primerApellido, d.segundoApellido ?? ""].join(" "),
  )
    .split(/\s+/)
    .filter(Boolean);
}

/** Mayor puntaje = mejor coincidencia (evita confundir «Eduardo Arias» con «Eduardo Arias Martínez»). */
export function puntajeCoincidenciaDirigente(
  d: { nombre: string; primerApellido: string; segundoApellido: string | null },
  frase: string,
): number {
  const tokens = normalizarTextoBusqueda(frase).split(/\s+/).filter(Boolean);
  if (!tokens.length) return -1;
  const partes = partesNombreDirigente(d);
  const blob = partes.join(" ");
  if (!tokens.every((t) => blob.includes(t))) return -1;

  let score = 0;
  if (partes.join(" ") === tokens.join(" ")) {
    score += 100;
  } else if (partes.slice(0, tokens.length).join(" ") === tokens.join(" ")) {
    score += 85;
  } else {
    score += 40;
  }

  const extras = Math.max(0, partes.length - tokens.length);
  score -= extras * 20;

  return score;
}

export function resolverDirigentePorFrase<
  T extends { nombre: string; primerApellido: string; segundoApellido: string | null },
>(activos: T[], frase: string): { kind: "one"; dirigente: T } | { kind: "ambiguo"; candidatos: T[] } | { kind: "none" } {
  const scored = activos
    .map((d) => ({ d, score: puntajeCoincidenciaDirigente(d, frase) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return { kind: "none" };

  const bestScore = scored[0]!.score;
  const top = scored.filter((x) => x.score === bestScore);
  if (top.length > 1) {
    return { kind: "ambiguo", candidatos: top.map((x) => x.d) };
  }
  return { kind: "one", dirigente: scored[0]!.d };
}

/** @deprecated Use puntajeCoincidenciaDirigente / resolverDirigentePorFrase */
export function coincideNombreDirigente(
  d: { nombre: string; primerApellido: string; segundoApellido: string | null },
  frase: string,
): boolean {
  return puntajeCoincidenciaDirigente(d, frase) >= 0;
}

export type ResultadoConvocarMaterial = {
  eventoId: string;
  eventoTitulo: string;
  resultados: Array<{
    buscar?: string;
    dirigenteIdEntrada?: string;
    estado: "ya_convocado" | "agregado" | "no_encontrado" | "ambiguo" | "invalido";
    dirigenteId?: string;
    nombreCompleto?: string;
    candidatos?: string[];
    mensaje?: string;
  }>;
};

type DirigenteMin = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
};

async function lineasPlantillaEvento(eventoId: string) {
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
  return lineasPlantilla;
}

async function convocarUnDirigente(
  eventoId: string,
  dirigente: DirigenteMin,
  lineasPlantilla: Awaited<ReturnType<typeof lineasPlantillaEvento>>,
  meta: { buscar?: string; dirigenteIdEntrada?: string },
): Promise<ResultadoConvocarMaterial["resultados"][number]> {
  const ya = await prisma.eventoEntregaMaterialDirigente.findUnique({
    where: { eventoId_dirigenteId: { eventoId, dirigenteId: dirigente.id } },
  });
  if (ya) {
    return {
      ...meta,
      estado: "ya_convocado",
      dirigenteId: dirigente.id,
      nombreCompleto: nombreCompleto(dirigente),
    };
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

  return {
    ...meta,
    estado: "agregado",
    dirigenteId: dirigente.id,
    nombreCompleto: nombreCompleto(dirigente),
  };
}

export async function convocarDirigentesAEventoMaterial(
  eventoId: string,
  input: { buscar?: string[]; dirigenteIds?: string[] } = {},
): Promise<ResultadoConvocarMaterial> {
  const frases = input.buscar ?? [];
  const ids = input.dirigenteIds ?? [];

  const evento = await prisma.eventoEntregaMaterial.findUnique({ where: { id: eventoId } });
  if (!evento) {
    throw new Error("Evento no encontrado");
  }

  const lineasPlantilla = await lineasPlantillaEvento(eventoId);

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

  for (const buscar of frases) {
    const resolved = resolverDirigentePorFrase(activos, buscar);
    if (resolved.kind === "none") {
      resultados.push({ buscar, estado: "no_encontrado", mensaje: "Sin dirigente activo coincidente" });
      continue;
    }
    if (resolved.kind === "ambiguo") {
      resultados.push({
        buscar,
        estado: "ambiguo",
        candidatos: resolved.candidatos.map((m) => `${nombreCompleto(m)} (${m.id})`),
        mensaje: "Varios dirigentes coinciden; use apellidos completos o el ID del dirigente",
      });
      continue;
    }

    resultados.push(
      await convocarUnDirigente(eventoId, resolved.dirigente, lineasPlantilla, { buscar }),
    );
  }

  for (const dirigenteIdEntrada of ids) {
    const dirigente = activos.find((d) => d.id === dirigenteIdEntrada);
    if (!dirigente) {
      resultados.push({
        dirigenteIdEntrada,
        estado: "invalido",
        mensaje: "ID no corresponde a un dirigente activo",
      });
      continue;
    }
    resultados.push(
      await convocarUnDirigente(eventoId, dirigente, lineasPlantilla, { dirigenteIdEntrada }),
    );
  }

  return { eventoId, eventoTitulo: evento.titulo, resultados };
}

export async function convocarEnEventoMaterialAbiertoPorTitulo(
  tituloContiene: string,
  frasesBusqueda: string[],
  dirigenteIds: string[] = [],
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
  return convocarDirigentesAEventoMaterial(evento.id, {
    buscar: frasesBusqueda,
    dirigenteIds,
  });
}
