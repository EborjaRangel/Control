import type {
  AlcanceEvento,
  Dirigente,
  EventoAsistencia,
  Prisma,
  TipoDirigente,
} from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { compararDirigentePorApellidosNombre, nombreCompleto, TIPOS_DIRIGENTE } from "./dirigentes.js";
import { filtroEstatusListado } from "./filtro-dirigentes.js";
import { distritoLocalDeSeccion, seccionesDeDistritoLocal } from "./secciones-electorales.js";
import { etiquetaUnidadTerritorial } from "./unidades-territoriales.js";

export type EventoAlcanceFields = Pick<
  EventoAsistencia,
  | "alcance"
  | "colonia"
  | "seccionElectoral"
  | "unidadTerritorialId"
  | "distritoLocal"
  | "tipoDirigente"
>;

export type DirigenteElegibleFields = Pick<
  Dirigente,
  "activo" | "status" | "colonia" | "seccionElectoral" | "unidadTerritorialId" | "tipo"
>;

export type EventoConRelaciones = EventoAsistencia & {
  unidadTerritorial?: {
    id: string;
    clave: string;
    nombre: string;
    tipoUt: string | null;
  } | null;
  _count?: { asistencias: number };
};

export function filtroDirigentesElegibles(evento: EventoAlcanceFields): Prisma.DirigenteWhereInput {
  const base: Prisma.DirigenteWhereInput = filtroEstatusListado(false);

  switch (evento.alcance) {
    case "COLONIA":
      return { ...base, colonia: evento.colonia ?? undefined };
    case "SECCION":
      return { ...base, seccionElectoral: evento.seccionElectoral ?? undefined };
    case "UNIDAD_TERRITORIAL":
      return { ...base, unidadTerritorialId: evento.unidadTerritorialId ?? undefined };
    case "DISTRITO":
      if (evento.distritoLocal == null) return base;
      return {
        ...base,
        seccionElectoral: { in: seccionesDeDistritoLocal(evento.distritoLocal) },
      };
    case "TIPO_DIRIGENTE":
      return { ...base, tipo: evento.tipoDirigente ?? undefined };
    case "TODOS":
      return { ...base, tipo: { in: [...TIPOS_DIRIGENTE] } };
    default:
      return base;
  }
}

export function dirigenteEsElegible(
  dirigente: DirigenteElegibleFields,
  evento: EventoAlcanceFields,
): boolean {
  if (!dirigente.activo || dirigente.status !== "ACTIVO") return false;
  switch (evento.alcance) {
    case "COLONIA":
      return dirigente.colonia === evento.colonia;
    case "SECCION":
      return dirigente.seccionElectoral === evento.seccionElectoral;
    case "UNIDAD_TERRITORIAL":
      return dirigente.unidadTerritorialId === evento.unidadTerritorialId;
    case "DISTRITO":
      if (evento.distritoLocal == null) return true;
      return distritoLocalDeSeccion(dirigente.seccionElectoral) === evento.distritoLocal;
    case "TIPO_DIRIGENTE":
      return dirigente.tipo === evento.tipoDirigente;
    case "TODOS":
      return (TIPOS_DIRIGENTE as readonly string[]).includes(dirigente.tipo);
    default:
      return false;
  }
}

export function etiquetaAlcanceEvento(
  evento: EventoAlcanceFields & {
    unidadTerritorial?: { clave: string; nombre: string } | null;
  },
): string {
  switch (evento.alcance) {
    case "COLONIA":
      return `Colonia: ${evento.colonia ?? "—"}`;
    case "SECCION":
      return `Sección: ${evento.seccionElectoral ?? "—"}`;
    case "UNIDAD_TERRITORIAL":
      return evento.unidadTerritorial
        ? `UT: ${etiquetaUnidadTerritorial(evento.unidadTerritorial)}`
        : "Unidad territorial";
    case "DISTRITO":
      return evento.distritoLocal == null
        ? "Distrito: todos (Coyoacán)"
        : `Distrito local ${evento.distritoLocal}`;
    case "TIPO_DIRIGENTE":
      return `Tipo dirigente: ${evento.tipoDirigente ?? "—"}`;
    case "TODOS":
      return "Todos los dirigentes (D1–D4 y Transversales, estatus alta)";
    default:
      return "—";
  }
}

