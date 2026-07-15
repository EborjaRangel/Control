import type { EventoAsistencia } from "../../generated/prisma/client.js";
import { urlQrAsistencia } from "../codigo-qr.js";
import { nombreCompleto } from "../dirigentes.js";
import { etiquetaAlcanceEvento } from "../eventos-asistencia.js";

export type DirigenteNotificacion = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  correo: string;
  telefonoCelular: string;
  codigoQr: string;
};

export type ContenidoEvento = {
  titulo: string;
  fechaTexto: string;
  hora: string;
  lugar: string;
  alcanceLabel: string;
  urlEvento: string;
  urlQr: string;
};

export function fechaEventoTexto(fecha: Date): string {
  return fecha.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Mexico_City",
  });
}

export function urlEventoAsistencia(eventoId: string): string {
  const base =
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.FRONTEND_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/asistencia/eventos/${eventoId}`;
}

export function contenidoEvento(
  evento: EventoAsistencia & {
    unidadTerritorial?: { clave: string; nombre: string } | null;
  },
): ContenidoEvento {
  return {
    titulo: evento.titulo,
    fechaTexto: fechaEventoTexto(evento.fecha),
    hora: evento.hora,
    lugar: evento.lugar,
    alcanceLabel: etiquetaAlcanceEvento(evento),
    urlEvento: urlEventoAsistencia(evento.id),
    urlQr: "",
  };
}

export function contenidoParaDirigente(
  evento: EventoAsistencia & {
    unidadTerritorial?: { clave: string; nombre: string } | null;
  },
  dirigente: DirigenteNotificacion,
): ContenidoEvento {
  return {
    ...contenidoEvento(evento),
    urlQr: urlQrAsistencia(dirigente.codigoQr),
  };
}

export function asuntoCorreoEvento(c: ContenidoEvento): string {
  return `Convocatoria: ${c.titulo} — ${c.fechaTexto}`;
}

export function cuerpoTextoConvocatoria(
  dirigente: DirigenteNotificacion,
  c: ContenidoEvento,
  mensaje: string,
): string {
  return [
    `Hola ${nombreCompleto(dirigente)},`,
    "",
    mensaje.trim(),
    "",
    `Evento: ${c.titulo}`,
    `Fecha: ${c.fechaTexto}`,
    `Hora: ${c.hora}`,
    `Lugar: ${c.lugar}`,
    "",
    "Presenta tu código QR al llegar para registrar tu asistencia:",
    c.urlQr,
    "",
    "— Control de dirigentes · Coyoacán",
  ].join("\n");
}

export function cuerpoHtmlConvocatoria(
  dirigente: DirigenteNotificacion,
  c: ContenidoEvento,
  mensaje: string,
): string {
  const parrafos = mensaje
    .trim()
    .split(/\n+/)
    .map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p)}</p>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:system-ui,sans-serif;color:#1a1a1a;line-height:1.5;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hola <strong>${escapeHtml(nombreCompleto(dirigente))}</strong>,</p>
  <div style="border-left:4px solid #7c3aed;padding:12px 16px;margin:16px 0;background:#faf5ff;border-radius:0 8px 8px 0;">
    ${parrafos}
  </div>
  <div style="padding:12px 16px;margin:16px 0;background:#f9fafb;border-radius:8px;font-size:14px;">
    <p style="margin:0 0 8px;font-weight:700;">${escapeHtml(c.titulo)}</p>
    <p style="margin:4px 0;"><strong>Fecha:</strong> ${escapeHtml(c.fechaTexto)}</p>
    <p style="margin:4px 0;"><strong>Hora:</strong> ${escapeHtml(c.hora)}</p>
    <p style="margin:4px 0;"><strong>Lugar:</strong> ${escapeHtml(c.lugar)}</p>
  </div>
  <p>Presenta tu <strong>código QR único</strong> al llegar.</p>
  <p>
    <a href="${escapeHtml(c.urlQr)}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Ver mi QR de asistencia</a>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="font-size:12px;color:#888;">Control de dirigentes · Coyoacán</p>
</body>
</html>`;
}

