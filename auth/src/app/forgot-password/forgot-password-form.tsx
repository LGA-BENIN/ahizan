'use client';

import { useState, useTransition } from 'react';
import { requestPasswordResetAction } from './actions';

export function ForgotPasswordForm({ redirectTo }: { redirectTo?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await requestPasswordResetAction(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSubmitted(true);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-surface font-body-md text-on-surface">
      <header className="fixed top-0 left-0 right-0 z-50">
        <nav className="flex justify-between items-center w-full px-gutter py-4 max-w-container-max mx-auto">
          <div className="flex items-center gap-2">
            <a href={redirectTo ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}` : '/sign-in'} className="flex items-center gap-2">
              <img src="/logo-ahizan-official.svg" alt="Ahizan Logo" className="h-8 w-auto object-contain brightness-0 invert lg:brightness-100 lg:invert-0" />
              <span className="font-headline-md text-headline-md font-bold text-primary lg:text-white">Ahizan</span>
            </a>
          </div>
        </nav>
      </header>

      <main className="flex-grow flex items-stretch">
        <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0d213d] to-[#071325] p-20 flex-col justify-center">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-5%] left-[-5%] w-80 h-80 bg-primary opacity-20 rounded-full blur-3xl"></div>
          <div className="relative z-10 max-w-xl">
            <h1 className="font-display-lg text-display-lg text-white mb-6">
              Récupération de votre compte Ahizan
            </h1>
            <p className="font-body-lg text-body-lg text-white/80 mb-12">
              Nous allons vous envoyer des instructions sécurisées pour réinitialiser votre mot de passe et retrouver l'accès à l'ensemble de vos portails Ahizan.
            </p>
          </div>
        </section>

        <section className="w-full lg:w-1/2 flex items-center justify-center p-gutter relative pt-24 pb-12 lg:py-12">
          <div className="bg-white rounded-[28px] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] w-full max-w-[450px] p-10 z-10 flex flex-col">
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <img src="/logo-ahizan-official.svg" alt="Ahizan Logo" className="h-12 w-auto object-contain" />
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface text-center mb-2">Mot de passe oublié ?</h2>
              <p className="font-body-md text-body-md text-on-surface-variant text-center">
                Entrez l'adresse email associée à votre compte Ahizan.
              </p>
            </div>

            {submitted ? (
              <div className="text-center space-y-6">
                <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">
                  Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation dans quelques instants.
                </div>
                <a
                  href={redirectTo ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}` : '/sign-in'}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-label-lg text-label-lg rounded-xl flex items-center justify-center shadow-md transition-all cursor-pointer"
                >
                  Retour à la connexion
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="font-label-md text-label-md text-on-surface ml-1" htmlFor="email">Adresse Email</label>
                  <input
                    className="w-full h-12 px-4 bg-surface-light border border-border/40 focus:border-primary/50 focus:ring-2 focus:ring-primary rounded-xl transition-all font-body-md text-on-surface outline-none"
                    id="email"
                    name="email"
                    placeholder="nom@exemple.com"
                    type="email"
                    required
                    disabled={isPending}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-label-lg text-label-lg rounded-xl flex items-center justify-center shadow-md transition-all cursor-pointer"
                >
                  {isPending ? 'Envoi en cours...' : 'Envoyer les instructions'}
                </button>

                <div className="text-center">
                  <a
                    href={redirectTo ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}` : '/sign-in'}
                    className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
                  >
                    Retour à la connexion
                  </a>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
