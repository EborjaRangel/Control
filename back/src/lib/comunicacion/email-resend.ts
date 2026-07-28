import type { ResultadoEnvio } from "./email.js";

export function resendConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && emailFromResend());
}

export function emailFromResend(): string | null {
  return process.env.RESEND_FROM?.trim() ?? process.env.SMTP_FROM?.trim() ?? null;
}

export async function enviarCorreoResend(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = emailFromResend();

  if (!apiKey || !from) {
    return {
      ok: false,
      error: "Resend no configurado. Define RESEND_API_KEY y RESEND_FROM (o SMTP_FROM) en Railway.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const data = (await res.json()) as { id?: string; message?: string; name?: string };

    if (!res.ok) {
      const error = data.message ?? data.name ?? `Resend respondió ${res.status}`;
      console.error("[email][resend]", error);
      return { ok: false, error };
    }

    return { ok: true, proveedorId: data.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error al enviar correo con Resend";
    console.error("[email][resend]", error);
    return { ok: false, error };
  }
}
