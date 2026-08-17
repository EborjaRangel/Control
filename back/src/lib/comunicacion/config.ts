export type CanalConvocatoria = "EMAIL" | "SMS" | "WHATSAPP";

export type ConvocatoriaConfig = {
  email: {
    habilitado: boolean;
    from: string | null;
  };
  sms: {
    habilitado: boolean;
    from: string | null;
  };
  whatsapp: {
    habilitado: boolean;
    from: string | null;
  };
};

/** @deprecated usar ConvocatoriaConfig */
export type ComunicacionConfig = ConvocatoriaConfig;

/** @deprecated usar CanalConvocatoria */
export type CanalComunicacion = CanalConvocatoria;

export type WhatsAppProveedor = "meta" | "twilio";

function metaWhatsAppConfigurado(): boolean {
  return Boolean(
    process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim(),
  );
}

function twilioWhatsAppConfigurado(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_WHATSAPP_FROM?.trim(),
  );
}

/** Proveedor activo para WhatsApp. WHATSAPP_PROVIDER=meta|twilio; por defecto Meta si está configurado. */
export function whatsAppProveedor(): WhatsAppProveedor | null {
  const forced = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();
  if (forced === "meta" || forced === "cloud") return "meta";
  if (forced === "twilio") return "twilio";
  if (metaWhatsAppConfigurado()) return "meta";
  if (twilioWhatsAppConfigurado()) return "twilio";
  return null;
}

export function obtenerConfigConvocatoria(): ConvocatoriaConfig {
  const resendOk = Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      (process.env.RESEND_FROM?.trim() || process.env.SMTP_FROM?.trim()),
  );
  const smtpOk = Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_FROM?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
  const twilioOk = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim(),
  );

  return {
    email: {
      habilitado: resendOk || smtpOk,
      from: process.env.RESEND_FROM?.trim() ?? process.env.SMTP_FROM?.trim() ?? null,
    },
    sms: {
      habilitado: twilioOk && Boolean(process.env.TWILIO_SMS_FROM?.trim()),
      from: process.env.TWILIO_SMS_FROM?.trim() ?? null,
    },
    whatsapp: {
      habilitado: whatsAppListo(),
      from:
        whatsAppProveedor() === "meta"
          ? (process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() ?? null)
          : (process.env.TWILIO_WHATSAPP_FROM?.trim() ?? null),
    },
  };
}

export const obtenerConfigComunicacion = obtenerConfigConvocatoria;

export function smtpUsaValoresEjemplo(): boolean {
  const user = process.env.SMTP_USER?.trim().toLowerCase() ?? "";
  const pass = process.env.SMTP_PASS?.trim().toLowerCase() ?? "";

  return (
    user.includes("tu-correo") ||
    user.includes("nombre@gmail.com") ||
    user.includes("example.com") ||
    pass.includes("contraseña-de-aplicacion") ||
    pass.includes("contrasena-de-aplicacion") ||
    pass.includes("pega-aqui") ||
    pass.includes("tu-contraseña") ||
    pass.includes("tu-contrasena") ||
    pass === "abcdefghijklmnop"
  );
}

export function mensajeSmtpNoConfigurado(): string {
  const pass = process.env.SMTP_PASS?.trim().toLowerCase() ?? "";
  if (pass.includes("pega-aqui") || pass.includes("contraseña-de-aplicacion")) {
    return "Falta la contraseña de aplicación de Gmail en SMTP_PASS (back/.env). Créala en https://myaccount.google.com/apppasswords";
  }
  return "SMTP aún tiene valores de ejemplo en back/.env. Configura SMTP_USER y SMTP_PASS con controldirigentes@gmail.com y su contraseña de aplicación.";
}

/** Solo para pruebas locales: define SMTP_DEV_LOG=true en back/.env */
export function smtpModoDesarrolloActivo(): boolean {
  return process.env.SMTP_DEV_LOG === "true";
}

