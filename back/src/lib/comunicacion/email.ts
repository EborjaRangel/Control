import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { obtenerConfigConvocatoria } from "./config.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }
  return transporter;
}

export type ResultadoEnvio = {
  ok: boolean;
  proveedorId?: string;
  error?: string;
};

export async function enviarCorreo(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<ResultadoEnvio> {
  const config = obtenerConfigConvocatoria();

  if (!config.email.habilitado || !config.email.from) {
    return {
      ok: false,
      error: "Correo no configurado. Define SMTP_HOST y SMTP_FROM en el servidor.",
    };
  }

  try {
    const info = await getTransporter().sendMail({
      from: config.email.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true, proveedorId: info.messageId };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error al enviar correo";
    console.error("[convocatoria][email]", error);
    return { ok: false, error };
  }
}
