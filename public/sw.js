/*
 * Offline shell for Share2Earn.
 *
 * All application state lives in localStorage, so once the shell is cached the
 * app keeps working with no network at all. Navigations try the network first
 * (so a redeploy is picked up promptly) and fall back to the cached page;
 * static assets are served cache-first.
 */

const CACHE = "s2e-shell-v1";
const SCOPE_PATH = new URL(self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SCOPE_PATH, `${SCOPE_PATH}home/`]))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(`${SCOPE_PATH}home/`))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});

/*
 * Web Push wiring (DESIGN.md §9). The prototype has no push server, so no
 * subscription is created, but the handlers show the payload contract the
 * backend would emit and keep the shell ready for it.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "CelcomDigi Share2Earn", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Share2Earn", {
      body: payload.body || "",
      icon: `${SCOPE_PATH}icon-192.png`,
      badge: `${SCOPE_PATH}icon-192.png`,
      data: { request_id: payload.request_id },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const id = event.notification.data && event.notification.data.request_id;
  const target = id ? `${SCOPE_PATH}request/?id=${id}` : `${SCOPE_PATH}home/`;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.includes(SCOPE_PATH));
      if (open) return open.focus().then(() => open.navigate(target));
      return self.clients.openWindow(target);
    })
  );
});
