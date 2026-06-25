import { getAuthToken } from '@/lib/auth';
import { query } from '@/lib/vendure/api';
import { GetMyVendorProfileQuery } from '@/lib/vendure/queries';
import { redirect } from 'next/navigation';
import { RegisterForm } from './register-form';
import { getUrlContext, sanitizeRedirectUrl } from '@/lib/url-utils';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { sellerUrl, useProdUrls } = await getUrlContext();
  const redirectTo = sanitizeRedirectUrl(resolvedSearchParams.redirectTo, useProdUrls);

  const token = await getAuthToken();
  let isAlreadyLoggedIn = false;

  if (token) {
    try {
      const profileResult = await query(GetMyVendorProfileQuery, {}, { token });
      const vendor = profileResult.data?.myVendorProfile;

      if (vendor) {
        if (vendor.status === 'PENDING') {
          redirect(`${sellerUrl}/pending`);
        } else if (vendor.status === 'REJECTED') {
          redirect(`${sellerUrl}/rejected`);
        } else {
          redirect(redirectTo || `${sellerUrl}/dashboard`);
        }
      } else {
        isAlreadyLoggedIn = true;
      }
    } catch (e) {
      console.warn('Failed to fetch vendor profile for logged-in user, showing registration form:', e);
      isAlreadyLoggedIn = true;
    }
  }

  return <RegisterForm redirectTo={redirectTo} isAlreadyLoggedIn={isAlreadyLoggedIn} />;
}
