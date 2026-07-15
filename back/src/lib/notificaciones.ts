import type {
  AlcanceNotificacion,
  Prisma,
  TipoDirigente,
} from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { normalizarTextoGuardado } from "./normalizar-texto.js";
import { seccionesDeDistritoLocal } from "./secciones-electorales.js";
import { etiquetaUnidadTerritorial } from "./unidades-territoriales.js";

export type NotificacionAlcanceFields = {
  alcance: AlcanceNotificacion;
  colonia?: string | null;
  seccionElectoral?: string | null;
  unidadTerritorialId?: string | null;
  distritoLocal?: number | null;
  distritoFederal?: number | null;
  tipoDirigente?: TipoDirigente | null;
};

export function filtroDirigentesNotificacion(
  fields: NotificacionAlcanceFields,
): Prisma.DirigenteWhereInput {
  const base: Prisma.DirigenteWhereInput = { activo: true };

  switch (fields.alcance) {
    case "TODOS":
      return base;
    case "TIPO_DIRIGENTE":
      return { ...base, tipo: fields.tipoDirigente ?? undefined };
    case "DISTRITO_FEDERAL":
      return { ...base, distritoFederal: fields.distritoFederal ?? undefined };
    case "DISTRITO_LOCAL":
      if (fields.distritoLocal == null) return base;
      return {
        ...base,
        seccionElectoral: { in: seccionesDeDistritoLocal(fields.distritoLocal) },
      };
    case "COLONIA":
      return {
        ...base,
        colonia: fields.colonia ? normalizarTextoGuardado(fields.colonia) : undefined,
      };
    case "SECCION":
      return { ...base, seccionElectoral: fields.seccionElectoral ?? undefined };
    case "UNIDAD_TERRITORIAL":
      return { ...base, unidadTerritorialId: fields.unidadTerritorialId ?? undefined };
    default:
      return base;
  }
}

export function etiquetaAlcanceNotificacion(
  n: NotificacionAlcanceFields & {
    unidadTerritorial?: { clave: string; nombre: string } | null;
  },
): string {
  switch (n.alcance) {
    case "TODOS":
      return "Todos los dirigentes (D1–D4)";
    case "TIPO_DIRIGENTE":
      return `Tipo dirigente: ${n.tipoDirigente ?? "—"}`;
    case "DISTRITO_FEDERAL":
      return n.distritoFederal == null
        ? "Distrito federal"
        : `Distrito federal ${n.distritoFederal}`;
    case "DISTRITO_LOCAL":
      return n.distritoLocal == null
        ? "Distrito local (Coyoacán)"
        : `Distrito local ${n.distritoLocal}`;
    case "COLONIA":
      return `Colonia: ${n.colonia ?? "—"}`;
    case "SECCION":
      return `Sección electoral: ${n.seccionElectoral ?? "—"}`;
    case "UNIDAD_TERRITORIAL":
      return n.unidadTerritorial
        ? `UT: ${etiquetaUnidadTerritorial(n.unidadTerritorial)}`
        : "Unidad territorial";
    default:
      return "—";
  }
}

export async function contarDestinatariosNotificacion(fields: NotificacionAlcanceFields) {
  const dirigenteIds = await prisma.dirigente.findMany({
    where: filtroDirigentesNotificacion(fields),
    select: { id: true },
  });
  const ids = dirigenteIds.map((d) => d.id);
  if (ids.length === 0) return { dirigentes: 0, usuarios: 0 };

  const usuarios = await usuariosParaDirigentes(ids);
  return { dirigentes: ids.length, usuarios: usuarios.length };
}

export async function usuariosParaDirigentes(dirigenteIds: string[]): Promise<string[]> {
  if (dirigenteIds.length === 0) return [];

  const usuarios = await prisma.usuario.findMany({
    where: {
      activo: true,
      rol: { not: "DETECTADO" },
      OR: [
        { dirigenteId: { in: dirigenteIds } },
        { rc: { dirigenteId: { in: dirigenteIds }, activo: true } },
        { rg: { dirigenteId: { in: dirigenteIds }, activo: true } },
      ],
    },
    select: { id: true },
  });

  return [...new Set(usuarios.map((u) => u.id))];
}

export type EnviarNotificacionInput = NotificacionAlcanceFields & {
  mensaje: string;
  creadoPorId?: string | null;
};

export function normalizarMensajeNotificacion(mensaje: string): string {
  return mensaje.trim().toUpperCase();
}

export async function enviarNotificacion(input: EnviarNotificacionInput) {
  const dirigentes = await prisma.dirigente.findMany({
    where: filtroDirigentesNotificacion(input),
    select: { id: true },
  });
  const dirigenteIds = dirigentes.map((d) => d.id);
  const usuarioIds = await usuariosParaDirigentes(dirigenteIds);

  if (usuarioIds.length === 0) {
    return {
      notificacionId: null as string | null,
      alcanceLabel: "",
      dirigentes: 0,
      destinatarios: 0,
      error: "No hay usuarios activos para el alcance seleccionado",
    };
  }

  const notificacion = await prisma.notificacion.create({
    data: {
      mensaje: normalizarMensajeNotificacion(input.mensaje),
      alcance: input.alcance,
      colonia: input.colonia ? normalizarTextoGuardado(input.colonia) : null,
      seccionElectoral: input.seccionElectoral ?? null,
      unidadTerritorialId: input.unidadTerritorialId ?? null,
      distritoLocal: input.distritoLocal ?? null,
      distritoFederal: input.distritoFederal ?? null,
      tipoDirigente: input.tipoDirigente ?? null,
      creadoPorId: input.creadoPorId ?? null,
      destinatarios: {
        createMany: {
          data: usuarioIds.map((usuarioId) => ({ usuarioId })),
        },
      },
    },
    include: {
      unidadTerritorial: { select: { clave: true, nombre: true } },
    },
  });

  return {
    notificacionId: notificacion.id,
    alcanceLabel: etiquetaAlcanceNotificacion(notificacion),
    dirigentes: dirigenteIds.length,
    destinatarios: usuarioIds.length,
    enviadoAt: notificacion.enviadoAt.toISOString(),
    error: null as string | null,
  };
}

export function serializeNotificacionUsuario(row: {
  id: string;
  vistoAt: Date | null;
  createdAt: Date;
  notificacion: {
    id: string;
    mensaje: string;
    alcance: AlcanceNotificacion;
    colonia: string | null;
    seccionElectoral: string | null;
    distritoLocal: number | null;
    distritoFederal: number | null;
    tipoDirigente: TipoDirigente | null;
    enviadoAt: Date;
    unidadTerritorial: { clave: string; nombre: string } | null;
  };
}) {
  const n = row.notificacion;
  return {
    id: row.id,
    notificacionId: n.id,
    mensaje: n.mensaje,
    alcance: n.alcance,
    alcanceLabel: etiquetaAlcanceNotificacion(n),
    enviadoAt: n.enviadoAt.toISOString(),
    vistoAt: row.vistoAt?.toISOString() ?? null,
    leida: row.vistoAt != null,
  };
}
