import { getAuthToken } from '@/lib/auth';
import { query } from '@/lib/vendure/api';
import { GetMyVendorProfileQuery } from '@/lib/vendure/queries';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { getUrlContext, sanitizeRedirectUrl } from '@/lib/url-utils';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { storefrontUrl, sellerUrl, useProdUrls } = await getUrlContext();
  const redirectTo = sanitizeRedirectUrl(resolvedSearchParams.redirectTo, useProdUrls);

  const token = await getAuthToken();

  if (token) {
    try {
      const profileResult = await query(GetMyVendorProfileQuery, {}, { token });
      const vendor = profileResult.data.myVendorProfile;

      if (redirectTo && redirectTo.includes('seller') && !vendor) {
        redirect('/select-role');
      }

      // Si l'utilisateur est déjà connecté, on gère son routage immédiat
      if (redirectTo && redirectTo.startsWith('http') && (
        redirectTo.includes('ahizan.com') || 
        redirectTo.includes('localhost')
      )) {
        redirect(redirectTo);
      }

      if (vendor) {
        if (vendor.status === 'PENDING') {
          redirect(`${sellerUrl}/pending`);
        } else if (vendor.status === 'REJECTED') {
          redirect(`${sellerUrl}/rejected`);
        } else if (vendor.status === 'ACTIVE') {
          redirect('/select-role');
        } else {
          redirect(`${sellerUrl}/dashboard`);
        }
      }
    } catch (e) {
      console.warn('User already logged in, but failed to fetch seller profile:', e);
    }

    redirect(storefrontUrl);
  }

  return <LoginForm redirectTo={redirectTo} />;
}
