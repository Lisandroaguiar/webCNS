self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  event.waitUntil(self.registration.showNotification(payload.title || "Mesita Virtual", {
    body: payload.body || "Tenés una fecha académica próxima.",
    icon: "/icons/mesita.svg",
    badge: "/icons/mesita.svg",
    data: { eventId: payload.eventId, targetUrl: payload.targetUrl || "/agenda" }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.targetUrl || "/agenda", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.navigate(targetUrl).then(client => client?.focus());
    return self.clients.openWindow(targetUrl);
  }));
});
