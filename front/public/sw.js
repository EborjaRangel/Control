/* Service worker: push de avisos Control AXIS (web app). */

const DEFAULT_TITLE = "Control AXIS: nuevo mensaje en la web app";
const DEFAULT_BODY = "Tienes un aviso sin leer. Abre Control AXIS → Notificaciones.";

function avisarClientesAbiertos(data) {
  return clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      client.postMessage({
        type: "control:nuevo-mensaje-web",
        title: data.title,
        body: data.body,
        url: data.url,
      });
    }
  });
}

self.addEventListener("push", (event) => {
  let data = { title: DEFAULT_TITLE, body: DEFAULT_BODY, url: "/notificaciones", notificacionId: null };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // cuerpo vacío o no JSON
  }

  const title = data.title || DEFAULT_TITLE;
  const body = data.body || DEFAULT_BODY;
  const url = data.url || "/notificaciones";
  const tag =
    data.notificacionId != null
      ? `control-notif-${data.notificacionId}`
      : "control-notificacion";

  event.waitUntil(
    Promise.all([
      avisarClientesAbiertos({ title, body, url }),
      self.registration.showNotification(title, {
        body,
        icon: "/icon",
        badge: "/icon",
        tag,
        renotify: true,
        data: { url },
      }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/notificaciones";
  const target = new URL(url, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          if ("navigate" in client && typeof client.navigate === "function") {
            return client.navigate(target).then(() => client.focus());
          }
          client.postMessage({ type: "control:navegar", url });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    }),
  );
});
