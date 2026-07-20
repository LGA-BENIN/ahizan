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
    // Log the error to an error reporting service
    console.error("Seller Application Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes toAndFro {
          0% { transform: translateX(-30px); }
          50% { transform: translateX(30px); }
          100% { transform: translateX(-30px); }
        }
        .animate-to-and-fro {
          display: inline-block;
          animation: toAndFro 2.5s ease-in-out infinite;
        }
      `}} />
      <h1 className="text-6xl md:text-8xl font-extrabold text-primary mb-6 animate-to-and-fro tracking-widest uppercase">
        Ahizan
      </h1>
      <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
        Ahizan est en maintenance
      </h2>
      <p className="text-muted-foreground max-w-lg mx-auto mb-10 text-base md:text-lg">
        Nous rencontrons actuellement un problème technique ou effectuons une mise à jour. L'équipe est sur le coup ! Veuillez revenir d'ici quelques instants.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="px-6 py-3 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity font-medium"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
