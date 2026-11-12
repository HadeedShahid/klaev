// The admin app's helper on each phone that turned alerts on (Settings, components/admin/alerts-card.tsx).
// It wakes for each alert the store sends (lib/push.ts), shows it, and opens its page when tapped,
// in the admin window if one is open. It does nothing else: no caching, no offline pages.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let alert = { title: "Klaev", body: "Something new in the admin.", url: "/admin" };
  try {
    alert = { ...alert, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(alert.title, {
      body: alert.body,
      tag: alert.tag,
      icon: "/admin/icon-192.png",
      badge: "/admin/badge.png",
      data: { url: alert.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only the admin's own pages: an alert never opens anywhere else.
  const target = new URL(event.notification.data?.url ?? "/admin", self.location.origin);
  const url = target.origin === self.location.origin && target.pathname.startsWith("/admin") ? target.href : `${self.location.origin}/admin`;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const admin = windows.find((client) => new URL(client.url).pathname.startsWith("/admin"));
      if (admin) {
        await admin.focus();
        return admin.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
