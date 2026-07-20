/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    concurrency: 10,
    cleanupOutdatedCaches: true,
  },
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.hostname === "nominatim.openstreetmap.org",
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

self.addEventListener("install", (event: ExtendableEvent) => {
  serwist.handleInstall(event);
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  serwist.handleActivate(event);
});

self.addEventListener("fetch", (event: FetchEvent) => {
  serwist.handleFetch(event);
});

// ─── Web Push Notifications ───────────────────────────────────────────────────

self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; icon?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Ahizan", body: event.data?.text() ?? "" };
  }

  const title = data.title || "Ahizan";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192x192-white.png",
    badge: "/icons/icon-72x72.png",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
  } as NotificationOptions;

  const promise = self.registration.showNotification(title, options)
    .catch((err) => console.error("SW showNotification failed:", err));
  event.waitUntil(promise);
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl: string = event.notification.data?.url || "/";

  event.waitUntil(
    (self as any).clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: WindowClient[]) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        if ((self as any).clients.openWindow) {
          return (self as any).clients.openWindow(targetUrl);
        }
      })
  );
});