export function serializeEvento(evento: EventoConRelaciones) {
  return {
    id: evento.id,
    titulo: evento.titulo,
    fecha: evento.fecha.toISOString().slice(0, 10),
    hora: evento.hora,
    lugar: evento.lugar,
    alcance: evento.alcance,
    colonia: evento.colonia,
    seccionElectoral: evento.seccionElectoral,
    unidadTerritorial: evento.unidadTerritorial
      ? {
          id: evento.unidadTerritorial.id,
          clave: evento.unidadTerritorial.clave,
          nombre: evento.unidadTerritorial.nombre,
          tipoUt: evento.unidadTerritorial.tipoUt,
        }
      : null,
    distritoLocal: evento.distritoLocal,
    tipoDirigente: evento.tipoDirigente,
    alcanceLabel: etiquetaAlcanceEvento(evento),
    estado: evento.estado,
    abiertoAt: evento.abiertoAt?.toISOString() ?? null,
    cerradoAt: evento.cerradoAt?.toISOString() ?? null,
    totalAsistencias: evento._count?.asistencias ?? null,
    createdAt: evento.createdAt.toISOString(),
    updatedAt: evento.updatedAt.toISOString(),
  };
}

export async function contarElegibles(evento: EventoAsistencia): Promise<number> {
  return prisma.dirigente.count({ where: filtroDirigentesElegibles(evento) });
}

export async function obtenerEvento(id: string) {
  return prisma.eventoAsistencia.findUnique({
    where: { id },
    include: {
      unidadTerritorial: true,
      _count: { select: { asistencias: true } },
    },
  });
}

export async function enriquecerEvento(evento: EventoConRelaciones) {
  const totalElegibles = await contarElegibles(evento);
  const serialized = serializeEvento(evento);
  return {
    ...serialized,
    totalElegibles,
    totalAsistencias: evento._count?.asistencias ?? 0,
    totalFaltas:
      evento.estado === "CERRADO"
        ? Math.max(0, totalElegibles - (evento._count?.asistencias ?? 0))
        : null,
  };
}

export async function resumenAsistenciaDirigentes() {
  const [dirigentes, eventosContables, registros] = await Promise.all([
    prisma.dirigente.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        primerApellido: true,
        segundoApellido: true,
        tipo: true,
        colonia: true,
        seccionElectoral: true,
        unidadTerritorialId: true,
        activo: true,
        status: true,
      },
      orderBy: [{ primerApellido: "asc" }, { nombre: "asc" }],
    }),
    prisma.eventoAsistencia.findMany({
      where: { estado: { in: ["ABIERTO", "CERRADO"] } },
    }),
    prisma.registroAsistencia.findMany({
      where: { evento: { estado: { in: ["ABIERTO", "CERRADO"] } } },
      select: { eventoId: true, dirigenteId: true },
    }),
  ]);

  const asistenciaPorDirigente = new Map<string, Set<string>>();
  for (const r of registros) {
    if (!asistenciaPorDirigente.has(r.dirigenteId)) {
      asistenciaPorDirigente.set(r.dirigenteId, new Set());
    }
    asistenciaPorDirigente.get(r.dirigenteId)!.add(r.eventoId);
  }

  return dirigentes.map((d) => {
    let eventosElegibles = 0;
    let asistencias = 0;
    const asistidos = asistenciaPorDirigente.get(d.id) ?? new Set<string>();

    for (const ev of eventosContables) {
      if (!dirigenteEsElegible(d, ev)) continue;
      eventosElegibles++;
      if (asistidos.has(ev.id)) asistencias++;
    }

    return {
      id: d.id,
      nombreCompleto: nombreCompleto(d),
      tipo: d.tipo,
      colonia: d.colonia,
      seccionElectoral: d.seccionElectoral,
      eventosElegibles,
      asistencias,
      faltas: eventosElegibles - asistencias,
    };
  });
}

