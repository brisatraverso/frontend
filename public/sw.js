// public/sw.js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || "GPS Tracker", {
      body: data.body || "",
      icon: "/favicon.ico",
      tag:  "gps-tracker"
    })
  );
});
