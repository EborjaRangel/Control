import { telefonoE164Mexico } from "./config.js";
import type { ResultadoEnvio } from "./email.js";

type MetaError = {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
  };
};

type MetaSendResponse = {
  messages?: Array<{ id?: string }>;
};

function apiVersion(): string {
  return process.env.WHATSAPP_CLOUD_API_VERSION?.trim() || "v22.0";
}

function accessToken(): string | null {
  return process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim() ?? null;
}

function phoneNumberId(): string | null {
  return process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() ?? null;
}

/** Meta Cloud API: dígitos E.164 sin «+» (ej. 5215534845878). */
export function telefonoWhatsAppCloud(telefono: string): string | null {
  const e164 = telefonoE164Mexico(telefono);
  if (!e164) return null;
  return e164.replace(/\D/g, "");
}

function mensajeErrorMeta(raw: string, code?: number): string {
  if (/131047|re-engagement|24 hour|outside/i.test(raw)) {
    return (
      "WhatsApp (Meta): fuera de la ventana de 24 h. Configura WHATSAPP_CLOUD_TEMPLATE_NAME " +
      "con una plantilla aprobada para convocatorias."
    );
  }
  if (/131026|not a valid whatsapp user|undeliverable/i.test(raw)) {
    return "WhatsApp (Meta): el número no tiene WhatsApp o es inválido.";
  }
  if (/190|OAuth|Invalid OAuth|token/i.test(raw) || code === 190) {
    return "WhatsApp (Meta): token inválido o expirado. Renueva WHATSAPP_CLOUD_ACCESS_TOKEN.";
  }
  if (/100|permission|does not exist/i.test(raw) && code === 100) {
    return "WhatsApp (Meta): revisa WHATSAPP_CLOUD_PHONE_NUMBER_ID y permisos del token.";
  }
  return raw;
}

async function metaPost(body: Record<string, unknown>): Promise<ResultadoEnvio> {
  const token = accessToken();
  const fromId = phoneNumberId();
  if (!token || !fromId) {
    return {
      ok: false,
      error: "Meta Cloud API no configurada (WHATSAPP_CLOUD_ACCESS_TOKEN / PHONE_NUMBER_ID)",
    };
  }

  const res = await fetch(`https://graph.facebook.com/${apiVersion()}/${fromId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as MetaSendResponse & MetaError;
  if (!res.ok) {
    const msg = data.error?.message ?? `Meta HTTP ${res.status}`;
    console.error("[convocatoria][meta-whatsapp]", msg, data.error?.code);
    return { ok: false, error: mensajeErrorMeta(msg, data.error?.code) };
  }

  return { ok: true, proveedorId: data.messages?.[0]?.id };
}

function payloadTexto(to: string, body: string): Record<string, unknown> {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: true, body },
  };
}

function payloadPlantilla(to: string, body: string): Record<string, unknown> | null {
  const name = process.env.WHATSAPP_CLOUD_TEMPLATE_NAME?.trim();
  if (!name) return null;

  const lang = process.env.WHATSAPP_CLOUD_TEMPLATE_LANGUAGE?.trim() || "es_MX";
  const paramKey = process.env.WHATSAPP_CLOUD_TEMPLATE_BODY_PARAM?.trim() || "1";

  const parameters: Array<{ type: "text"; text: string }> = [];
  const extraVars = process.env.WHATSAPP_CLOUD_TEMPLATE_VARIABLES?.trim();
  if (extraVars) {
    try {
      const vars = JSON.parse(extraVars) as Record<string, string>;
      const keys = Object.keys(vars).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      for (const key of keys) {
        parameters.push({ type: "text", text: vars[key] ?? "" });
      }
    } catch {
      parameters.push({ type: "text", text: body });
    }
  } else {
    parameters.push({ type: "text", text: body });
  }

  if (parameters.length === 0) {
    parameters.push({ type: "text", text: body });
  }

  void paramKey; // reservado para mapeo futuro de variables

  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name,
      language: { code: lang },
      components: [{ type: "body", parameters }],
    },
  };
}

export async function enviarWhatsAppCloud(input: {
  telefono: string;
  body: string;
}): Promise<ResultadoEnvio> {
  const to = telefonoWhatsAppCloud(input.telefono);
  if (!to) {
    return { ok: false, error: "Número de celular inválido" };
  }

  const forzarPlantilla = process.env.WHATSAPP_CLOUD_SOLO_PLANTILLA === "true";
  const plantilla = payloadPlantilla(to, input.body);

  if (forzarPlantilla && plantilla) {
    return metaPost(plantilla);
  }

  if (plantilla && process.env.WHATSAPP_CLOUD_TEMPLATE_NAME?.trim()) {
    const texto = await metaPost(payloadTexto(to, input.body));
    if (texto.ok) return texto;
    if (/24 h|131047|re-engagement/i.test(texto.error ?? "")) {
      return metaPost(plantilla);
    }
    return texto;
  }

  return metaPost(payloadTexto(to, input.body));
}

/** Verifica token y Phone Number ID (no envía mensaje). */
export async function verificarWhatsAppCloud(): Promise<ResultadoEnvio> {
  const token = accessToken();
  const fromId = phoneNumberId();
  if (!token || !fromId) {
    return { ok: false, error: "Meta Cloud API no configurada" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${apiVersion()}/${fromId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = (await res.json()) as MetaError & {
      display_phone_number?: string;
      verified_name?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: mensajeErrorMeta(data.error?.message ?? `Meta HTTP ${res.status}`, data.error?.code),
      };
    }
    return { ok: true, proveedorId: data.display_phone_number ?? fromId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al conectar con Meta",
    };
  }
}
