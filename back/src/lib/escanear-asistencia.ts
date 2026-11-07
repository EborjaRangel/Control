import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { codigoQrDesdeTextoQr } from "./codigo-qr.js";
import { nombreCompleto } from "./dirigentes.js";
import { dirigenteEsElegible } from "./eventos-asistencia.js";
import { registrarAuditoria } from "./audit.js";
import { verifyPassword } from "./auth.js";
import type { Request, Response } from "express";

export const MENSAJE_QR_INVALIDO = "El QR es inválido";
export const MENSAJE_ASISTENCIA_TOMADA = "Asistencia registrada";
export const MENSAJE_ASISTENCIA_DUPLICADA = "Es imposible registrar más de una asistencia";
export const MENSAJE_MOVILIZACION_REGISTRADA = "Movilización registrada";
export const MENSAJE_CANTIDAD_MOVILIZACION = "Indica cuántas personas movilizas (número entero mayor que cero)";
export const MENSAJE_SIN_PASE_ABIERTO = "No hay un pase de lista abierto";
export const MENSAJE_CLAVE_INCORRECTA = "Código incorrecto";
export const MENSAJE_DIRIGENTE_NO_ELEGIBLE =
  "Este dirigente no está en el alcance del evento (territorio o tipo de dirigente)";
export const MENSAJE_DIRIGENTE_INACTIVO = "El dirigente no está activo";

const CANTIDAD_MOV_MAX = 100_000;

export function mensajePaseCerrado(titulo: string) {
  return `Pase de lista ya cerrado del evento ${titulo}`;
}

export type EventoPaseResumen = {
  id: string;
  titulo: string;
  tipoOperacion: "PASE_LISTA" | "MOVILIZACION";
};

export type EstadoPaseLista = {
  abierto: boolean;
  evento: EventoPaseResumen | null;
  mensaje: string | null;
};

