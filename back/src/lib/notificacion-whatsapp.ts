import { nombreCompleto } from "./dirigentes.js";
import { prisma } from "./prisma.js";
import { APP_BRAND } from "./brand.js";
import { obtenerConfigConvocatoria, telefonoMexico10Digitos } from "./comunicacion/config.js";
import { enviarWhatsApp } from "./comunicacion/telefono.js";

export type ResumenWhatsApp = {
  enviados: number;
  fallidos: number;
  omitidos: number;
};

export function resumenWhatsAppVacio(): ResumenWhatsApp {
  return { enviados: 0, fallidos: 0, omitidos: 0 };
}

function urlNotificacionesApp(): string {
  const base =
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.FRONTEND_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/notificaciones`;
}

function dirigenteTieneRedWhatsApp(
  redes: ReadonlyArray<{ descripcion: string; cuenta: string }>,
): boolean {
  return redes.some((r) => {
    const tipo = r.descripcion.trim().toLowerCase();
    return tipo === "whatsapp" && r.cuenta.trim().length > 0;
  });
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

/** WhatsApp a dirigentes con celular válido y red social WhatsApp en su ficha. */
export async function enviarWhatsAppNotificacionDirigentes(input: {
  dirigenteIds: string[];
  mensaje: string;
}): Promise<ResumenWhatsApp> {
  const resumen = resumenWhatsAppVacio();
  const ids = [...new Set(input.dirigenteIds.filter(Boolean))];
  if (ids.length === 0) return resumen;

  const config = obtenerConfigConvocatoria();
  if (!config.whatsapp.habilitado) {
    resumen.omitidos = ids.length;
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
      redesSociales: { select: { descripcion: true, cuenta: true } },
    },
  });

  const telefonosEnviados = new Set<string>();

  for (const d of dirigentes) {
    const celular = d.telefonoCelular?.trim() ?? "";
    const digits = telefonoMexico10Digitos(celular);

    if (!dirigenteTieneRedWhatsApp(d.redesSociales)) {
      resumen.omitidos++;
      continue;
    }

    if (!digits) {
      resumen.omitidos++;
      continue;
    }

    if (telefonosEnviados.has(digits)) {
      resumen.omitidos++;
      continue;
    }

    const body = cuerpoWhatsAppNotificacion(d, input.mensaje);
    const resultado = await enviarWhatsApp({ telefono: celular, body });
    telefonosEnviados.add(digits);

    if (resultado.ok) resumen.enviados++;
    else resumen.fallidos++;
  }

  const noEncontrados = ids.length - dirigentes.length;
  if (noEncontrados > 0) resumen.omitidos += noEncontrados;

  return resumen;
}
