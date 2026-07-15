import type { CanalComunicacion, EstadoEnvioComunicacion } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { nombreCompleto } from "../dirigentes.js";
import { filtroDirigentesElegibles, obtenerEvento } from "../eventos-asistencia.js";
import {
  convocatoriaListaParaEnvio,
  mensajeConfigConvocatoriaIncompleta,
} from "./config.js";
import { enviarCorreo } from "./email.js";
import {
  asuntoCorreoEvento,
  contenidoParaDirigente,
  cuerpoHtmlConvocatoria,
  cuerpoTelefonoConvocatoria,
  cuerpoTextoConvocatoria,
  type DirigenteNotificacion,
} from "./mensaje-evento.js";
import { enviarSms, enviarWhatsApp } from "./telefono.js";

export type ResumenCanal = {
  enviados: number;
  fallidos: number;
  omitidos: number;
};

export type ResumenConvocatoriaEvento = {
  eventoId: string;
  totalDirigentes: number;
  email: ResumenCanal;
  sms: ResumenCanal;
  whatsapp: ResumenCanal;
};

/** @deprecated usar ResumenConvocatoriaEvento */
export type ResumenNotificacionEvento = ResumenConvocatoriaEvento;

export type OpcionesConvocatoriaEvento = {
  mensaje: string;
};

function resumenCanalVacio(): ResumenCanal {
  return { enviados: 0, fallidos: 0, omitidos: 0 };
}

async function registrarEnvio(input: {
  eventoId: string;
  dirigenteId: string;
  canal: CanalComunicacion;
  destino: string;
  estado: EstadoEnvioComunicacion;
  error?: string;
  proveedorId?: string;
}) {
  await prisma.envioComunicacion.create({
    data: {
      eventoId: input.eventoId,
      dirigenteId: input.dirigenteId,
      canal: input.canal,
      destino: input.destino,
      estado: input.estado,
      error: input.error ?? null,
      proveedorId: input.proveedorId ?? null,
    },
  });
}

async function enviarCanalTelefono(input: {
  eventoId: string;
  dirigenteId: string;
  telefono: string;
  body: string;
  canal: "SMS" | "WHATSAPP";
  resumen: ResumenCanal;
  enviar: () => Promise<{ ok: boolean; error?: string; proveedorId?: string }>;
}) {
  const resultado = await input.enviar();
  if (resultado.ok) input.resumen.enviados++;
  else input.resumen.fallidos++;
  await registrarEnvio({
    eventoId: input.eventoId,
    dirigenteId: input.dirigenteId,
    canal: input.canal,
    destino: input.telefono.trim(),
    estado: resultado.ok ? "ENVIADO" : "FALLIDO",
    error: resultado.error,
    proveedorId: resultado.proveedorId,
  });
}

