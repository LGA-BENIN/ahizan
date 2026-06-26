import { getUrlContext } from '@/lib/url-utils';

export default async function VerifyPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; redirectTo?: string }>;
}) {
  const resolvedParams = await searchParams;
  const { storefrontUrl, sellerUrl } = await getUrlContext();
  const isVendor = resolvedParams.role === 'vendor';

  const continueUrl = isVendor ? `${sellerUrl}/onboarding` : (resolvedParams.redirectTo || storefrontUrl);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-surface font-body-md text-on-surface">
      <header className="fixed top-0 left-0 right-0 z-50">
        <nav className="flex justify-between items-center w-full px-gutter py-4 max-w-container-max mx-auto">
          <a href="/sign-in" className="flex items-center gap-2">
            <img src="/logo-ahizan-official.svg" alt="Ahizan Logo" className="h-8 w-auto object-contain brightness-0 invert lg:brightness-100 lg:invert-0" />
            <span className="font-headline-md text-headline-md font-bold text-primary lg:text-white">Ahizan</span>
          </a>
        </nav>
      </header>

      <main className="flex-grow flex items-stretch">
        <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0d213d] to-[#071325] p-20 flex-col justify-center">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-5%] left-[-5%] w-80 h-80 bg-primary opacity-20 rounded-full blur-3xl"></div>
          <div className="relative z-10 max-w-xl">
            <h1 className="font-display-lg text-display-lg text-white mb-6">
              Vérification de compte
            </h1>
            <p className="font-body-lg text-body-lg text-white/80 mb-12">
              Plus qu'une étape pour finaliser la création de votre espace Ahizan sécurisé.
            </p>
          </div>
        </section>

        <section className="w-full lg:w-1/2 flex items-center justify-center p-gutter relative pt-24 pb-12 lg:py-12">
          <div className="bg-white rounded-[28px] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] w-full max-w-[480px] p-10 z-10 flex flex-col text-center">
            <div className="flex items-center justify-center mb-6">
              <img src="/logo-ahizan-official.svg" alt="Ahizan Logo" className="h-12 w-auto object-contain" />
            </div>

            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-success text-[36px]">mark_email_unread</span>
            </div>

            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-3">Vérifiez votre boîte e-mail</h2>
            
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 leading-relaxed">
              Nous avons envoyé un lien de confirmation à votre adresse e-mail. Veuillez vérifier votre boîte de réception (et votre dossier spams) puis cliquer sur le lien pour activer votre compte.
            </p>

            <div className="p-4 bg-surface-light rounded-xl border border-border/40 text-sm text-on-surface-variant mb-8">
              {isVendor ? (
                <span>Une fois vérifié, vous pourrez soumettre les informations de votre boutique.</span>
              ) : (
                <span>Une fois vérifié, vous pourrez profiter pleinement de l'expérience Ahizan.</span>
              )}
            </div>

            <a
              href={continueUrl}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-label-lg text-label-lg rounded-xl flex items-center justify-center shadow-md transition-all cursor-pointer"
            >
              J'ai vérifié mon e-mail, continuer
            </a>

            <div className="mt-6">
              <a href="/sign-in" className="text-sm text-on-surface-variant hover:text-primary underline">
                Retour à la page de connexion
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
