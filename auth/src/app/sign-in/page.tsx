import { getAuthToken } from '@/lib/auth';
import { query } from '@/lib/vendure/api';
import { GetMyVendorProfileQuery } from '@/lib/vendure/queries';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';

const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:3001';
const SELLER_URL = process.env.SELLER_URL || 'http://localhost:3002';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const redirectTo = resolvedSearchParams.redirectTo;

  const token = await getAuthToken();

  if (token) {
    // Si l'utilisateur est déjà connecté, on gère son routage immédiat
    if (redirectTo && redirectTo.startsWith('http') && (
      redirectTo.includes('ahizan.com') || 
      redirectTo.includes('localhost')
    )) {
      redirect(redirectTo);
    }

    try {
      const profileResult = await query(GetMyVendorProfileQuery, {}, { token });
      const vendor = profileResult.data.myVendorProfile;

      if (vendor) {
        if (vendor.status === 'PENDING') {
          redirect(`${SELLER_URL}/pending`);
        } else if (vendor.status === 'REJECTED') {
          redirect(`${SELLER_URL}/rejected`);
        } else if (vendor.status === 'ACTIVE') {
          redirect('/select-role');
        } else {
          redirect(`${SELLER_URL}/dashboard`);
        }
      }
    } catch (e) {
      console.warn('User already logged in, but failed to fetch seller profile:', e);
    }

    redirect(STOREFRONT_URL);
  }

  return <LoginForm redirectTo={redirectTo} />;
}
