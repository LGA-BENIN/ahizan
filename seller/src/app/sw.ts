/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "serwist";
import { Serwist } from "serwist";

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
  runtimeCaching: defaultCache,
});

self.addEventListener("install", (event: ExtendableEvent) => {
  serwist.handleInstall(event);
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  serwist.handleActivate(event);
});

self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);
  // Bypass SW event handling for navigations, RSC streaming, Server Actions, shop-api, admin-api, and non-GET requests
  if (
    event.request.mode === "navigate" ||
    event.request.headers.get("rsc") === "1" ||
    event.request.headers.get("RSC") === "1" ||
    event.request.headers.get("x-next-action") !== null ||
    event.request.headers.get("next-action") !== null ||
    url.searchParams.has("_next_rsc") ||
    url.pathname.startsWith("/_next/data/") ||
    url.pathname.includes("/shop-api") || 
    url.pathname.includes("/admin-api") || 
    url.pathname.includes("/notifications/stream") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/onboarding") ||
    event.request.method !== "GET"
  ) {
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
    icon: data.icon || "/icons/seller-icon-192x192-white.png",
    badge: "/icons/seller-icon-72x72.png",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
  } as NotificationOptions;

  const promise = self.registration.showNotification(title, options)
    .catch((err) => console.error("SW showNotification failed:", err));
  event.waitUntil(promise);
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const rawUrl: string = event.notification.data?.url || "/dashboard/orders";
  const targetUrl = rawUrl.startsWith("http") ? rawUrl : new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (self as any).clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: WindowClient[]) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        for (const client of clientList) {
          if ("focus" in client && "navigate" in client) {
            client.focus();
            return (client as any).navigate(targetUrl);
          }
        }
        if ((self as any).clients.openWindow) {
          return (self as any).clients.openWindow(targetUrl);
        }
      })
  );
});