/** Variables mínimas para WhatsApp (Meta Cloud API o Twilio). */
export function faltantesWhatsApp(): string[] {
  const prov = whatsAppProveedor();
  if (prov === "meta") {
    const faltantes: string[] = [];
    if (!process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim()) {
      faltantes.push("WHATSAPP_CLOUD_ACCESS_TOKEN");
    }
    if (!process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim()) {
      faltantes.push("WHATSAPP_CLOUD_PHONE_NUMBER_ID");
    }
    return faltantes;
  }
  if (prov === "twilio") {
    const faltantes: string[] = [];
    if (!process.env.TWILIO_ACCOUNT_SID?.trim()) faltantes.push("TWILIO_ACCOUNT_SID");
    if (!process.env.TWILIO_AUTH_TOKEN?.trim()) faltantes.push("TWILIO_AUTH_TOKEN");
    if (!process.env.TWILIO_WHATSAPP_FROM?.trim()) faltantes.push("TWILIO_WHATSAPP_FROM");
    return faltantes;
  }
  return ["WHATSAPP_CLOUD_ACCESS_TOKEN", "WHATSAPP_CLOUD_PHONE_NUMBER_ID"];
}

/** Lista qué falta configurar para envíos reales (todos los canales). */
export function faltantesConfigConvocatoria(): string[] {
  const faltantes: string[] = [];
  if (!process.env.SMTP_HOST?.trim()) faltantes.push("SMTP_HOST");
  if (!process.env.SMTP_FROM?.trim() && !process.env.RESEND_FROM?.trim()) {
    faltantes.push("SMTP_FROM o RESEND_FROM");
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    if (!process.env.SMTP_USER?.trim()) faltantes.push("SMTP_USER");
    if (!process.env.SMTP_PASS?.trim()) faltantes.push("SMTP_PASS");
  }
  if (!process.env.TWILIO_ACCOUNT_SID?.trim()) faltantes.push("TWILIO_ACCOUNT_SID");
  if (!process.env.TWILIO_AUTH_TOKEN?.trim()) faltantes.push("TWILIO_AUTH_TOKEN");
  if (!process.env.TWILIO_SMS_FROM?.trim()) faltantes.push("TWILIO_SMS_FROM");
  if (!whatsAppListo()) {
    faltantes.push(...faltantesWhatsApp().filter((k) => !faltantes.includes(k)));
  }
  return faltantes;
}

export function whatsAppListo(): boolean {
  return faltantesWhatsApp().length === 0;
}

export function convocatoriaListaParaEnvio(): boolean {
  const c = obtenerConfigConvocatoria();
  return c.email.habilitado || c.sms.habilitado || c.whatsapp.habilitado;
}

export function mensajeConfigConvocatoriaIncompleta(): string {
  const c = obtenerConfigConvocatoria();
  if (convocatoriaListaParaEnvio()) return "";
  const partes: string[] = [];
  if (!c.whatsapp.habilitado) {
    partes.push(`WhatsApp (prioritario): ${faltantesWhatsApp().join(", ")}`);
  }
  if (!c.email.habilitado) {
    partes.push("Correo: SMTP_* o RESEND_*");
  }
  if (!c.sms.habilitado) {
    partes.push("SMS: TWILIO_SMS_FROM");
  }
  return `Configura en el servidor las variables de entorno. ${partes.join(" · ")}`;
}

/** Normaliza celular MX a 10 dígitos (para búsqueda en BD). */
export function telefonoMexico10Digitos(telefono: string): string | null {
  const digits = telefono.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("52")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("521")) return digits.slice(3);
  return null;
}

/** Normaliza celular MX (10 dígitos) a E.164 +521… (móvil México, Twilio/WhatsApp). */
export function telefonoE164Mexico(telefono: string): string | null {
  const digits = telefono.replace(/\D/g, "");
  if (digits.length === 10) return `+521${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return `+521${digits.slice(2)}`;
  if (digits.length === 13 && digits.startsWith("521")) return `+${digits}`;
  return null;
}

export function whatsappDestino(e164: string): string {
  return e164.startsWith("whatsapp:") ? e164 : `whatsapp:${e164}`;
}