export async function enviarConvocatoriaEvento(
  eventoId: string,
  opciones: OpcionesConvocatoriaEvento,
): Promise<ResumenConvocatoriaEvento> {
  const mensaje = opciones.mensaje.trim();
  if (mensaje.length < 10) {
    throw new Error("El mensaje de convocatoria es obligatorio");
  }

  if (!convocatoriaListaParaEnvio()) {
    throw new Error(mensajeConfigConvocatoriaIncompleta());
  }

  const evento = await obtenerEvento(eventoId);
  if (!evento) {
    throw new Error("Evento no encontrado");
  }

  const dirigentes = await prisma.dirigente.findMany({
    where: filtroDirigentesElegibles(evento),
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
      correo: true,
      telefonoCelular: true,
      codigoQr: true,
    },
    orderBy: [{ primerApellido: "asc" }, { nombre: "asc" }],
  });

  const resumen: ResumenConvocatoriaEvento = {
    eventoId,
    totalDirigentes: dirigentes.length,
    email: resumenCanalVacio(),
    sms: resumenCanalVacio(),
    whatsapp: resumenCanalVacio(),
  };

  for (const d of dirigentes) {
    const contenido = contenidoParaDirigente(evento, d as DirigenteNotificacion);
    const dir = d as DirigenteNotificacion;

    if (!d.correo?.trim()) {
      resumen.email.omitidos++;
      await registrarEnvio({
        eventoId,
        dirigenteId: d.id,
        canal: "EMAIL",
        destino: "",
        estado: "OMITIDO",
        error: "Sin correo electrónico",
      });
    } else {
      const resultado = await enviarCorreo({
        to: d.correo.trim(),
        subject: asuntoCorreoEvento(contenido),
        text: cuerpoTextoConvocatoria(dir, contenido, mensaje),
        html: cuerpoHtmlConvocatoria(dir, contenido, mensaje),
      });
      if (resultado.ok) resumen.email.enviados++;
      else resumen.email.fallidos++;
      await registrarEnvio({
        eventoId,
        dirigenteId: d.id,
        canal: "EMAIL",
        destino: d.correo.trim(),
        estado: resultado.ok ? "ENVIADO" : "FALLIDO",
        error: resultado.error,
        proveedorId: resultado.proveedorId,
      });
    }

    const bodyTelefono = cuerpoTelefonoConvocatoria(dir, contenido, mensaje);

    if (!d.telefonoCelular?.trim()) {
      resumen.sms.omitidos++;
      resumen.whatsapp.omitidos++;
      await registrarEnvio({
        eventoId,
        dirigenteId: d.id,
        canal: "SMS",
        destino: "",
        estado: "OMITIDO",
        error: "Sin teléfono celular",
      });
      await registrarEnvio({
        eventoId,
        dirigenteId: d.id,
        canal: "WHATSAPP",
        destino: "",
        estado: "OMITIDO",
        error: "Sin teléfono celular",
      });
    } else {
      await enviarCanalTelefono({
        eventoId,
        dirigenteId: d.id,
        telefono: d.telefonoCelular,
        body: bodyTelefono,
        canal: "SMS",
        resumen: resumen.sms,
        enviar: () => enviarSms({ telefono: d.telefonoCelular, body: bodyTelefono }),
      });
      await enviarCanalTelefono({
        eventoId,
        dirigenteId: d.id,
        telefono: d.telefonoCelular,
        body: bodyTelefono,
        canal: "WHATSAPP",
        resumen: resumen.whatsapp,
        enviar: () => enviarWhatsApp({ telefono: d.telefonoCelular, body: bodyTelefono }),
      });
    }
  }

  return resumen;
}

/** @deprecated usar enviarConvocatoriaEvento */
export const notificarEventoDirigentes = enviarConvocatoriaEvento;

export async function resumenEnviosEvento(eventoId: string) {
  const [porCanal, porEstado, ultimos] = await Promise.all([
    prisma.envioComunicacion.groupBy({
      by: ["canal", "estado"],
      where: { eventoId },
      _count: { _all: true },
    }),
    prisma.envioComunicacion.count({ where: { eventoId } }),
    prisma.envioComunicacion.findMany({
      where: { eventoId },
      orderBy: { enviadoAt: "desc" },
      take: 50,
      include: {
        dirigente: {
          select: {
            id: true,
            nombre: true,
            primerApellido: true,
            segundoApellido: true,
          },
        },
      },
    }),
  ]);

  return {
    total: porEstado,
    porCanal: porCanal.map((g) => ({
      canal: g.canal,
      estado: g.estado,
      count: g._count._all,
    })),
    ultimos: ultimos.map((e) => ({
      id: e.id,
      canal: e.canal,
      destino: e.destino,
      estado: e.estado,
      error: e.error,
      enviadoAt: e.enviadoAt.toISOString(),
      dirigente: {
        id: e.dirigente.id,
        nombreCompleto: nombreCompleto(e.dirigente),
      },
    })),
  };
}
