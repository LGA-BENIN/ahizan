import { getAuthToken } from '@/lib/auth';
import { query } from '@/lib/vendure/api';
import { GetActiveCustomerQuery } from '@/lib/vendure/queries';
import { redirect } from 'next/navigation';
import { AuthorizeClient } from './authorize-client';
import { getUrlContext, sanitizeRedirectUrl } from '@/lib/url-utils';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { storefrontUrl, useProdUrls } = await getUrlContext();
  const redirectTo = sanitizeRedirectUrl(resolvedSearchParams.redirectTo, useProdUrls);

  const token = await getAuthToken();

  if (!token) {
    redirect(redirectTo ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}` : '/sign-in');
  }

  if (!redirectTo) {
    redirect(storefrontUrl);
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
      storefrontUrl={storefrontUrl}
    />
  );
}
