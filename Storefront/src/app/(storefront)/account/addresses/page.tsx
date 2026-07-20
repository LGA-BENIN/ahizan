import type { Metadata } from 'next';
import { AddressesClient } from './addresses-client';

export const metadata: Metadata = {
    title: 'Mes Adresses',
};

export default async function AddressesPage() {

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Mes Adresses</h1>
                <p className="text-muted-foreground mt-2">
                    Gérez vos adresses de livraison et de facturation enregistrées
                </p>
            </div>

            <AddressesClient addresses={[]} countries={[]} />
        </div>
    );
}