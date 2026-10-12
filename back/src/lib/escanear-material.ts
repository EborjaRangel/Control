import { Prisma } from "../generated/prisma/client.js";
import type { Request, Response } from "express";
import { prisma } from "./prisma.js";
import { codigoQrDesdeTextoQr } from "./codigo-qr.js";
import { nombreCompleto } from "./dirigentes.js";
import { registrarAuditoria } from "./audit.js";
import { verifyPassword } from "./auth.js";
import {
  claveDesdeEscaneo,
  rawCodigoDesdeEscaneo,
} from "./escanear-asistencia.js";
import {
  mensajeFueraVigencia,
  vigenciaEntregaMaterialActiva,
} from "./material-entrega.js";

export const MENSAJE_MATERIAL_ENTREGADO = "Material entregado";
export const MENSAJE_MATERIAL_DUPLICADO = "Este dirigente ya recogió el material de este evento";
export const MENSAJE_SIN_ENTREGA_ABIERTA = "No hay una entrega de material abierta";
export const MENSAJE_CLAVE_INCORRECTA = "Código incorrecto";
export const MENSAJE_QR_INVALIDO = "El QR es inválido";
export const MENSAJE_NO_CONVOCADO = "El dirigente no está en la lista de este evento";

export type EventoEntregaResumen = { id: string; titulo: string };

export type EstadoEntregaMaterial = {
  abierto: boolean;
  evento: EventoEntregaResumen | null;
  mensaje: string | null;
};

export type ResultadoEscaneoMaterial =
  | {
      ok: true;
      status: 201;
      codigo: "MATERIAL_ENTREGADO";
      mensaje: string;
      evento: EventoEntregaResumen;
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
      codigo:
        | "QR_INVALIDO"
        | "ENTREGA_CERRADA"
        | "MATERIAL_DUPLICADO"
        | "CLAVE_INCORRECTA"
        | "NO_CONVOCADO";
      mensaje: string;
      evento?: EventoEntregaResumen;
      dirigente?: { id: string; nombreCompleto: string };
    };

