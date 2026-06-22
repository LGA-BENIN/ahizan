import { getAuthToken } from '@/lib/auth';
import { query } from '@/lib/vendure/api';
import { GetActiveCustomerQuery } from '@/lib/vendure/queries';
import { redirect } from 'next/navigation';
import { AuthorizeClient } from './authorize-client';

const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:3001';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const redirectTo = resolvedSearchParams.redirectTo;

  const token = await getAuthToken();

  if (!token) {
    redirect(redirectTo ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}` : '/sign-in');
  }

  if (!redirectTo) {
    redirect(STOREFRONT_URL);
  }

  let customerName = 'Utilisateur';

  try {
    const customerRes = await query(GetActiveCustomerQuery, {}, { token });
    const customer = customerRes.data.activeCustomer;
    if (customer) {
      customerName = `${customer.firstName} ${customer.lastName}`.trim() || 'Utilisateur';
    }
  } catch (err) {
    console.error('Failed to load profile in authorize:', err);
    redirect('/sign-in');
  }

  return (
    <AuthorizeClient
      customerName={customerName}
      redirectTo={redirectTo}
      storefrontUrl={STOREFRONT_URL}
    />
  );
}
