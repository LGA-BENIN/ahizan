'use client';

import { useState, useTransition } from 'react';
import { registerClientAction, registerVendorAction, checkEmailRolesAction } from './actions';

interface RegisterFormProps {
  redirectTo?: string;
}

type EmailCheckState = 'idle' | 'checking' | 'clear' | 'conflict';

interface EmailRolesResult {
  exists: boolean;
  hasClientRole: boolean;
  hasVendorRole: boolean;
}

export function RegisterForm({ redirectTo }: RegisterFormProps) {
  const [role, setRole] = useState<'client' | 'vendor'>(redirectTo && redirectTo.includes('seller') ? 'vendor' : 'client');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emailCheckState, setEmailCheckState] = useState<EmailCheckState>('idle');
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [conflictLoginUrl, setConflictLoginUrl] = useState<string | null>(null);

  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value.trim();
    if (!email || !email.includes('@')) return;

    setEmailCheckState('checking');
    setConflictMessage(null);
    setConflictLoginUrl(null);

    try {
      const result: EmailRolesResult = await checkEmailRolesAction(email);

      if (!result.exists) {
        setEmailCheckState('clear');
        return;
      }

      const loginUrl = `/sign-in?redirectTo=${encodeURIComponent(
        redirectTo || (role === 'vendor' ? 'https://seller.ahizan.com/onboarding' : 'https://ahizan.com')
      )}`;

      if (result.hasClientRole && result.hasVendorRole) {
        setEmailCheckState('conflict');
        setConflictMessage('Cette adresse e-mail est déjà associée à un compte Ahizan complet. Veuillez vous connecter pour accéder à votre espace.');
        setConflictLoginUrl(loginUrl);
        return;
      }

      if (role === 'vendor' && result.hasClientRole && !result.hasVendorRole) {
        setEmailCheckState('conflict');
        setConflictMessage('Cette adresse appartient déjà à un compte Client Ahizan. Connectez-vous pour ajouter le rôle Vendeur à votre compte existant.');
        setConflictLoginUrl(loginUrl);
        return;
      }

      if (role === 'client' && result.hasVendorRole && !result.hasClientRole) {
        setEmailCheckState('conflict');
        setConflictMessage('Cette adresse appartient déjà à un compte Vendeur Ahizan. Connectez-vous pour ajouter le rôle Client à votre compte existant.');
        setConflictLoginUrl(loginUrl);
        return;
      }

      if ((role === 'client' && result.hasClientRole) || (role === 'vendor' && result.hasVendorRole)) {
        setEmailCheckState('conflict');
        setConflictMessage('Cette adresse e-mail est déjà utilisée. Veuillez vous connecter à votre compte existant.');
        setConflictLoginUrl(loginUrl);
        return;
      }

      setEmailCheckState('clear');
    } catch {
      setEmailCheckState('clear');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (emailCheckState === 'conflict') return;

    setError(null);
    const formElement = event.currentTarget;
    const password = (formElement.elements.namedItem('password') as HTMLInputElement)?.value;
    const confirmPassword = (formElement.elements.namedItem('confirmPassword') as HTMLInputElement)?.value;

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    const formData = new FormData(formElement);
    if (redirectTo) formData.append('redirectTo', redirectTo);

    startTransition(async () => {
      const result = role === 'client'
        ? await registerClientAction(formData)
        : await registerVendorAction(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.success && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    });
  };

  const loginHref = redirectTo
    ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
    : '/sign-in';

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      <section className="hidden md:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0d213d] to-[#071325] items-center justify-center p-12">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-white opacity-5 blur-[80px]"></div>
        <div className="relative z-10 max-w-lg text-white">
          <div className="mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 font-label-md text-label-md mb-6">
              {role === 'vendor' ? 'Espace Vendeur Ahizan' : 'Plateforme de Confiance'}
            </span>
            <h1 className="font-display-lg text-display-lg mb-6 leading-tight">
              {role === 'vendor'
                ? 'Lancez et développez votre activité en ligne au Bénin.'
                : 'Votre compte, tous vos achats.'}
            </h1>
            <p className="font-body-lg text-body-lg text-white/90">
              {role === 'vendor'
                ? "Vendez vos produits à des milliers de clients grâce à une boutique en ligne clé en main, des paiements sécurisés et une gestion simplifiée."
                : "Inscrivez-vous pour suivre vos commandes, enregistrer vos favoris, profiter d'offres personnalisées et acheter en toute sécurité sur Ahizan."}
            </p>
          </div>
          <div className="relative rounded-[28px] overflow-hidden shadow-2xl border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d213d]/80 to-transparent z-10"></div>
            <img className="w-full aspect-[4/3] object-cover" src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80" alt="Sécurité numérique" />
            <div className="absolute bottom-6 left-6 right-6 z-20">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">verified_user</span>
                  <span className="font-label-md text-label-md">Certifié ISO 27001 - Standard de Sécurité Global</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full md:w-1/2 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface pt-24 md:pt-0">
        <div className="w-full max-w-auth-card-width bg-white rounded-[28px] p-8 md:p-10 shadow-[0px_10px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-center mb-6">
            <img src="/logo-ahizan-official.svg" alt="Ahizan Logo" className="h-12 w-auto object-contain" />
          </div>
          <div className="mb-6">
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-3 text-center">
              Créer votre compte Ahizan
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Un compte unique pour acheter, vendre et gérer vos services.
            </p>
          </div>

          <div className="flex rounded-xl bg-surface-light p-1 border border-outline-variant/30 mb-6">
            <button
              type="button"
              onClick={() => { setRole('client'); setEmailCheckState('idle'); setConflictMessage(null); }}
              disabled={isPending}
              className={`flex-1 py-2.5 text-center rounded-lg font-label-md text-label-md transition-all cursor-pointer ${role === 'client' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Je souhaite Acheter
            </button>
            <button
              type="button"
              onClick={() => { setRole('vendor'); setEmailCheckState('idle'); setConflictMessage(null); }}
              disabled={isPending}
              className={`flex-1 py-2.5 text-center rounded-lg font-label-md text-label-md transition-all cursor-pointer ${role === 'vendor' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Je souhaite Vendre
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="group">
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 ml-1">Nom complet</label>
                <input
                  name="name"
                  required
                  disabled={isPending}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-surface-light font-body-md text-body-md transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                  placeholder="Jean Dupont"
                  type="text"
                />
              </div>
              <div className="group">
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 ml-1">Email</label>
                <div className="relative">
                  <input
                    name="emailAddress"
                    required
                    disabled={isPending}
                    className={`w-full h-12 px-4 rounded-xl border bg-surface-light font-body-md text-body-md transition-all focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none pr-10
                      ${emailCheckState === 'conflict' ? 'border-red-400 focus:border-red-400' : ''}
                      ${emailCheckState === 'clear' ? 'border-green-400 focus:border-green-400' : ''}
                      ${!['conflict', 'clear'].includes(emailCheckState) ? 'border-border focus:border-primary' : ''}
                    `}
                    placeholder="jean.dupont@exemple.com"
                    type="email"
                    onBlur={handleEmailBlur}
                    onChange={() => {
                      if (emailCheckState !== 'idle') {
                        setEmailCheckState('idle');
                        setConflictMessage(null);
                      }
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailCheckState === 'checking' && (
                      <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    )}
                    {emailCheckState === 'clear' && (
                      <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                    {emailCheckState === 'conflict' && (
                      <svg className="h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    )}
                  </div>
                </div>
                {emailCheckState === 'conflict' && conflictMessage && (
                  <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-sm text-amber-800 mb-3">{conflictMessage}</p>
                    {conflictLoginUrl && (
                      <a
                        href={conflictLoginUrl}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Se connecter
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="group">
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 ml-1">Numéro de téléphone</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant">+229</span>
                  <input
                    name="phoneNumber"
                    required
                    disabled={isPending}
                    pattern="^[0-9\s]{10,14}$"
                    maxLength={14}
                    className="w-full h-12 pl-16 pr-4 rounded-xl border border-border bg-surface-light font-body-md text-body-md transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                    placeholder="01 XX XX XX XX"
                    type="tel"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 ml-1">Mot de passe</label>
                  <input
                    name="password"
                    required
                    disabled={isPending}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-surface-light font-body-md text-body-md transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                    placeholder="••••••••"
                    type="password"
                  />
                </div>
                <div className="group">
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 ml-1">Confirmation</label>
                  <input
                    name="confirmPassword"
                    required
                    disabled={isPending}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-surface-light font-body-md text-body-md transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                    placeholder="••••••••"
                    type="password"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-primary" id="terms" type="checkbox" required />
              <label className="font-body-md text-body-md text-on-surface-variant leading-snug" htmlFor="terms">
                J'accepte les <a className="text-primary hover:underline font-label-md" href="#">conditions d'utilisation</a> et la politique de confidentialité.
              </label>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-4 pt-2">
              <button
                type="submit"
                disabled={isPending || emailCheckState === 'conflict' || emailCheckState === 'checking'}
                className="w-full h-12 bg-primary text-white font-label-md text-label-md rounded-xl hover:bg-primary-container transition-all active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Inscription en cours...' : 'Créer mon compte'}
              </button>
            </div>

            <p className="text-center font-body-md text-body-md text-on-surface-variant pt-2">
              Déjà un compte ? <a className="text-primary font-label-md hover:underline decoration-2 underline-offset-4" href={loginHref}>Se connecter</a>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
