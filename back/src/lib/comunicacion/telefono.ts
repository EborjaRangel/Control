import { obtenerConfigConvocatoria, telefonoE164Mexico, whatsappDestino } from "./config.js";
import type { ResultadoEnvio } from "./email.js";

async function twilioEnviar(input: {
  to: string;
  from: string;
  body: string;
}): Promise<ResultadoEnvio> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) {
    return { ok: false, error: "Twilio no configurado (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)" };
  }

  const params = new URLSearchParams({
    To: input.to,
    From: input.from,
    Body: input.body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const data = (await res.json()) as { sid?: string; message?: string; code?: number };
  if (!res.ok) {
    const error = data.message ?? `Twilio HTTP ${res.status}`;
    console.error("[convocatoria][twilio]", error);
    return { ok: false, error };
  }
  return { ok: true, proveedorId: data.sid };
}

export async function enviarSms(input: {
  telefono: string;
  body: string;
}): Promise<ResultadoEnvio> {
  const config = obtenerConfigConvocatoria();
  const e164 = telefonoE164Mexico(input.telefono);
  if (!e164) {
    return { ok: false, error: "Número de celular inválido" };
  }

  if (!config.sms.habilitado || !config.sms.from) {
    return {
      ok: false,
      error: "SMS no configurado. Define TWILIO_* y TWILIO_SMS_FROM en el servidor.",
    };
  }

  return twilioEnviar({
    to: e164,
    from: config.sms.from,
    body: input.body,
  });
}

export async function enviarWhatsApp(input: {
  telefono: string;
  body: string;
}): Promise<ResultadoEnvio> {
  const config = obtenerConfigConvocatoria();
  const e164 = telefonoE164Mexico(input.telefono);
  if (!e164) {
    return { ok: false, error: "Número de celular inválido" };
  }

  if (!config.whatsapp.habilitado || !config.whatsapp.from) {
    return {
      ok: false,
      error: "WhatsApp no configurado. Define TWILIO_* y TWILIO_WHATSAPP_FROM en el servidor.",
    };
  }

  return twilioEnviar({
    to: whatsappDestino(e164),
    from: config.whatsapp.from.startsWith("whatsapp:")
      ? config.whatsapp.from
      : whatsappDestino(config.whatsapp.from),
    body: input.body,
  });
}
