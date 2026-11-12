import { nombreCompleto } from "./dirigentes.js";
import { prisma } from "./prisma.js";
import { APP_BRAND } from "./brand.js";
import { obtenerConfigConvocatoria, telefonoMexico10Digitos } from "./comunicacion/config.js";
import { enviarWhatsApp } from "./comunicacion/telefono.js";

export type ResumenWhatsApp = {
  enviados: number;
  fallidos: number;
  omitidos: number;
  ultimoError?: string | null;
  configurado: boolean;
};

export function resumenWhatsAppVacio(): ResumenWhatsApp {
  const config = obtenerConfigConvocatoria();
  return {
    enviados: 0,
    fallidos: 0,
    omitidos: 0,
    ultimoError: null,
    configurado: config.whatsapp.habilitado,
  };
}

function urlNotificacionesApp(): string {
  const base =
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.FRONTEND_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/notificaciones`;
}

export function cuerpoWhatsAppNotificacion(
  dirigente: {
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
  },
  mensaje: string,
): string {
  const saludo = `Hola ${nombreCompleto(dirigente)},`;
  const texto = mensaje.trim();
  const cuerpo =
    texto.length > 0
      ? `Hay nueva información en ${APP_BRAND}:\n\n${texto}`
      : `Hay nueva información en ${APP_BRAND}. Entra a la plataforma para revisarla.`;
  const pie = `\n\nAbre ${APP_BRAND}: ${urlNotificacionesApp()}`;
  const completo = `${saludo}\n\n${cuerpo}${pie}`;
  return completo.length <= 1550 ? completo : `${saludo}\n\n${cuerpo.slice(0, 900)}…${pie}`;
}

/** Texto corto para plantillas Meta / ContentSid de Twilio (fuera de ventana 24 h). */
export function cuerpoWhatsAppNotificacionPlantilla(
  dirigente: {
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
  },
  mensaje: string,
): string {
  const nombre = nombreCompleto(dirigente);
  const resumen = mensaje.trim().replace(/\s+/g, " ").slice(0, 320);
  return `Hola ${nombre}. Hay nueva información en ${APP_BRAND}: ${resumen}. Revisa la aplicación.`;
}

async function enviarWhatsAppNotificacionCanal(input: {
  telefono: string;
  bodyLargo: string;
  bodyPlantilla: string;
}): Promise<{ ok: boolean; error?: string; proveedorId?: string }> {
  const corto = await enviarWhatsApp({ telefono: input.telefono, body: input.bodyPlantilla });
  if (corto.ok) return corto;
  return enviarWhatsApp({ telefono: input.telefono, body: input.bodyLargo });
}

/** WhatsApp a dirigentes ligados a los mismos usuarios que recibieron el aviso web. */
export async function enviarWhatsAppNotificacionDirigentes(input: {
  dirigenteIds: string[];
  mensaje: string;
}): Promise<ResumenWhatsApp> {
  const config = obtenerConfigConvocatoria();
  const resumen: ResumenWhatsApp = {
    enviados: 0,
    fallidos: 0,
    omitidos: 0,
    ultimoError: null,
    configurado: config.whatsapp.habilitado,
  };

  const ids = [...new Set(input.dirigenteIds.filter(Boolean))];
  if (ids.length === 0) return resumen;

  if (!config.whatsapp.habilitado) {
    resumen.omitidos = ids.length;
    resumen.ultimoError = "WhatsApp no configurado en el servidor (revisa variables en Railway).";
    return resumen;
  }

  const dirigentes = await prisma.dirigente.findMany({
    where: { id: { in: ids }, activo: true },
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
      telefonoCelular: true,
    },
  });

  const telefonosEnviados = new Set<string>();

  for (const d of dirigentes) {
    const celular = d.telefonoCelular?.trim() ?? "";
    const digits = telefonoMexico10Digitos(celular);

    if (!digits) {
      resumen.omitidos++;
      continue;
    }

    if (telefonosEnviados.has(digits)) {
      resumen.omitidos++;
      continue;
    }

    const bodyLargo = cuerpoWhatsAppNotificacion(d, input.mensaje);
    const bodyPlantilla = cuerpoWhatsAppNotificacionPlantilla(d, input.mensaje);
    const resultado = await enviarWhatsAppNotificacionCanal({
      telefono: celular,
      bodyLargo,
      bodyPlantilla,
    });
    telefonosEnviados.add(digits);

    if (resultado.ok) {
      resumen.enviados++;
    } else {
      resumen.fallidos++;
      resumen.ultimoError = resultado.error ?? "Error al enviar WhatsApp";
      console.error(
        `[notificacion][whatsapp] dirigente=${d.id} tel=${digits} ${resumen.ultimoError}`,
      );
    }
  }

  const noEncontrados = ids.length - dirigentes.length;
  if (noEncontrados > 0) resumen.omitidos += noEncontrados;

  return resumen;
}

/** Obtiene dirigentes con celular a partir de los usuarios que recibieron la notificación web. */
export async function dirigenteIdsDesdeUsuariosNotificacion(
  usuarioIds: string[],
): Promise<string[]> {
  if (usuarioIds.length === 0) return [];

  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: usuarioIds }, activo: true },
    select: {
      dirigenteId: true,
      rc: { select: { dirigenteId: true } },
      rg: { select: { dirigenteId: true } },
    },
  });

  const ids = new Set<string>();
  for (const u of usuarios) {
    if (u.dirigenteId) ids.add(u.dirigenteId);
    if (u.rc?.dirigenteId) ids.add(u.rc.dirigenteId);
    if (u.rg?.dirigenteId) ids.add(u.rg.dirigenteId);
  }
  return [...ids];
}
