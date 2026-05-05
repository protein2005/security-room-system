self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  const title = payload.title || "Security Room";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "Нове системне сповіщення",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: payload.tag || "security-room-notification",
      data: {
        ...(payload.data || {}),
        url: payload.url || "/alarms",
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/alarms";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
