import dns from "node:dns";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { obtenerConfigConvocatoria, smtpUsaValoresEjemplo, mensajeSmtpNoConfigurado } from "./config.js";
import { enviarCorreoResend, resendConfigurado } from "./email-resend.js";

dns.setDefaultResultOrder("ipv4first");

let transporterPromise: Promise<Transporter> | null = null;

async function createTransporter(): Promise<Transporter> {
  const hostname = process.env.SMTP_HOST?.trim() ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? 587);

  let connectHost = hostname;
  try {
    const resolved = await dns.promises.lookup(hostname, { family: 4, all: false });
    connectHost = resolved.address;
    console.log(`[email] SMTP ${hostname} -> IPv4 ${connectHost}:${port}`);
  } catch (err) {
    console.error("[email] No se pudo resolver IPv4 para SMTP, usando hostname", err);
  }

  return nodemailer.createTransport({
    host: connectHost,
    port,
    secure: port === 465,
    tls: {
      servername: hostname,
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    auth:
      process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()
        ? {
            user: process.env.SMTP_USER.trim(),
            pass: process.env.SMTP_PASS.trim(),
          }
        : undefined,
  });
}

async function getTransporter(): Promise<Transporter> {
  transporterPromise ??= createTransporter();
  return transporterPromise;
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
    return (
      "No se pudo conectar al servidor SMTP. Verifica SMTP_HOST/SMTP_PORT en Railway " +
      "(puerto 587 u 465). En Railway Hobby el SMTP saliente está bloqueado; con Railway Pro " +
      "debe funcionar Gmail. Alternativa: RESEND_API_KEY + RESEND_FROM."
    );
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

  if (!config.email.habilitado || !config.email.from) {
    return {
      ok: false,
      error:
        "Correo no configurado. Define RESEND_API_KEY + RESEND_FROM, o SMTP_HOST/SMTP_FROM/SMTP_USER/SMTP_PASS.",
    };
  }

  if (resendConfigurado()) {
    return enviarCorreoResend(input);
  }

  if (smtpUsaValoresEjemplo()) {
    return {
      ok: false,
      error: mensajeSmtpNoConfigurado(),
    };
  }

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: config.email.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true, proveedorId: info.messageId };
  } catch (err) {
    transporterPromise = null;
    const error = mensajeErrorSmtp(err);
    console.error("[email]", err instanceof Error ? err.message : err);
    return { ok: false, error };
  }
}