export async function detalleAsistenciaDirigente(dirigenteId: string) {
  const dirigente = await prisma.dirigente.findUnique({
    where: { id: dirigenteId },
    include: { unidadTerritorial: true },
  });
  if (!dirigente) return null;

  const eventos = await prisma.eventoAsistencia.findMany({
    where: { estado: { in: ["ABIERTO", "CERRADO"] } },
    orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    include: {
      unidadTerritorial: true,
      _count: { select: { asistencias: true } },
    },
  });

  const registros = await prisma.registroAsistencia.findMany({
    where: { dirigenteId, evento: { estado: { in: ["ABIERTO", "CERRADO"] } } },
    select: { eventoId: true, registradoAt: true },
  });
  const registroMap = new Map(registros.map((r) => [r.eventoId, r.registradoAt]));

  const historial = eventos
    .filter((ev) => dirigenteEsElegible(dirigente, ev))
    .map((ev) => {
      const registradoAt = registroMap.get(ev.id);
      return {
        evento: serializeEvento(ev),
        asistio: Boolean(registradoAt),
        registradoAt: registradoAt?.toISOString() ?? null,
      };
    });

  const asistencias = historial.filter((h) => h.asistio).length;
  const eventosElegibles = historial.length;

  return {
    dirigente: {
      id: dirigente.id,
      nombreCompleto: nombreCompleto(dirigente),
      tipo: dirigente.tipo,
      colonia: dirigente.colonia,
      seccionElectoral: dirigente.seccionElectoral,
    },
    resumen: {
      eventosElegibles,
      asistencias,
      faltas: eventosElegibles - asistencias,
    },
    historial,
  };
}

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaIso(valor: string) {
  return FECHA_ISO.test(valor);
}

/** Dirigentes elegibles de los eventos de una fecha que no tienen registro de asistencia. */
export async function faltasAsistenciaPorFecha(fechaIso: string) {
  const fecha = new Date(`${fechaIso}T12:00:00.000Z`);
  const eventos = await prisma.eventoAsistencia.findMany({
    where: { fecha },
    include: { unidadTerritorial: true },
    orderBy: [{ hora: "asc" }, { titulo: "asc" }],
  });

  type Falta = {
    id: string;
    nombreCompleto: string;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    eventos: string[];
    primerApellido: string;
    segundoApellido: string | null;
    nombre: string;
  };

  const faltasMap = new Map<string, Falta>();

  for (const ev of eventos) {
    const [elegibles, registros] = await Promise.all([
      prisma.dirigente.findMany({
        where: filtroDirigentesElegibles(ev),
        select: {
          id: true,
          nombre: true,
          primerApellido: true,
          segundoApellido: true,
          tipo: true,
          colonia: true,
          seccionElectoral: true,
        },
      }),
      prisma.registroAsistencia.findMany({
        where: { eventoId: ev.id },
        select: { dirigenteId: true },
      }),
    ]);
    const asistieron = new Set(registros.map((r) => r.dirigenteId));
    for (const d of elegibles) {
      if (asistieron.has(d.id)) continue;
      const existente = faltasMap.get(d.id);
      if (existente) {
        existente.eventos.push(ev.titulo);
        continue;
      }
      faltasMap.set(d.id, {
        id: d.id,
        nombreCompleto: nombreCompleto(d),
        tipo: d.tipo,
        colonia: d.colonia,
        seccionElectoral: d.seccionElectoral,
        eventos: [ev.titulo],
        primerApellido: d.primerApellido,
        segundoApellido: d.segundoApellido,
        nombre: d.nombre,
      });
    }
  }

  const faltas = [...faltasMap.values()]
    .sort((a, b) => compararDirigentePorApellidosNombre(a, b))
    .map((fila) => ({
      id: fila.id,
      nombreCompleto: fila.nombreCompleto,
      tipo: fila.tipo,
      colonia: fila.colonia,
      seccionElectoral: fila.seccionElectoral,
      eventos: fila.eventos,
    }));

  return {
    fecha: fechaIso,
    eventos: eventos.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      estado: e.estado,
      hora: e.hora,
    })),
    faltas,
  };
}
