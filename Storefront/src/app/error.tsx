"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const RETRY_KEY = "ahizan_page_error_retries";
const MAX_AUTO_RETRIES = 1;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [shouldShowErrorUI, setShouldShowErrorUI] = useState(false);

  if (
    error?.message?.includes("NEXT_REDIRECT") ||
    error?.digest?.includes("NEXT_REDIRECT") ||
    (typeof error === "object" && error !== null && "digest" in error && String(error.digest).includes("NEXT_REDIRECT"))
  ) {
    throw error;
  }

  useEffect(() => {
    // Log error for debugging
    console.error("Storefront error intercepted:", error?.message || error);

    // Report client error to server for diagnostics
    try {
      fetch("/api/report-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          digest: error?.digest,
          url: typeof window !== "undefined" ? window.location.href : "",
        }),
      }).catch(() => {});
    } catch {}

    // Check if we should attempt a single silent reset
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(RETRY_KEY);
        let retries = 0;
        let lastTime = 0;
        if (stored) {
          const parsed = JSON.parse(stored);
          retries = parsed.count || 0;
          lastTime = parsed.timestamp || 0;
        }

        const now = Date.now();
        if (now - lastTime > 60000) {
          retries = 0;
        }

        if (retries < MAX_AUTO_RETRIES) {
          sessionStorage.setItem(
            RETRY_KEY,
            JSON.stringify({ count: retries + 1, timestamp: now })
          );

          // Clear Service Worker caches if any stale chunks are causing the error
          if ("caches" in window) {
            caches.keys().then((keys) => {
              keys.forEach((key) => caches.delete(key));
            }).catch(() => {});
          }

          // Attempt immediate seamless reset without reloading the whole window
          reset();
          return;
        }
      } catch (e) {
        console.warn("Auto-retry error:", e);
      }
    }

    // If auto-recovery was already attempted or failed, show the user-facing error UI
    setShouldShowErrorUI(true);
  }, [error, reset]);

  const handleManualRetry = () => {
    try {
      sessionStorage.removeItem(RETRY_KEY);
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        }).catch(() => {});
      }
      reset();
    } catch {
      window.location.reload();
    }
  };

  const handleHardReset = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem("ahizan_client_location");
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        }).catch(() => {});
      }
    } catch {}
    window.location.href = "/";
  };

  if (!shouldShowErrorUI) {
    // During initial mount or silent recovery, render clean minimal loader so there is NO jarring "Chargement interrompu" flash!
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
        <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-muted-foreground font-medium">Chargement en cours...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mb-6">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        Chargement interrompu
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm md:text-base">
        La connexion avec nos services a rencontré une brève interruption. Cliquez sur réessayer pour charger vos informations.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={handleManualRetry}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-95 transition-opacity font-medium text-sm shadow-sm cursor-pointer"
        >
          Réessayer
        </button>
        <button
          onClick={handleHardReset}
          className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium text-sm cursor-pointer"
        >
          Réinitialiser et recharger
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 border border-border text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
