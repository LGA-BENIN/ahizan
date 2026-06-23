'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registerClientAction, registerVendorAction } from './actions';

interface RegisterFormProps {
  redirectTo?: string;
  isAlreadyLoggedIn?: boolean;
}

export function RegisterForm({ redirectTo }: RegisterFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<'client' | 'vendor'>('client');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formElement = event.currentTarget;

    const password = formElement.password.value;
    const confirmPassword = formElement.confirmPassword.value;

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    const formData = new FormData(formElement);
    if (redirectTo) {
      formData.append('redirectTo', redirectTo);
    }

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
      {/* Left Column: Branding Panel */}
      <section className="hidden md:flex w-1/2 relative overflow-hidden bg-primary items-center justify-center p-12">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary-container opacity-20 blur-[100px]"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-tertiary-container opacity-10 blur-[80px]"></div>
        <div className="relative z-10 max-w-lg text-on-primary">
          <div className="mb-12">
            <span className="inline-block px-4 py-1 rounded-full glass-accent font-label-md text-label-md mb-6">Plateforme de Confiance</span>
            <h1 className="font-display-lg text-display-lg mb-6 leading-tight">Sécurité sans compromis.</h1>
            <p className="font-body-lg text-body-lg text-on-primary-container opacity-90">
              Accédez à tout l'univers Ahizan avec un identifiant unique. Plus simple, plus rapide, et conçu pour votre sérénité digitale.
            </p>
          </div>
          <div className="relative rounded-[28px] overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>
            <img className="w-full aspect-[4/3] object-cover" src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80" alt="Sécurité numérique" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="p-4 glass-accent rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-fixed">verified_user</span>
                  <span className="font-label-md text-label-md">Certifié ISO 27001 - Standard de Sécurité Global</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: Authentication Form */}
      <section className="w-full md:w-1/2 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface pt-24 md:pt-0">
        <div className="w-full max-w-auth-card-width bg-white rounded-[28px] p-8 md:p-10 shadow-[0px_10px_30px_rgba(0,0,0,0.04)]">
          <div className="mb-6">
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-3">
              Créer votre compte Ahizan
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Un compte unique pour acheter, vendre et gérer vos services.
            </p>
          </div>

          {/* Form Role Selector */}
          <div className="flex rounded-xl bg-surface-light p-1 border border-outline-variant/30 mb-6">
            <button
              type="button"
              onClick={() => setRole('client')}
              disabled={isPending}
              className={`flex-1 py-2.5 text-center rounded-lg font-label-md text-label-md transition-all cursor-pointer ${role === 'client' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Je souhaite Acheter
            </button>
            <button
              type="button"
              onClick={() => setRole('vendor')}
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
                <input
                  name="emailAddress"
                  required
                  disabled={isPending}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-surface-light font-body-md text-body-md transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                  placeholder="jean.dupont@exemple.com"
                  type="email"
                />
              </div>
              <div className="group">
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 ml-1">Numéro de téléphone</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body-md text-on-surface-variant">+229</span>
                  <input
                    name="phoneNumber"
                    required
                    disabled={isPending}
                    className="w-full h-12 pl-16 pr-4 rounded-xl border border-border bg-surface-light font-body-md text-body-md transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                    placeholder="97 00 00 00"
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

            {/* Terms Checkbox */}
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

            {/* CTA Buttons */}
            <div className="space-y-4 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-12 bg-primary text-white font-label-md text-label-md rounded-xl hover:bg-primary-container transition-all active:scale-[0.98] shadow-sm cursor-pointer"
              >
                {isPending ? 'Inscription en cours...' : 'Créer mon compte'}
              </button>
            </div>

            {/* Login Link */}
            <p className="text-center font-body-md text-body-md text-on-surface-variant pt-2">
              Déjà un compte ? <a className="text-primary font-label-md hover:underline decoration-2 underline-offset-4" href={loginHref}>Se connecter</a>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
