// service-worker.js
// 1) Cachea el "cascarón" de la app para que abra rápido y funcione sin internet.
// 2) Escucha notificaciones push (necesita un backend que las dispare - ver README).

const CACHE_NAME = "impulsa-emprende-v1";
const APP_SHELL = [
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Instala: guarda el cascarón de la app en caché
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activa: limpia versiones viejas de caché
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: responde desde caché si existe, si no va a la red
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// ---- PUSH NOTIFICATIONS ----
// Esto se activa cuando un servidor (backend) envía un push.
// Por ahora no hay backend conectado: esta parte queda lista para cuando
// integres Firebase Cloud Messaging u otro servicio (ver README).
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Impulsa Emprende";
  const options = {
    body: data.body || "Tienes una novedad en la app.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    data: { url: data.url || "./index.html" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Al tocar la notificación, abre la app en la pantalla indicada
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || "./index.html")
  );
});
