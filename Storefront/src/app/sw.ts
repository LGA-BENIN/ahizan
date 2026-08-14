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
    // Bypass service worker caching for GraphQL Shop API
    {
      matcher: ({ url }) => url.pathname.includes("/shop-api") || url.pathname.includes("/admin-api"),
      handler: new NetworkOnly(),
    },
    // Bypass service worker caching for Next.js Server Actions
    {
      matcher: ({ request }) => request.headers.get("x-next-action") !== null || request.headers.get("next-action") !== null,
      handler: new NetworkOnly(),
    },
    // Bypass service worker caching for Next.js RSC requests
    {
      matcher: ({ request, url }) => request.headers.get("rsc") === "1" || url.searchParams.has("_next_rsc"),
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
  const url = new URL(event.request.url);
  // Bypass SW event handling for shop-api and admin-api to eliminate idle tab cold-start delays
  if (url.pathname.includes("/shop-api") || url.pathname.includes("/admin-api")) {
    return;
  }
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
