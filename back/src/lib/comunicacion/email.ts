import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { obtenerConfigConvocatoria, smtpUsaValoresEjemplo, mensajeSmtpNoConfigurado } from "./config.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth:
        process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()
          ? {
              user: process.env.SMTP_USER.trim(),
              pass: process.env.SMTP_PASS.trim(),
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

function mensajeErrorSmtp(err: unknown): string {
  const raw = err instanceof Error ? err.message : "Error al enviar correo";

  if (/535|BadCredentials|Username and Password not accepted/i.test(raw)) {
    return (
      "Gmail rechazó el usuario o la contraseña SMTP. Usa SMTP_USER con tu correo completo " +
      "y SMTP_PASS con una contraseña de aplicación de 16 caracteres (no tu contraseña normal de Gmail)."
    );
  }

  if (/EAUTH|Invalid login/i.test(raw)) {
    return "No se pudo autenticar con el servidor SMTP. Revisa SMTP_USER y SMTP_PASS en back/.env.";
  }

  if (/timeout|ENETUNREACH|ETIMEDOUT|ECONNREFUSED/i.test(raw)) {
    return "No se pudo conectar al servidor SMTP desde el servidor. Intenta de nuevo en unos minutos.";
  }

  return raw;
}

export async function enviarCorreo(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<ResultadoEnvio> {
  const config = obtenerConfigConvocatoria();

  if (smtpUsaValoresEjemplo()) {
    return {
      ok: false,
      error: mensajeSmtpNoConfigurado(),
    };
  }

  if (!config.email.habilitado || !config.email.from) {
    return {
      ok: false,
      error:
        "Correo no configurado. Define SMTP_HOST, SMTP_FROM, SMTP_USER y SMTP_PASS en back/.env.",
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
    const error = mensajeErrorSmtp(err);
    console.error("[email]", err instanceof Error ? err.message : err);
    return { ok: false, error };
  }
}
