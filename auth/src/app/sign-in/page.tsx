import { getAuthToken } from '@/lib/auth';
import { query } from '@/lib/vendure/api';
import { GetMyVendorProfileQuery } from '@/lib/vendure/queries';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { getUrlContext, sanitizeRedirectUrl } from '@/lib/url-utils';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; purge?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { storefrontUrl, sellerUrl, useProdUrls } = await getUrlContext();
  const redirectTo = sanitizeRedirectUrl(resolvedSearchParams.redirectTo, useProdUrls);

  const token = await getAuthToken();
  let isStale = resolvedSearchParams.purge === '1';

  if (token && !isStale) {
    try {
      const profileResult = await query(GetMyVendorProfileQuery, {}, { token });
      const vendor = profileResult.data?.myVendorProfile;

      if (vendor) {
        // Redirige vers la page de choix du portail si l'utilisateur a un profil vendeur
        redirect('/select-role');
      } else {
        // Si l'utilisateur est uniquement acheteur, on ne le redirige pas automatiquement.
        // On le laisse voir le formulaire de connexion (par exemple pour se connecter avec un autre compte).
      }
    } catch (e) {
      // CRITICAL: Next.js redirect() works by throwing a special NEXT_REDIRECT error.
      // We must re-throw it, otherwise the redirect is swallowed and the login form is shown instead.
      if (isRedirectError(e)) {
        throw e;
      }
      console.warn('Stale or invalid auth token detected, delegating purge to client:', e);
      isStale = true;
    }
  }

  return <LoginForm redirectTo={redirectTo} purgeStale={isStale} />;
}

