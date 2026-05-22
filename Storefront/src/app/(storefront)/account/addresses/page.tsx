import type { Metadata } from 'next';
import { AddressesClient } from './addresses-client';

export const metadata: Metadata = {
    title: 'Addresses',
};

export default async function AddressesPage() {

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Addresses</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your saved shipping and billing addresses
                </p>
            </div>

            <AddressesClient addresses={[]} countries={[]} />
        </div>
    );
}