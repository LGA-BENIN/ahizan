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
  serwist.handleFetch(event);
});

