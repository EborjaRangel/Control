import webpush from "web-push";
import { APP_BRAND } from "./brand.js";
import { prisma } from "./prisma.js";

export type PushWebResumen = {
  enviados: number;
  fallidos: number;
  omitidos: number;
  configurado: boolean;
};

function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() ?? null;
}

function vapidPrivateKey(): string | null {
  return process.env.VAPID_PRIVATE_KEY?.trim() ?? null;
}

function vapidSubject(): string {
  const mail =
    process.env.VAPID_SUBJECT?.trim() ??
    process.env.SMTP_FROM?.trim() ??
    process.env.RESEND_FROM?.trim() ??
    "mailto:control@example.com";
  return mail.startsWith("mailto:") ? mail : `mailto:${mail}`;
}

export function pushWebConfigurado(): boolean {
  return Boolean(vapidPublicKey() && vapidPrivateKey());
}

export function pushWebPublicKey(): string | null {
  return vapidPublicKey();
}

function asegurarVapid(): boolean {
  const pub = vapidPublicKey();
  const priv = vapidPrivateKey();
  if (!pub || !priv) return false;
  webpush.setVapidDetails(vapidSubject(), pub, priv);
  return true;
}

function appBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.FRONTEND_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function textoPush(mensaje: string, max = 240): string {
  const t = mensaje.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export async function enviarPushWebAUsuarios(input: {
  usuarioIds: string[];
  titulo?: string;
  mensaje: string;
  notificacionId?: string | null;
}): Promise<PushWebResumen> {
  const resumen: PushWebResumen = {
    enviados: 0,
    fallidos: 0,
    omitidos: 0,
    configurado: pushWebConfigurado(),
  };

  const ids = [...new Set(input.usuarioIds.filter(Boolean))];
  if (ids.length === 0) return resumen;
  if (!asegurarVapid()) {
    resumen.omitidos = ids.length;
    return resumen;
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { usuarioId: { in: ids } },
  });

  if (subs.length === 0) {
    resumen.omitidos = ids.length;
    return resumen;
  }

  const url = input.notificacionId
    ? `${appBaseUrl()}/notificaciones`
    : `${appBaseUrl()}/notificaciones`;

  const preview = textoPush(input.mensaje);
  const payload = JSON.stringify({
    title: input.titulo ?? `${APP_BRAND}: tienes un nuevo mensaje en la web app`,
    body:
      preview.length > 0
        ? preview
        : "Entra a Control AXIS → Notificaciones para leer el aviso completo.",
    url,
    notificacionId: input.notificacionId ?? null,
  });

  const usuariosConSub = new Set(subs.map((s) => s.usuarioId));
  resumen.omitidos = ids.filter((id) => !usuariosConSub.has(id)).length;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      resumen.enviados++;
    } catch (err: unknown) {
      resumen.fallidos++;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
      console.error("[push-web] fallo", sub.usuarioId, status, err);
    }
  }

  return resumen;
}