export async function estadoEntregaMaterial(): Promise<EstadoEntregaMaterial> {
  const abierto = await prisma.eventoEntregaMaterial.findFirst({
    where: { estado: "ABIERTO" },
    orderBy: [{ abiertoAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, titulo: true, fechaInicio: true, fechaFin: true },
  });

  if (abierto) {
    if (!vigenciaEntregaMaterialActiva(abierto.fechaInicio, abierto.fechaFin)) {
      return {
        abierto: false,
        evento: { id: abierto.id, titulo: abierto.titulo },
        mensaje: mensajeFueraVigencia(abierto.titulo),
      };
    }
    return { abierto: true, evento: { id: abierto.id, titulo: abierto.titulo }, mensaje: null };
  }

  const cerrado = await prisma.eventoEntregaMaterial.findFirst({
    where: { estado: "CERRADO" },
    orderBy: [{ cerradoAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, titulo: true },
  });

  if (cerrado) {
    return {
      abierto: false,
      evento: cerrado,
      mensaje: `Entrega de material cerrada: ${cerrado.titulo}`,
    };
  }

  return { abierto: false, evento: null, mensaje: MENSAJE_SIN_ENTREGA_ABIERTA };
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

export async function procesarEscaneoMaterial(input: {
  raw: string;
  eventoId?: string;
  registradoPorId?: string | null;
  req?: Request;
}): Promise<ResultadoEscaneoMaterial> {
  const codigoQr = codigoQrDesdeTextoQr(input.raw);
  if (!codigoQr) {
    return { ok: false, status: 404, codigo: "QR_INVALIDO", mensaje: MENSAJE_QR_INVALIDO };
  }

  const dirigente = await prisma.dirigente.findUnique({ where: { codigoQr } });
  if (!dirigente || !dirigente.activo || dirigente.status !== "ACTIVO") {
    return { ok: false, status: 404, codigo: "QR_INVALIDO", mensaje: MENSAJE_QR_INVALIDO };
  }

  const dirigenteResumen = {
    id: dirigente.id,
    nombreCompleto: nombreCompleto(dirigente),
  };

  let evento = input.eventoId
    ? await prisma.eventoEntregaMaterial.findUnique({ where: { id: input.eventoId } })
    : null;

  if (input.eventoId) {
    if (!evento) return { ok: false, status: 404, codigo: "QR_INVALIDO", mensaje: MENSAJE_QR_INVALIDO };
    if (evento.estado !== "ABIERTO") {
      return {
        ok: false,
        status: 400,
        codigo: "ENTREGA_CERRADA",
        mensaje: `Entrega de material cerrada: ${evento.titulo}`,
        evento: { id: evento.id, titulo: evento.titulo },
      };
    }
    if (!vigenciaEntregaMaterialActiva(evento.fechaInicio, evento.fechaFin)) {
      return {
        ok: false,
        status: 400,
        codigo: "ENTREGA_CERRADA",
        mensaje: mensajeFueraVigencia(evento.titulo),
        evento: { id: evento.id, titulo: evento.titulo },
      };
    }
  } else {
    const abiertos = await prisma.eventoEntregaMaterial.findMany({
      where: { estado: "ABIERTO" },
      orderBy: [{ abiertoAt: "desc" }, { createdAt: "desc" }],
    });
    const vigentes = abiertos.filter((e) => vigenciaEntregaMaterialActiva(e.fechaInicio, e.fechaFin));
    if (vigentes.length === 0) {
      const estado = await estadoEntregaMaterial();
      return {
        ok: false,
        status: 400,
        codigo: "ENTREGA_CERRADA",
        mensaje: estado.mensaje ?? MENSAJE_SIN_ENTREGA_ABIERTA,
        evento: estado.evento ?? undefined,
      };
    }

    const participaciones = await prisma.eventoEntregaMaterialDirigente.findMany({
      where: {
        dirigenteId: dirigente.id,
        eventoId: { in: vigentes.map((e) => e.id) },
      },
    });
    const idsParticipa = new Set(participaciones.map((p) => p.eventoId));
    evento = vigentes.find((e) => idsParticipa.has(e.id)) ?? null;
    if (!evento) {
      return {
        ok: false,
        status: 404,
        codigo: "NO_CONVOCADO",
        mensaje: MENSAJE_NO_CONVOCADO,
        dirigente: dirigenteResumen,
      };
    }
  }

  const convocado = await prisma.eventoEntregaMaterialDirigente.findUnique({
    where: { eventoId_dirigenteId: { eventoId: evento.id, dirigenteId: dirigente.id } },
  });
  if (!convocado) {
    return {
      ok: false,
      status: 404,
      codigo: "NO_CONVOCADO",
      mensaje: MENSAJE_NO_CONVOCADO,
      evento: { id: evento.id, titulo: evento.titulo },
      dirigente: dirigenteResumen,
    };
  }

  const existente = await prisma.registroEntregaMaterial.findUnique({
    where: { eventoId_dirigenteId: { eventoId: evento.id, dirigenteId: dirigente.id } },
  });
  if (existente) {
    return {
      ok: false,
      status: 409,
      codigo: "MATERIAL_DUPLICADO",
      mensaje: MENSAJE_MATERIAL_DUPLICADO,
      evento: { id: evento.id, titulo: evento.titulo },
      dirigente: dirigenteResumen,
    };
  }

  const asignaciones = await prisma.asignacionMaterialEntrega.findMany({
    where: { eventoId: evento.id, dirigenteId: dirigente.id },
  });
  if (asignaciones.length === 0) {
    return {
      ok: false,
      status: 400,
      codigo: "NO_CONVOCADO",
      mensaje: "No hay material asignado para este dirigente",
      evento: { id: evento.id, titulo: evento.titulo },
      dirigente: dirigenteResumen,
    };
  }

  try {
    const registro = await prisma.registroEntregaMaterial.create({
      data: {
        eventoId: evento.id,
        dirigenteId: dirigente.id,
        registradoPorId: input.registradoPorId ?? null,
        lineas: {
          create: asignaciones.map((a) => ({
            descripcion: a.descripcion,
            fotoUrl: a.fotoUrl,
            cantidad: a.cantidad,
          })),
        },
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
        registradoPor: { select: { id: true, username: true } },
      },
    });

    await registrarAuditoria(input.req, {
      accion: "CREATE",
      entidad: "RegistroEntregaMaterial",
      entidadId: registro.id,
      entidadLabel: nombreCompleto(registro.dirigente),
      dirigenteId: registro.dirigente.id,
      despues: {
        eventoId: evento.id,
        eventoTitulo: evento.titulo,
        lineas: asignaciones.length,
        origen: input.eventoId ? "pase_lista" : "camara_qr",
      },
    });

    return {
      ok: true,
      status: 201,
      codigo: "MATERIAL_ENTREGADO",
      mensaje: MENSAJE_MATERIAL_ENTREGADO,
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
      return {
        ok: false,
        status: 409,
        codigo: "MATERIAL_DUPLICADO",
        mensaje: MENSAJE_MATERIAL_DUPLICADO,
        evento: { id: evento.id, titulo: evento.titulo },
        dirigente: dirigenteResumen,
      };
    }
    throw error;
  }
}

export function cuerpoRespuestaEscaneoMaterial(resultado: ResultadoEscaneoMaterial) {
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

export async function manejarEstadoEntregaMaterialHttp(_req: Request, res: Response) {
  try {
    res.json(await estadoEntregaMaterial());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al consultar entrega de material" });
  }
}

export async function manejarEscaneoMaterialHttp(req: Request, res: Response) {
  try {
    const estado = await estadoEntregaMaterial();
    if (!estado.abierto) {
      res.status(400).json({
        error: estado.mensaje ?? MENSAJE_SIN_ENTREGA_ABIERTA,
        mensaje: estado.mensaje ?? MENSAJE_SIN_ENTREGA_ABIERTA,
        codigo: "ENTREGA_CERRADA",
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

    const resultado = await procesarEscaneoMaterial({
      raw: rawCodigoDesdeEscaneo(req),
      registradoPorId: operador.id,
      req,
    });
    res.status(resultado.status).json(cuerpoRespuestaEscaneoMaterial(resultado));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al registrar entrega",
      mensaje: "Error al registrar entrega",
    });
  }
}
