import {
  obtenerConfigConvocatoria,
  telefonoE164Mexico,
  whatsAppProveedor,
  whatsappDestino,
} from "./config.js";
import type { ResultadoEnvio } from "./email.js";
import { enviarWhatsAppCloud, verificarWhatsAppCloud } from "./whatsapp-cloud.js";

function mensajeErrorTwilio(raw: string, canal: "SMS" | "WHATSAPP"): string {
  if (/63015|63016|outside the allowed window|opted in|join/i.test(raw)) {
    if (canal === "WHATSAPP") {
      return (
        "WhatsApp: el destinatario debe unirse al sandbox de Twilio (envía «join <palabra>» al número " +
        "de prueba) o usar un número de producción con plantilla aprobada por Meta."
      );
    }
  }
  if (/63007|63009|Channel/i.test(raw)) {
    return "Twilio WhatsApp no está activo en esta cuenta o falta TWILIO_WHATSAPP_FROM.";
  }
  if (/21211|Invalid.*To/i.test(raw)) {
    return "Número de celular inválido para Twilio (10 dígitos México).";
  }
  if (/20003|Authenticate|401|403/i.test(raw)) {
    return "Twilio rechazó las credenciales. Revisa TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN.";
  }
  return raw;
}

async function twilioEnviar(input: {
  to: string;
  from: string;
  body: string;
  canal: "SMS" | "WHATSAPP";
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

  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim();
  if (input.canal === "WHATSAPP" && contentSid) {
    params.delete("Body");
    params.set("ContentSid", contentSid);
    const vars = process.env.TWILIO_WHATSAPP_CONTENT_VARIABLES?.trim();
    if (vars) {
      params.set("ContentVariables", vars);
    } else {
      params.set("ContentVariables", JSON.stringify({ "1": input.body }));
    }
  }

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
    const error = mensajeErrorTwilio(data.message ?? `Twilio HTTP ${res.status}`, input.canal);
    console.error(`[convocatoria][twilio][${input.canal.toLowerCase()}]`, data.message ?? res.status);
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
    canal: "SMS",
  });
}

export async function enviarWhatsApp(input: {
  telefono: string;
  body: string;
}): Promise<ResultadoEnvio> {
  const config = obtenerConfigConvocatoria();
  if (!config.whatsapp.habilitado) {
    const prov = whatsAppProveedor();
    if (prov === "meta") {
      return {
        ok: false,
        error:
          "WhatsApp (Meta) no configurado. Define WHATSAPP_CLOUD_ACCESS_TOKEN y WHATSAPP_CLOUD_PHONE_NUMBER_ID.",
      };
    }
    return {
      ok: false,
      error: "WhatsApp no configurado. Define TWILIO_* o WHATSAPP_CLOUD_* en el servidor.",
    };
  }

  if (whatsAppProveedor() === "meta") {
    return enviarWhatsAppCloud(input);
  }

  const e164 = telefonoE164Mexico(input.telefono);
  if (!e164) {
    return { ok: false, error: "Número de celular inválido" };
  }

  if (!config.whatsapp.from) {
    return { ok: false, error: "WhatsApp (Twilio) sin TWILIO_WHATSAPP_FROM." };
  }

  const from = config.whatsapp.from.startsWith("whatsapp:")
    ? config.whatsapp.from
    : whatsappDestino(config.whatsapp.from);

  return twilioEnviar({
    to: whatsappDestino(e164),
    from,
    body: input.body,
    canal: "WHATSAPP",
  });
}

/** Verifica credenciales del proveedor WhatsApp activo. */
export async function verificarWhatsApp(): Promise<ResultadoEnvio> {
  if (whatsAppProveedor() === "meta") {
    return verificarWhatsAppCloud();
  }
  return verificarTwilio();
}

/** Prueba de credenciales Twilio (no envía mensaje). */
async function verificarTwilio(): Promise<ResultadoEnvio> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) {
    return { ok: false, error: "Twilio no configurado" };
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      },
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      return { ok: false, error: data.message ?? `Twilio HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al conectar con Twilio",
    };
  }
}
