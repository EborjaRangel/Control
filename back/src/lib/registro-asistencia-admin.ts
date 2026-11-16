import type { Request } from "express";
import { prisma } from "./prisma.js";
import { nombreCompleto } from "./dirigentes.js";
import { registrarAuditoria } from "./audit.js";

const CANTIDAD_MOV_MAX = 100_000;

export function validarCantidadMovilizacion(cantidad: unknown): number | null {
  if (typeof cantidad !== "number" || !Number.isInteger(cantidad)) {
    if (typeof cantidad === "string" && cantidad.trim()) {
      const n = Number.parseInt(cantidad.trim(), 10);
      if (Number.isFinite(n)) return validarCantidadMovilizacion(n);
    }
    return null;
  }
  if (cantidad < 1 || cantidad > CANTIDAD_MOV_MAX) return null;
  return cantidad;
}

export async function actualizarCantidadRegistroAsistencia(
  registroId: string,
  cantidad: number,
  req?: Request,
) {
  const registro = await prisma.registroAsistencia.findUnique({
    where: { id: registroId },
    include: {
      evento: { select: { id: true, titulo: true, tipoOperacion: true, estado: true } },
      dirigente: {
        select: {
          id: true,
          nombre: true,
          primerApellido: true,
          segundoApellido: true,
        },
      },
    },
  });

  if (!registro) {
    return { ok: false as const, status: 404, error: "Registro no encontrado" };
  }

  if (registro.evento.tipoOperacion !== "MOVILIZACION") {
    return {
      ok: false as const,
      status: 400,
      error: "En pase de lista no se edita cantidad; elimina el registro si fue un error.",
    };
  }

  const updated = await prisma.registroAsistencia.update({
    where: { id: registroId },
    data: { cantidad },
    include: {
      dirigente: {
        select: {
          id: true,
          nombre: true,
          primerApellido: true,
          segundoApellido: true,
          tipo: true,
          colonia: true,
          seccionElectoral: true,
        },
      },
      registradoPor: { select: { id: true, username: true, rol: true } },
    },
  });

  const sum = await prisma.registroAsistencia.aggregate({
    where: { eventoId: registro.eventoId, dirigenteId: registro.dirigenteId },
    _sum: { cantidad: true },
  });

  await registrarAuditoria(req, {
    accion: "UPDATE",
    entidad: "RegistroAsistencia",
    entidadId: registroId,
    entidadLabel: nombreCompleto(registro.dirigente),
    dirigenteId: registro.dirigenteId,
    antes: { cantidad: registro.cantidad },
    despues: { cantidad },
    metadata: {
      eventoId: registro.eventoId,
      eventoTitulo: registro.evento.titulo,
      totalDirigente: sum._sum.cantidad ?? cantidad,
    },
  });

  return {
    ok: true as const,
    status: 200,
    registro: updated,
    totalMovilizadosDirigente: sum._sum.cantidad ?? cantidad,
  };
}

export async function eliminarRegistroAsistencia(registroId: string, req?: Request) {
  const registro = await prisma.registroAsistencia.findUnique({
    where: { id: registroId },
    include: {
      evento: { select: { id: true, titulo: true, tipoOperacion: true } },
      dirigente: {
        select: {
          id: true,
          nombre: true,
          primerApellido: true,
          segundoApellido: true,
        },
      },
      registradoPor: { select: { username: true } },
    },
  });

  if (!registro) {
    return { ok: false as const, status: 404, error: "Registro no encontrado" };
  }

  await prisma.registroAsistencia.delete({ where: { id: registroId } });

  await registrarAuditoria(req, {
    accion: "DELETE",
    entidad: "RegistroAsistencia",
    entidadId: registroId,
    entidadLabel: nombreCompleto(registro.dirigente),
    dirigenteId: registro.dirigenteId,
    antes: {
      cantidad: registro.cantidad,
      registradoAt: registro.registradoAt.toISOString(),
      registradoPor: registro.registradoPor?.username ?? null,
    },
    metadata: {
      eventoId: registro.eventoId,
      eventoTitulo: registro.evento.titulo,
    },
  });

  return {
    ok: true as const,
    status: 200,
    eventoId: registro.eventoId,
    dirigenteId: registro.dirigenteId,
  };
}