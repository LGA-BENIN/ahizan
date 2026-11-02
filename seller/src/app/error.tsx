"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Seller error intercepted:", error?.message || error);
  }, [error]);

  const handleRetry = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center mb-6">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        Chargement de l'espace Vendeur interrompu
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm md:text-base">
        Une interruption momentanée est survenue. Cliquez sur réessayer pour recharger votre tableau de bord.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={handleRetry}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-95 transition-opacity font-medium text-sm shadow-sm cursor-pointer"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium text-sm"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
