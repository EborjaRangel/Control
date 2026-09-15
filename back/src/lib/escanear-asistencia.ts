import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { codigoQrDesdeTextoQr } from "./codigo-qr.js";
import { nombreCompleto } from "./dirigentes.js";
import { dirigenteEsElegible } from "./eventos-asistencia.js";
import { registrarAuditoria } from "./audit.js";
import { verifyPassword } from "./auth.js";
import type { Request, Response } from "express";

export const MENSAJE_QR_INVALIDO = "El QR es inválido";
export const MENSAJE_ASISTENCIA_TOMADA = "Ya fue tomada la asistencia";
export const MENSAJE_ASISTENCIA_DUPLICADA = "Es imposible registrar más de una asistencia";
export const MENSAJE_SIN_PASE_ABIERTO = "No hay un pase de lista abierto";
export const MENSAJE_CLAVE_INCORRECTA = "Código incorrecto";

export function mensajePaseCerrado(titulo: string) {
  return `Pase de lista ya cerrado del evento ${titulo}`;
}

export type EventoPaseResumen = { id: string; titulo: string };

export type EstadoPaseLista = {
  abierto: boolean;
  evento: EventoPaseResumen | null;
  mensaje: string | null;
};

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
      status: 400 | 403 | 404 | 409;
      codigo: "QR_INVALIDO" | "PASE_CERRADO" | "ASISTENCIA_DUPLICADA" | "CLAVE_INCORRECTA";
      mensaje: string;
      evento?: EventoPaseResumen;
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

function resultadoDuplicado(
  dirigente: {
    id: string;
    nombreCompleto: string;
  },
  evento?: EventoPaseResumen,
): ResultadoEscaneoAsistencia {
  return {
    ok: false,
    status: 409,
    codigo: "ASISTENCIA_DUPLICADA",
    mensaje: MENSAJE_ASISTENCIA_DUPLICADA,
    dirigente,
    evento,
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
        mensaje: mensajePaseCerrado(evento.titulo),
        evento: { id: evento.id, titulo: evento.titulo },
      };
    }
    if (!dirigenteEsElegible(dirigente, evento)) return resultadoInvalido();
  } else {
    const abiertos = await prisma.eventoAsistencia.findMany({
      where: { estado: "ABIERTO" },
      orderBy: [{ abiertoAt: "desc" }, { createdAt: "desc" }],
    });
    if (abiertos.length === 0) {
      const estado = await estadoPaseLista();
      return {
        ok: false,
        status: 400,
        codigo: "PASE_CERRADO",
        mensaje: estado.mensaje ?? MENSAJE_SIN_PASE_ABIERTO,
        evento: estado.evento ?? undefined,
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
  if (existente) return resultadoDuplicado(dirigenteResumen, { id: evento.id, titulo: evento.titulo });

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
      return resultadoDuplicado(dirigenteResumen, { id: evento.id, titulo: evento.titulo });
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

export async function estadoPaseLista(): Promise<EstadoPaseLista> {
  const abierto = await prisma.eventoAsistencia.findFirst({
    where: { estado: "ABIERTO" },
    orderBy: [{ abiertoAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, titulo: true },
  });
  if (abierto) {
    return { abierto: true, evento: abierto, mensaje: null };
  }

  const cerrado = await prisma.eventoAsistencia.findFirst({
    where: { estado: "CERRADO" },
    orderBy: [{ cerradoAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, titulo: true },
  });
  if (cerrado) {
    return {
      abierto: false,
      evento: cerrado,
      mensaje: mensajePaseCerrado(cerrado.titulo),
    };
  }

  return { abierto: false, evento: null, mensaje: MENSAJE_SIN_PASE_ABIERTO };
}

export async function inhabilitarUsuariosPaseLista() {
  await prisma.usuario.updateMany({
    where: { rol: "PASE_LISTA", activo: true },
    data: { activo: false },
  });
}

async function usuarioPaseListaPorClave(clave: string) {
  if (!clave) return null;
  const usuarios = await prisma.usuario.findMany({
    where: { rol: "PASE_LISTA", activo: true },
    select: { id: true, passwordHash: true, passwordPlano: true },
  });
  for (const usuario of usuarios) {
    if (usuario.passwordPlano && usuario.passwordPlano === clave) return usuario;
    if (await verifyPassword(clave, usuario.passwordHash)) return usuario;
  }
  return null;
}

export async function manejarEstadoPaseHttp(_req: Request, res: Response) {
  try {
    res.json(await estadoPaseLista());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al consultar el pase de lista" });
  }
}

export async function manejarEscaneoHttp(req: Request, res: Response) {
  try {
    const estado = await estadoPaseLista();
    if (!estado.abierto) {
      res.status(400).json({
        error: estado.mensaje ?? MENSAJE_SIN_PASE_ABIERTO,
        mensaje: estado.mensaje ?? MENSAJE_SIN_PASE_ABIERTO,
        codigo: "PASE_CERRADO",
        evento: estado.evento,
      });
      return;
    }

    const operador = await usuarioPaseListaPorClave(claveDesdeEscaneo(req));
    if (!operador) {
      res.status(403).json({
        error: MENSAJE_CLAVE_INCORRECTA,
        mensaje: MENSAJE_CLAVE_INCORRECTA,
        codigo: "CLAVE_INCORRECTA",
        evento: estado.evento,
      });
      return;
    }

    const resultado = await procesarEscaneoAsistencia({
      raw: rawCodigoDesdeEscaneo(req),
      registradoPorId: operador.id,
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
    evento: resultado.evento,
    dirigente: resultado.dirigente,
  };
}
