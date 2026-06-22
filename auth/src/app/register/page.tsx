import { getAuthToken } from '@/lib/auth';
import { query } from '@/lib/vendure/api';
import { GetMyVendorProfileQuery } from '@/lib/vendure/queries';
import { redirect } from 'next/navigation';
import { RegisterForm } from './register-form';

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
  let isAlreadyLoggedIn = false;

  if (token) {
    try {
      const profileResult = await query(GetMyVendorProfileQuery, {}, { token });
      const vendor = profileResult.data?.myVendorProfile;

      if (vendor) {
        if (vendor.status === 'PENDING') {
          redirect(`${SELLER_URL}/pending`);
        } else if (vendor.status === 'REJECTED') {
          redirect(`${SELLER_URL}/rejected`);
        } else {
          redirect(redirectTo || `${SELLER_URL}/dashboard`);
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
