'use client';

import { useTransition } from 'react';
import { logoutAction } from './actions';

interface SelectRoleClientProps {
  customerName: string;
  customerEmail: string;
  vendorName: string;
  storefrontUrl: string;
  sellerUrl: string;
  hasVendor: boolean;
  vendorStatus: string;
}

export function SelectRoleClient({
  customerName,
  customerEmail,
  vendorName,
  storefrontUrl,
  sellerUrl,
  hasVendor,
  vendorStatus,
}: SelectRoleClientProps) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <main className="flex-grow flex items-center justify-center relative pt-16 pb-12">
      {/* Animated Background Element */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Decorative Glass Orbs */}
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-primary opacity-5 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-secondary opacity-5 rounded-full blur-[100px]"></div>
      </div>
      <div className="relative z-10 w-full max-w-container-max px-gutter grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Panel: Branding & Identity */}
        <div className="hidden md:flex flex-col justify-center space-y-8 pr-12">
          <div className="space-y-4">
            <h1 className="font-display-lg text-display-lg text-on-surface leading-tight">
              Une seule identité,<br />
              <span className="text-primary">tout un univers.</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
              Accédez en toute sécurité à vos services Ahizan préférés avec un compte unique, simple et robuste.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-[24px] bg-white border border-outline-variant/30 shadow-sm">
              <span className="material-symbols-outlined text-primary mb-3 text-[32px]">verified_user</span>
              <h3 className="font-label-md text-label-md text-on-surface mb-1">Sécurité Avancée</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Protection biométrique et MFA.</p>
            </div>
            <div className="p-6 rounded-[24px] bg-white border border-outline-variant/30 shadow-sm">
              <span className="material-symbols-outlined text-primary mb-3 text-[32px]">sync</span>
              <h3 className="font-label-md text-label-md text-on-surface mb-1">Synchronisation</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Vos données partout avec vous.</p>
            </div>
          </div>
        </div>

        {/* Right Panel: Authentication Card */}
        <div className="flex justify-center md:justify-end">
          <div className="bg-white w-full max-w-auth-card-width rounded-[28px] shadow-[0px_10px_30px_rgba(126,0,27,0.04)] p-10 flex flex-col relative overflow-hidden">
            {/* Progress Bar for MFA/Flow Step */}
            <div className="absolute top-0 left-0 w-full h-1 bg-surface-light">
              <div className="h-full bg-primary w-1/3"></div>
            </div>
            <div className="text-center mb-8">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Choisir un compte</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Sélectionnez le compte avec lequel vous souhaitez continuer.
              </p>
            </div>

            {/* Account List */}
            <div className="space-y-3 mb-8">
              {/* Account Item 1 (Client) */}
              <button
                onClick={() => { window.location.href = storefrontUrl; }}
                disabled={isPending}
                className="account-item group w-full flex items-center p-4 rounded-[20px] bg-surface-light hover:bg-white border-2 border-transparent hover:border-primary/20 transition-all duration-200 text-left relative overflow-hidden cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-white shadow-sm flex-shrink-0 bg-primary/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[24px]">person</span>
                </div>
                <div className="flex-grow min-w-0 pr-16">
                  <div className="flex items-center gap-2">
                    <span className="font-label-md text-label-md text-on-surface truncate">{customerName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider">Acheteur</span>
                  </div>
                  <span className="font-body-md text-body-md text-on-surface-variant block truncate">{customerEmail}</span>
                </div>
                <div className="continue-btn absolute right-4 flex items-center text-primary font-bold font-label-md text-label-md">
                  Continuer <span className="material-symbols-outlined ml-1">chevron_right</span>
                </div>
              </button>

              {/* Account Item 2 (Vendor) */}
              {hasVendor ? (
                <button
                  onClick={() => {
                    if (vendorStatus === 'PENDING') {
                      window.location.href = `${sellerUrl}/pending`;
                    } else if (vendorStatus === 'REJECTED') {
                      window.location.href = `${sellerUrl}/rejected`;
                    } else {
                      window.location.href = `${sellerUrl}/dashboard`;
                    }
                  }}
                  disabled={isPending}
                  className="account-item group w-full flex items-center p-4 rounded-[20px] bg-surface-light hover:bg-white border-2 border-transparent hover:border-primary/20 transition-all duration-200 text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-white shadow-sm flex-shrink-0 bg-primary/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[24px]">storefront</span>
                  </div>
                  <div className="flex-grow min-w-0 pr-16">
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md text-on-surface truncate">{vendorName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Vendeur</span>
                      {vendorStatus === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">EN ATTENTE</span>
                      )}
                      {vendorStatus === 'REJECTED' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">REJETÉ</span>
                      )}
                    </div>
                    <span className="font-body-md text-body-md text-on-surface-variant block truncate">{customerEmail}</span>
                  </div>
                  <div className="continue-btn absolute right-4 flex items-center text-primary font-bold font-label-md text-label-md">
                    Continuer <span className="material-symbols-outlined ml-1">chevron_right</span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => { window.location.href = `/register?redirectTo=${encodeURIComponent(sellerUrl + '/dashboard')}`; }}
                  disabled={isPending}
                  className="account-item group w-full flex items-center p-4 rounded-[20px] bg-surface-light hover:bg-white border-2 border-dashed border-outline-variant hover:border-primary/50 transition-all duration-200 text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-white shadow-sm flex-shrink-0 bg-primary/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[24px]">add_business</span>
                  </div>
                  <div className="flex-grow min-w-0 pr-16">
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md text-on-surface truncate font-semibold">Devenir Vendeur</span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Nouveau</span>
                    </div>
                    <span className="font-body-md text-body-md text-on-surface-variant block truncate">Créer une boutique et vendre vos produits</span>
                  </div>
                  <div className="continue-btn absolute right-4 flex items-center text-primary font-bold font-label-md text-label-md">
                    Créer <span className="material-symbols-outlined ml-1">add</span>
                  </div>
                </button>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4">
              <button
                onClick={handleLogout}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-light transition-colors font-label-md text-label-md cursor-pointer"
              >
                <span className="material-symbols-outlined">logout</span>
                {isPending ? 'Déconnexion...' : 'Déconnexion'}
              </button>
            </div>

            {/* Footer Help Link */}
            <div className="mt-8 pt-6 border-t border-surface-variant flex justify-center">
              <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
                Problème de connexion ? <a className="text-primary font-bold hover:underline" href="#">Visitez le centre d'aide</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
