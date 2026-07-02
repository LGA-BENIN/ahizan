import { getAuthToken } from '@/lib/auth';
import { query, mutate } from '@/lib/vendure/api';
import { GetActiveCustomerQuery, GetMyVendorProfileQuery } from '@/lib/vendure/queries';
import { AddClientRoleToExistingVendorMutation } from '@/lib/vendure/mutations';
import { redirect } from 'next/navigation';
import { SelectRoleClient } from './select-role-client';
import { getUrlContext } from '@/lib/url-utils';

export default async function Page() {
  const token = await getAuthToken();
  const { storefrontUrl, sellerUrl } = await getUrlContext();

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

    let customer = customerRes.data.activeCustomer;
    const vendor = vendorRes.data.myVendorProfile;

    // Si l'utilisateur a un profil Vendeur mais pas de profil Client,
    // on lui associe automatiquement le rôle Client en tâche de fond.
    if (!customer && vendor) {
      try {
        const addClientRoleRes = await mutate(AddClientRoleToExistingVendorMutation, {}, { token });
        if (addClientRoleRes.data?.addClientRoleToExistingVendor) {
          const customerRes2 = await query(GetActiveCustomerQuery, {}, { token });
          customer = customerRes2.data.activeCustomer;
        }
      } catch (err) {
        console.error('Failed to automatically add client role to vendor:', err);
      }
    }

    if (customer) {
      hasCustomer = true;
      customerName = `${customer.firstName} ${customer.lastName}`.trim() || 'Acheteur';
      customerEmail = customer.emailAddress;
    }

    if (vendor) {
      hasVendor = true;
      vendorName = vendor.name || 'Boutique Vendeur';
      vendorStatus = vendor.status;
    }
  } catch (err) {
    console.error('Failed to load profiles in select-role, delegating purge to sign-in:', err);
    redirect('/sign-in?purge=1');
  }

  if (!hasCustomer && !hasVendor) {
    redirect('/sign-in');
  }

  return (
    <SelectRoleClient
      customerName={customerName}
      customerEmail={customerEmail}
      vendorName={vendorName}
      storefrontUrl={storefrontUrl}
      sellerUrl={sellerUrl}
      hasVendor={hasVendor}
      vendorStatus={vendorStatus}
    />
  );
}
