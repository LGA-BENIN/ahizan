'use client';

interface AuthorizeClientProps {
  customerName: string;
  redirectTo: string;
  storefrontUrl: string;
}

export function AuthorizeClient({
  customerName,
  redirectTo,
  storefrontUrl,
}: AuthorizeClientProps) {

  const handleAuthorize = () => {
    window.location.href = redirectTo;
  };

  const handleCancel = () => {
    window.location.href = storefrontUrl;
  };

  return (
    <main className="flex-grow flex flex-col md:flex-row w-full h-screen overflow-hidden pt-16 md:pt-0">
      {/* Left Column: Branding Panel */}
      <div className="hidden md:flex md:w-1/2 bg-white relative flex-col justify-center px-20">
        <div className="relative z-10 space-y-6">
          <h1 className="font-display-lg text-display-lg text-primary max-w-lg">Identité sécurisée pour un univers de possibilités.</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">Connectez-vous une seule fois et accédez en toute sécurité à l'ensemble de l'écosystème Ahizan Marketplace.</p>
          <div className="pt-12 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center text-white">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            </div>
            <div>
              <div className="font-label-md text-label-md text-on-surface font-bold">Sécurité de niveau banque</div>
              <div className="font-body-md text-body-md text-on-surface-variant">Chiffrement de bout en bout.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-gutter">
        <div className="w-full max-w-[480px] bg-white rounded-[28px] p-10 auth-card-shadow border border-surface-container flex flex-col">
          {/* Progress Stepper (MFA Style) */}
          <div className="w-full h-1 bg-surface-container rounded-full mb-8 overflow-hidden">
            <div className="w-3/4 h-full bg-primary transition-all duration-700"></div>
          </div>

          {/* Identity Badge */}
          <div className="flex items-center gap-4 mb-8 p-4 bg-surface-light rounded-xl border border-outline-variant/30">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-container bg-primary/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[24px]">person</span>
            </div>
            <div className="flex-grow">
              <p className="font-label-md text-label-md text-on-surface-variant">Connecté en tant que</p>
              <p className="font-label-md text-label-md text-on-surface font-bold">{customerName}</p>
            </div>
            <span className="material-symbols-outlined text-success">verified</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Autoriser l'accès à votre compte Ahizan ?</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">L'application <span className="font-bold text-primary">Marketplace Ahizan</span> souhaite accéder à certaines informations de votre compte.</p>
          </div>

          {/* Permission List Card */}
          <div className="bg-surface-light rounded-2xl p-6 mb-8 border border-surface-container">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">account_circle</span>
                <div>
                  <span className="font-label-md text-label-md text-on-surface">Nom et photo de profil</span>
                  <p className="text-[12px] text-on-surface-variant">Pour personnaliser votre expérience.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">mail</span>
                <div>
                  <span className="font-label-md text-label-md text-on-surface">Adresse email</span>
                  <p className="text-[12px] text-on-surface-variant">Pour vos notifications et factures.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">call</span>
                <span className="font-label-md text-label-md text-on-surface">Numéro de téléphone</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">badge</span>
                <span className="font-label-md text-label-md text-on-surface">Identifiant utilisateur</span>
              </li>
            </ul>
          </div>

          {/* CTA Row */}
          <div className="space-y-4">
            <button
              onClick={handleAuthorize}
              className="w-full h-12 bg-primary text-white rounded-xl font-label-md text-label-md hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 cursor-pointer"
            >
              Autoriser et continuer
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <button
              onClick={handleCancel}
              className="w-full h-12 bg-transparent text-on-surface-variant border border-outline-variant rounded-xl font-label-md text-label-md hover:bg-surface-light active:scale-[0.98] transition-all cursor-pointer"
            >
              Annuler
            </button>
          </div>

          <p className="mt-8 text-center font-label-sm text-label-sm text-on-surface-variant">
            Vous pouvez retirer cet accès plus tard depuis les paramètres de votre compte.
          </p>
        </div>
      </div>
    </main>
  );
}