export function cuerpoTelefonoConvocatoria(
  dirigente: DirigenteNotificacion,
  c: ContenidoEvento,
  mensaje: string,
): string {
  const base = cuerpoTextoConvocatoria(dirigente, c, mensaje);
  if (base.length <= 1500) return base;
  return [
    `Hola ${nombreCompleto(dirigente)},`,
    mensaje.trim().slice(0, 400),
    `${c.titulo} · ${c.fechaTexto} ${c.hora}`,
    `Lugar: ${c.lugar}`,
    `QR: ${c.urlQr}`,
  ].join("\n");
}

/** @deprecated */
export function cuerpoTextoEvento(
  dirigente: DirigenteNotificacion,
  c: ContenidoEvento,
  mensajeAdicional?: string,
): string {
  const lineas = [
    `Hola ${nombreCompleto(dirigente)},`,
    "",
    "Te invitamos al siguiente evento:",
    "",
    `📌 ${c.titulo}`,
    `📅 ${c.fechaTexto}`,
    `🕐 ${c.hora}`,
    `📍 ${c.lugar}`,
    `👥 ${c.alcanceLabel}`,
    "",
    "Presenta tu código QR único al llegar para registrar tu asistencia.",
    `Enlace de verificación: ${c.urlQr}`,
    `Detalle del evento: ${c.urlEvento}`,
  ];
  if (mensajeAdicional?.trim()) {
    lineas.push("", mensajeAdicional.trim());
  }
  lineas.push("", "— Control de dirigentes · Coyoacán");
  return lineas.join("\n");
}

export function cuerpoHtmlEvento(
  dirigente: DirigenteNotificacion,
  c: ContenidoEvento,
  mensajeAdicional?: string,
): string {
  const extra = mensajeAdicional?.trim()
    ? `<p style="margin:16px 0;padding:12px;background:#f5f5f5;border-radius:8px;">${escapeHtml(mensajeAdicional.trim())}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:system-ui,sans-serif;color:#1a1a1a;line-height:1.5;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hola <strong>${escapeHtml(nombreCompleto(dirigente))}</strong>,</p>
  <p>Te invitamos al siguiente evento:</p>
  <div style="border-left:4px solid #7c3aed;padding:12px 16px;margin:16px 0;background:#faf5ff;border-radius:0 8px 8px 0;">
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;">${escapeHtml(c.titulo)}</p>
    <p style="margin:4px 0;"><strong>Fecha:</strong> ${escapeHtml(c.fechaTexto)}</p>
    <p style="margin:4px 0;"><strong>Hora:</strong> ${escapeHtml(c.hora)}</p>
    <p style="margin:4px 0;"><strong>Lugar:</strong> ${escapeHtml(c.lugar)}</p>
    <p style="margin:4px 0;"><strong>Alcance:</strong> ${escapeHtml(c.alcanceLabel)}</p>
  </div>
  ${extra}
  <p>Presenta tu <strong>código QR único</strong> al llegar para registrar tu asistencia.</p>
  <p>
    <a href="${escapeHtml(c.urlQr)}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Ver mi QR de asistencia</a>
  </p>
  <p style="font-size:14px;color:#666;">
    <a href="${escapeHtml(c.urlEvento)}">Detalle del evento</a>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="font-size:12px;color:#888;">Control de dirigentes · Coyoacán</p>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function cuerpoSmsEvento(
  dirigente: DirigenteNotificacion,
  c: ContenidoEvento,
  mensajeAdicional?: string,
): string {
  const base = cuerpoTextoEvento(dirigente, c, mensajeAdicional);
  if (base.length <= 1500) return base;
  return [
    `Hola ${nombreCompleto(dirigente)},`,
    `Evento: ${c.titulo}`,
    `${c.fechaTexto} ${c.hora}`,
    `Lugar: ${c.lugar}`,
    `QR: ${c.urlQr}`,
  ].join("\n");
}
