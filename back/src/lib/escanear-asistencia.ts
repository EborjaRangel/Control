import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { codigoQrDesdeTextoQr } from "./codigo-qr.js";
import { nombreCompleto } from "./dirigentes.js";
import { dirigenteEsElegible } from "./eventos-asistencia.js";
import { registrarAuditoria } from "./audit.js";
import type { Request, Response } from "express";

export const CLAVE_PASE_LISTA = "777";
export const MENSAJE_QR_INVALIDO = "El QR es inválido";
export const MENSAJE_ASISTENCIA_TOMADA = "Ya fue tomada la asistencia";
export const MENSAJE_ASISTENCIA_DUPLICADA = "Es imposible registrar más de una asistencia";
export const MENSAJE_SIN_PASE_ABIERTO = "No hay un pase de lista abierto";
export const MENSAJE_CLAVE_INCORRECTA = "Código incorrecto";

export type ResultadoEscaneoAsistencia =
  | {
      ok: true;
      status: 201;
      codigo: "ASISTENCIA_TOMADA";
      mensaje: string;
      evento: { id: string; titulo: string };
      dirigente: {
        id: string;
        nombreCompleto: string;
        tipo: string;
        colonia: string;
        seccionElectoral: string;
      };
      registradoAt: string;
    }
  | {
      ok: false;
      status: 400 | 404 | 409;
      codigo: "QR_INVALIDO" | "PASE_CERRADO" | "ASISTENCIA_DUPLICADA";
      mensaje: string;
      dirigente?: { id: string; nombreCompleto: string };
    };

function resultadoInvalido(): ResultadoEscaneoAsistencia {
  return {
    ok: false,
    status: 404,
    codigo: "QR_INVALIDO",
    mensaje: MENSAJE_QR_INVALIDO,
  };
}

function resultadoDuplicado(dirigente: {
  id: string;
  nombreCompleto: string;
}): ResultadoEscaneoAsistencia {
  return {
    ok: false,
    status: 409,
    codigo: "ASISTENCIA_DUPLICADA",
    mensaje: MENSAJE_ASISTENCIA_DUPLICADA,
    dirigente,
  };
}

export async function procesarEscaneoAsistencia(input: {
  raw: string;
  eventoId?: string;
  registradoPorId?: string | null;
  req?: Request;
}): Promise<ResultadoEscaneoAsistencia> {
  const codigoQr = codigoQrDesdeTextoQr(input.raw);
  if (!codigoQr) return resultadoInvalido();

  const dirigente = await prisma.dirigente.findUnique({
    where: { codigoQr },
  });
  if (!dirigente || !dirigente.activo || dirigente.status !== "ACTIVO") {
    return resultadoInvalido();
  }

  const dirigenteResumen = {
    id: dirigente.id,
    nombreCompleto: nombreCompleto(dirigente),
  };

  let evento = input.eventoId
    ? await prisma.eventoAsistencia.findUnique({ where: { id: input.eventoId } })
    : null;

  if (input.eventoId) {
    if (!evento) return resultadoInvalido();
    if (evento.estado !== "ABIERTO") {
      return {
        ok: false,
        status: 400,
        codigo: "PASE_CERRADO",
        mensaje: MENSAJE_SIN_PASE_ABIERTO,
      };
    }
    if (!dirigenteEsElegible(dirigente, evento)) return resultadoInvalido();
  } else {
    const abiertos = await prisma.eventoAsistencia.findMany({
      where: { estado: "ABIERTO" },
      orderBy: [{ abiertoAt: "desc" }, { createdAt: "desc" }],
    });
    if (abiertos.length === 0) {
      return {
        ok: false,
        status: 400,
        codigo: "PASE_CERRADO",
        mensaje: MENSAJE_SIN_PASE_ABIERTO,
      };
    }
    evento = abiertos.find((item) => dirigenteEsElegible(dirigente, item)) ?? null;
    if (!evento) return resultadoInvalido();
  }

  const existente = await prisma.registroAsistencia.findUnique({
    where: {
      eventoId_dirigenteId: { eventoId: evento.id, dirigenteId: dirigente.id },
    },
  });
  if (existente) return resultadoDuplicado(dirigenteResumen);

  try {
    const registro = await prisma.registroAsistencia.create({
      data: {
        eventoId: evento.id,
        dirigenteId: dirigente.id,
        registradoPorId: input.registradoPorId ?? null,
      },
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
      },
    });

    await registrarAuditoria(input.req, {
      accion: "CREATE",
      entidad: "RegistroAsistencia",
      entidadId: registro.id,
      entidadLabel: nombreCompleto(registro.dirigente),
      dirigenteId: registro.dirigente.id,
      despues: {
        eventoId: evento.id,
        eventoTitulo: evento.titulo,
        dirigenteId: registro.dirigente.id,
        dirigenteNombre: nombreCompleto(registro.dirigente),
        origen: input.eventoId ? "pase_lista" : "camara_qr",
      },
    });

    return {
      ok: true,
      status: 201,
      codigo: "ASISTENCIA_TOMADA",
      mensaje: MENSAJE_ASISTENCIA_TOMADA,
      evento: { id: evento.id, titulo: evento.titulo },
      dirigente: {
        id: registro.dirigente.id,
        nombreCompleto: nombreCompleto(registro.dirigente),
        tipo: registro.dirigente.tipo,
        colonia: registro.dirigente.colonia,
        seccionElectoral: registro.dirigente.seccionElectoral,
      },
      registradoAt: registro.registradoAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return resultadoDuplicado(dirigenteResumen);
    }
    throw error;
  }
}

export function claveDesdeEscaneo(req: Request) {
  const body = req.body as unknown;
  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    if (typeof data.clave === "string") return data.clave.trim();
    if (typeof data.codigo === "string") return data.codigo.trim();
  }
  return typeof req.query.clave === "string" ? req.query.clave.trim() : "";
}

export function rawCodigoDesdeEscaneo(req: Request) {
  const body = req.body as unknown;
  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    if (typeof data.codigoQr === "string") return data.codigoQr;
    if (typeof data.raw === "string") return data.raw;
    if (typeof data.c === "string") return data.c;
  }
  return typeof req.query.c === "string" ? req.query.c : "";
}

export async function manejarEscaneoHttp(req: Request, res: Response) {
  try {
    if (claveDesdeEscaneo(req) !== CLAVE_PASE_LISTA) {
      res.status(403).json({
        error: MENSAJE_CLAVE_INCORRECTA,
        mensaje: MENSAJE_CLAVE_INCORRECTA,
        codigo: "CLAVE_INCORRECTA",
      });
      return;
    }
    const resultado = await procesarEscaneoAsistencia({
      raw: rawCodigoDesdeEscaneo(req),
      req,
    });
    res.status(resultado.status).json(cuerpoRespuestaEscaneo(resultado));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al registrar asistencia",
      mensaje: "Error al registrar asistencia",
    });
  }
}

export function cuerpoRespuestaEscaneo(resultado: ResultadoEscaneoAsistencia) {
  if (resultado.ok) {
    return {
      mensaje: resultado.mensaje,
      codigo: resultado.codigo,
      evento: resultado.evento,
      dirigente: resultado.dirigente,
      registradoAt: resultado.registradoAt,
    };
  }
  return {
    error: resultado.mensaje,
    mensaje: resultado.mensaje,
    codigo: resultado.codigo,
    dirigente: resultado.dirigente,
  };
}
