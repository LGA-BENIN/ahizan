import { getAuthToken } from '@/lib/auth';
import { query } from '@/lib/vendure/api';
import { GetActiveCustomerQuery, GetMyVendorProfileQuery } from '@/lib/vendure/queries';
import { redirect } from 'next/navigation';
import { SelectRoleClient } from './select-role-client';

const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:3001';
const SELLER_URL = process.env.SELLER_URL || 'http://localhost:3002';

export default async function Page() {
  const token = await getAuthToken();

  if (!token) {
    redirect('/sign-in');
  }

  let customerName = 'Acheteur';
  let customerEmail = '';
  let vendorName = 'Boutique Vendeur';
  let hasVendor = false;
  let hasCustomer = false;
  let vendorStatus = 'ACTIVE';

  try {
    const [customerRes, vendorRes] = await Promise.all([
      query(GetActiveCustomerQuery, {}, { token }),
      query(GetMyVendorProfileQuery, {}, { token }),
    ]);

    const customer = customerRes.data.activeCustomer;
    if (customer) {
      hasCustomer = true;
      customerName = `${customer.firstName} ${customer.lastName}`.trim() || 'Acheteur';
      customerEmail = customer.emailAddress;
    }

    const vendor = vendorRes.data.myVendorProfile;
    if (vendor) {
      hasVendor = true;
      vendorName = vendor.name || 'Boutique Vendeur';
      vendorStatus = vendor.status;
    }
  } catch (err) {
    console.error('Failed to load profiles in select-role:', err);
    redirect('/sign-in');
  }

  if (!hasCustomer && !hasVendor) {
    redirect('/sign-in');
  }

  return (
    <SelectRoleClient
      customerName={customerName}
      customerEmail={customerEmail}
      vendorName={vendorName}
      storefrontUrl={STOREFRONT_URL}
      sellerUrl={SELLER_URL}
      hasVendor={hasVendor}
      vendorStatus={vendorStatus}
    />
  );
}
