import type { Metadata } from 'next';
import { AddressesClient } from './addresses-client';
import { query } from '@/lib/vendure/api';
import { GetCustomerAddressesQuery, GetAvailableCountriesQuery } from '@/lib/vendure/queries';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Mes Adresses',
};

export default async function AddressesPage() {
    const [addressesRes, countriesRes] = await Promise.all([
        query(GetCustomerAddressesQuery, {}, { useAuthToken: true, fetch: { cache: 'no-store' } }),
        query(GetAvailableCountriesQuery, {}, { useAuthToken: false, fetch: { cache: 'force-cache' } })
    ]);

    const activeCustomer = addressesRes.data?.activeCustomer;
    if (!activeCustomer) {
        redirect('/sign-in');
    }

    const addresses = activeCustomer.addresses || [];
    const countries = countriesRes.data?.availableCountries || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Mes Adresses</h1>
                <p className="text-muted-foreground mt-2">
                    Gérez vos adresses de livraison et de facturation enregistrées
                </p>
            </div>

            <AddressesClient addresses={addresses as any} countries={countries as any} />
        </div>
    );
}