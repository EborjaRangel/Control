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

export function obtenerConfigConvocatoria(): ConvocatoriaConfig {
  const smtpOk = Boolean(
    process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim(),
  );
  const twilioOk = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim(),
  );

  return {
    email: {
      habilitado: smtpOk,
      from: process.env.SMTP_FROM?.trim() ?? null,
    },
    sms: {
      habilitado: twilioOk && Boolean(process.env.TWILIO_SMS_FROM?.trim()),
      from: process.env.TWILIO_SMS_FROM?.trim() ?? null,
    },
    whatsapp: {
      habilitado: twilioOk && Boolean(process.env.TWILIO_WHATSAPP_FROM?.trim()),
      from: process.env.TWILIO_WHATSAPP_FROM?.trim() ?? null,
    },
  };
}

export const obtenerConfigComunicacion = obtenerConfigConvocatoria;

/** Lista qué falta configurar para envíos reales. */
export function faltantesConfigConvocatoria(): string[] {
  const faltantes: string[] = [];
  if (!process.env.SMTP_HOST?.trim()) faltantes.push("SMTP_HOST");
  if (!process.env.SMTP_FROM?.trim()) faltantes.push("SMTP_FROM");
  if (!process.env.TWILIO_ACCOUNT_SID?.trim()) faltantes.push("TWILIO_ACCOUNT_SID");
  if (!process.env.TWILIO_AUTH_TOKEN?.trim()) faltantes.push("TWILIO_AUTH_TOKEN");
  if (!process.env.TWILIO_SMS_FROM?.trim()) faltantes.push("TWILIO_SMS_FROM");
  if (!process.env.TWILIO_WHATSAPP_FROM?.trim()) faltantes.push("TWILIO_WHATSAPP_FROM");
  return faltantes;
}

export function convocatoriaListaParaEnvio(): boolean {
  const c = obtenerConfigConvocatoria();
  return c.email.habilitado && c.sms.habilitado && c.whatsapp.habilitado;
}

export function mensajeConfigConvocatoriaIncompleta(): string {
  const faltantes = faltantesConfigConvocatoria();
  if (faltantes.length === 0) return "";
  return `Configura en el servidor las variables de entorno: ${faltantes.join(", ")}`;
}

/** Normaliza celular MX (10 dígitos) a E.164 +52… */
export function telefonoE164Mexico(telefono: string): string | null {
  const digits = telefono.replace(/\D/g, "");
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("521")) return `+${digits}`;
  return null;
}

export function whatsappDestino(e164: string): string {
  return e164.startsWith("whatsapp:") ? e164 : `whatsapp:${e164}`;
}
