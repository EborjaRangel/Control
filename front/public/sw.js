/* Service worker: push de avisos Control (sin depender de WhatsApp/SMS). */

self.addEventListener("push", (event) => {
  let data = { title: "Control", body: "Tienes un nuevo aviso", url: "/notificaciones" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
  // cuerpo vacío o no JSON
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Control", {
      body: data.body || "Nuevo aviso",
      icon: "/icon",
      badge: "/icon",
      tag: "control-notificacion",
      data: { url: data.url || "/notificaciones" },
    }),
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
          client.navigate(target);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    }),
  );
});
