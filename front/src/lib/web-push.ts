import { apiFetch } from "@/lib/api";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type PushWebEstado = "unsupported" | "denied" | "off" | "active";

export function pushWebSoportado(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registrarServiceWorkerPush(): Promise<ServiceWorkerRegistration | null> {
  if (!pushWebSoportado()) return null;
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await reg.update().catch(() => {});
  return reg;
}

export async function obtenerVapidPublicKey(): Promise<string | null> {
  const res = await apiFetch("/api/push-web/vapid-public-key");
  if (!res.ok) return null;
  const data = (await res.json()) as { configurado?: boolean; publicKey?: string | null };
  if (!data.configurado || !data.publicKey) return null;
  return data.publicKey;
}

export async function suscribirPushWeb(): Promise<PushWebEstado> {
  if (!pushWebSoportado()) return "unsupported";

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";

  const vapid = await obtenerVapidPublicKey();
  if (!vapid) return "off";

  const reg = await registrarServiceWorkerPush();
  if (!reg?.pushManager) return "off";

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const res = await apiFetch("/api/push-web/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });

  return res.ok ? "active" : "off";
}
