'use client';

import { useState, useTransition } from 'react';
import { loginAction } from './actions';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    if (redirectTo) {
      formData.append('redirectTo', redirectTo);
    }

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.success && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    });
  };

  const registerHref = redirectTo
    ? `/register?redirectTo=${encodeURIComponent(redirectTo)}`
    : '/register';

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <nav className="flex justify-between items-center w-full px-gutter py-4 max-w-container-max mx-auto">
          <div className="font-headline-md text-headline-md font-bold text-primary lg:text-white">
            Compte Ahizan
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-primary hover:scale-110 transition-transform cursor-pointer">language</button>
            <button className="material-symbols-outlined text-primary hover:scale-110 transition-transform cursor-pointer">help_outline</button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-stretch">
        {/* Left Panel: Branding & Story (Visible on lg+) */}
        <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#A70B2A] to-[#7F071F] p-20 flex-col justify-center">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-5%] left-[-5%] w-80 h-80 bg-primary opacity-20 rounded-full blur-3xl"></div>
          <div className="relative z-10 max-w-xl">
            <h1 className="font-display-lg text-display-lg text-white mb-6">
              Un seul compte pour tout votre univers Ahizan
            </h1>
            <p className="font-body-lg text-body-lg text-white/80 mb-12">
              Connectez-vous une seule fois et accédez à vos achats, ventes, commandes, favoris et services partenaires.
            </p>
            <div className="grid grid-cols-2 gap-6 relative">
              <div className="glass-card p-6 rounded-2xl animate-float-delayed">
                <span className="material-symbols-outlined text-white mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                <div className="text-white font-label-md text-label-md">Acheteur</div>
              </div>
              <div className="glass-card p-6 rounded-2xl animate-float translate-y-12">
                <span className="material-symbols-outlined text-white mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
                <div className="text-white font-label-md text-label-md">Vendeur</div>
              </div>
              <div className="glass-card p-6 rounded-2xl animate-float-slow -translate-y-4">
                <span className="material-symbols-outlined text-white mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>package_2</span>
                <div className="text-white font-label-md text-label-md">Commandes</div>
              </div>
              <div className="glass-card p-6 rounded-2xl animate-float translate-y-8">
                <span className="material-symbols-outlined text-white mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <div className="text-white font-label-md text-label-md">Paiements sécurisés</div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Panel: Authentication Card */}
        <section className="w-full lg:w-1/2 flex items-center justify-center p-gutter relative pt-24 pb-12 lg:py-12">
          <div className="bg-white rounded-[28px] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] w-full max-w-[450px] p-10 z-10 flex flex-col">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center mb-4 text-white">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
              </div>
              <div className="bg-surface-light px-4 py-1.5 rounded-full inline-flex items-center gap-2 mb-6 border border-outline-variant/30">
                <span className="material-symbols-outlined text-[16px] text-primary">security</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Connexion demandée par : Marketplace Ahizan</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface text-center mb-2">Connexion à votre compte</h2>
              <p className="font-body-md text-body-md text-on-surface-variant text-center">Accédez à tous vos services Ahizan avec un seul compte.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-on-surface ml-1" htmlFor="identifier">Email ou numéro de téléphone</label>
                <div className="relative group transition-all duration-200 focus-within:scale-[1.01]">
                  <input
                    className="w-full h-12 px-4 bg-surface-light border border-border/40 focus:border-primary/50 focus:ring-2 focus:ring-primary rounded-xl transition-all font-body-md text-on-surface outline-none"
                    id="identifier"
                    name="identifier"
                    placeholder="nom@exemple.com"
                    type="text"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-on-surface ml-1" htmlFor="password">Mot de passe</label>
                <div className="relative group transition-all duration-200 focus-within:scale-[1.01]">
                  <input
                    className="w-full h-12 px-4 bg-surface-light border border-border/40 focus:border-primary/50 focus:ring-2 focus:ring-primary rounded-xl transition-all font-body-md text-on-surface outline-none"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isPending}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary accent-primary" type="checkbox" name="remember" />
                  <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-primary transition-colors">Se souvenir de moi</span>
                </label>
                <a className="font-label-md text-label-md text-primary hover:underline" href="#">Mot de passe oublié ?</a>
              </div>

              <button
                className="w-full h-12 bg-primary hover:bg-primary-container text-white font-bold rounded-xl shadow-lg hover:shadow-primary/20 transition-all active:scale-95 duration-100 flex items-center justify-center gap-2 cursor-pointer"
                type="submit"
                disabled={isPending}
              >
                {isPending ? 'Connexion en cours...' : 'Se connecter'}
                <span className="material-symbols-outlined">login</span>
              </button>
            </form>

            <div className="flex items-center my-8">
              <div className="flex-grow border-t border-outline-variant"></div>
              <span className="px-4 font-label-sm text-label-sm text-on-surface-variant">ou continuer avec</span>
              <div className="flex-grow border-t border-outline-variant"></div>
            </div>

            <button className="w-full h-12 border border-outline-variant hover:bg-surface-light text-on-surface font-label-md text-label-md rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer" type="button">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
              </svg>
              Google
            </button>

            <div className="mt-8 text-center">
              <p className="font-body-md text-body-md text-on-surface-variant">
                Pas encore de compte ?
                <a className="text-primary font-bold hover:underline ml-1" href={registerHref}>Créer un compte</a>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-border z-10 w-full">
        <div className="flex flex-col items-center gap-base px-gutter py-8 w-full max-w-[450px] mx-auto text-center">
          <div className="w-full text-center mb-2">
            <span className="font-label-md text-label-md font-bold text-on-surface">Compte Ahizan</span>
          </div>
          <div className="flex justify-center gap-6">
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Confidentialité</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Conditions</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Aide</a>
          </div>
          <div className="w-full text-center mt-4">
            <p className="font-body-md text-body-md text-on-surface-variant opacity-60">© 2024 Ahizan Universe. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
