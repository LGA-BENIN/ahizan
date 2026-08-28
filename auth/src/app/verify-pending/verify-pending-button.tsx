'use client';

import { useState } from 'react';
import { checkEmailRolesAction } from '../register/actions';

interface VerifyPendingButtonProps {
  email: string;
  continueUrl: string;
}

export function VerifyPendingButton({ email, continueUrl }: VerifyPendingButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Adresse e-mail de confirmation introuvable. Veuillez vous connecter.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await checkEmailRolesAction(email);
      if (result.isVerified) {
        window.location.href = continueUrl;
      } else {
        setError("Votre adresse e-mail n'a pas encore été vérifiée. Veuillez cliquer sur le lien de confirmation envoyé dans votre boîte de réception.");
      }
    } catch (err) {
      setError("Une erreur est survenue lors de la vérification de votre statut. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={handleCheck}
        disabled={loading}
        className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-label-lg text-label-lg rounded-xl flex items-center justify-center shadow-md transition-all cursor-pointer font-semibold"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Vérification en cours...
          </span>
        ) : (
          "J'ai vérifié mon e-mail, continuer"
        )}
      </button>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3.5 rounded-xl text-center mt-4 font-medium animate-fadeIn">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