export type ResultadoEscaneoAsistencia =
  | {
      ok: true;
      status: 201;
      codigo: "ASISTENCIA_TOMADA" | "MOVILIZACION_REGISTRADA";
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
      cantidad?: number;
      totalMovilizados?: number;
    }
  | {
      ok: false;
      status: 400 | 403 | 404 | 409;
      codigo:
        | "QR_INVALIDO"
        | "PASE_CERRADO"
        | "ASISTENCIA_DUPLICADA"
        | "CLAVE_INCORRECTA"
        | "CANTIDAD_INVALIDA"
        | "DIRIGENTE_NO_ELEGIBLE";
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

function resultadoNoElegible(
  dirigente: { id: string; nombreCompleto: string },
  evento?: EventoPaseResumen,
): ResultadoEscaneoAsistencia {
  return {
    ok: false,
    status: 403,
    codigo: "DIRIGENTE_NO_ELEGIBLE",
    mensaje: MENSAJE_DIRIGENTE_NO_ELEGIBLE,
    dirigente,
    evento,
  };
}

function resultadoDuplicado(
  dirigente: { id: string; nombreCompleto: string },
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

export function cantidadMovilizacionDesdeCuerpo(body: unknown): number | undefined {
  if (body == null || typeof body !== "object") return undefined;
  const d = body as Record<string, unknown>;
  for (const key of ["cantidad", "movilizados", "personas"]) {
    const v = d[key];
    if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number.parseInt(v.trim(), 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

export async function procesarEscaneoAsistencia(input: {
  raw: string;
  eventoId?: string;
  registradoPorId?: string | null;
  cantidad?: number;
  req?: Request;
}): Promise<ResultadoEscaneoAsistencia> {
  const raw = input.raw?.trim() ?? "";
  const codigoQr = codigoQrDesdeTextoQr(raw) ?? (raw.length > 0 ? raw : null);
  if (!codigoQr) return resultadoInvalido();

  const dirigente = await prisma.dirigente.findUnique({
    where: { codigoQr },
  });
  if (!dirigente) return resultadoInvalido();
  if (!dirigente.activo || dirigente.status !== "ACTIVO") {
    return {
      ok: false,
      status: 403,
      codigo: "DIRIGENTE_NO_ELEGIBLE",
      mensaje: MENSAJE_DIRIGENTE_INACTIVO,
      dirigente: { id: dirigente.id, nombreCompleto: nombreCompleto(dirigente) },
    };
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
        evento: { id: evento.id, titulo: evento.titulo, tipoOperacion: evento.tipoOperacion },
      };
    }
    if (!dirigenteEsElegible(dirigente, evento)) {
      return resultadoNoElegible(dirigenteResumen, {
        id: evento.id,
        titulo: evento.titulo,
        tipoOperacion: evento.tipoOperacion,
      });
    }
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
    if (!evento) {
      const ref = abiertos[0];
      return resultadoNoElegible(
        dirigenteResumen,
        ref
          ? { id: ref.id, titulo: ref.titulo, tipoOperacion: ref.tipoOperacion }
          : undefined,
      );
    }
  }

  let cantidadMov: number | undefined = input.cantidad;
  if (evento.tipoOperacion === "MOVILIZACION") {
    if (cantidadMov == null || !Number.isInteger(cantidadMov) || cantidadMov < 1 || cantidadMov > CANTIDAD_MOV_MAX) {
      return {
        ok: false,
        status: 400,
        codigo: "CANTIDAD_INVALIDA",
        mensaje: MENSAJE_CANTIDAD_MOVILIZACION,
        evento: { id: evento.id, titulo: evento.titulo, tipoOperacion: evento.tipoOperacion },
        dirigente: dirigenteResumen,
      };
    }
  }

  if (evento.tipoOperacion === "PASE_LISTA") {
    const existente = await prisma.registroAsistencia.findFirst({
      where: { eventoId: evento.id, dirigenteId: dirigente.id },
    });
    if (existente) {
      return resultadoDuplicado(dirigenteResumen, {
        id: evento.id,
        titulo: evento.titulo,
        tipoOperacion: evento.tipoOperacion,
      });
    }
  }

  const cantidadRegistro = evento.tipoOperacion === "MOVILIZACION" ? cantidadMov! : 1;

  try {
    const registro = await prisma.registroAsistencia.create({
      data: {
        eventoId: evento.id,
        dirigenteId: dirigente.id,
        cantidad: cantidadRegistro,
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
        registradoPor: {
          select: { id: true, username: true, rol: true },
        },
      },
    });

    let totalMovilizados: number | undefined;
    if (evento.tipoOperacion === "MOVILIZACION") {
      const sum = await prisma.registroAsistencia.aggregate({
        where: { eventoId: evento.id, dirigenteId: dirigente.id },
        _sum: { cantidad: true },
      });
      totalMovilizados = sum._sum.cantidad ?? cantidadRegistro;
    }

    await registrarAuditoria(input.req, {
      accion: "CREATE",
      entidad: "RegistroAsistencia",
      entidadId: registro.id,
      entidadLabel: nombreCompleto(registro.dirigente),
      dirigenteId: registro.dirigente.id,
      despues: {
        eventoId: evento.id,
        eventoTitulo: evento.titulo,
        tipoOperacion: evento.tipoOperacion,
        cantidad: cantidadRegistro,
        totalMovilizadosDirigente: totalMovilizados,
        dirigenteId: registro.dirigente.id,
        dirigenteNombre: nombreCompleto(registro.dirigente),
        registradoPorId: registro.registradoPorId,
        registradoPorUsername: registro.registradoPor?.username ?? null,
        origen: input.eventoId ? "panel_asistencia" : "camara_qr",
      },
    });

    if (evento.tipoOperacion === "MOVILIZACION") {
      return {
        ok: true,
        status: 201,
        codigo: "MOVILIZACION_REGISTRADA",
        mensaje: MENSAJE_MOVILIZACION_REGISTRADA,
        evento: { id: evento.id, titulo: evento.titulo },
        dirigente: {
          id: registro.dirigente.id,
          nombreCompleto: nombreCompleto(registro.dirigente),
          tipo: registro.dirigente.tipo,
          colonia: registro.dirigente.colonia,
          seccionElectoral: registro.dirigente.seccionElectoral,
        },
        registradoAt: registro.registradoAt.toISOString(),
        cantidad: cantidadRegistro,
        totalMovilizados,
      };
    }

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
      if (evento.tipoOperacion === "PASE_LISTA") {
        return resultadoDuplicado(dirigenteResumen, {
          id: evento.id,
          titulo: evento.titulo,
          tipoOperacion: evento.tipoOperacion,
        });
      }
      console.error(
        "Conflicto único en movilización (eventoId, dirigenteId): falta DROP INDEX RegistroAsistencia_eventoId_dirigenteId_key",
        error,
      );
      throw new Error(
        "Base de datos sin migración de movilización: índice único RegistroAsistencia_eventoId_dirigenteId_key",
      );
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
    select: { id: true, titulo: true, tipoOperacion: true },
  });
  if (abierto) {
    return {
      abierto: true,
      evento: {
        id: abierto.id,
        titulo: abierto.titulo,
        tipoOperacion: abierto.tipoOperacion,
      },
      mensaje: null,
    };
  }

  const cerrado = await prisma.eventoAsistencia.findFirst({
    where: { estado: "CERRADO" },
    orderBy: [{ cerradoAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, titulo: true, tipoOperacion: true },
  });
  if (cerrado) {
    return {
      abierto: false,
      evento: {
        id: cerrado.id,
        titulo: cerrado.titulo,
        tipoOperacion: cerrado.tipoOperacion,
      },
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
      eventoId: estado.evento!.id,
      registradoPorId: operador.id,
      cantidad: cantidadMovilizacionDesdeCuerpo(req.body),
      req,
    });
    res.status(resultado.status).json(cuerpoRespuestaEscaneo(resultado));
  } catch (error) {
    console.error(error);
    const msg =
      error instanceof Error && error.message.includes("RegistroAsistencia_eventoId_dirigenteId_key")
        ? "Error de base de datos: falta aplicar la migración de movilización en el servidor."
        : "Error al registrar asistencia";
    res.status(500).json({
      error: msg,
      mensaje: msg,
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
      ...(resultado.cantidad != null ? { cantidad: resultado.cantidad } : {}),
      ...(resultado.totalMovilizados != null ? { totalMovilizados: resultado.totalMovilizados } : {}),
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
