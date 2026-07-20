import { query } from '@/lib/vendure/api';
import { ProfileForm } from './profile-form';
import { unstable_noStore as noStore } from 'next/cache';
import { GetMyVendorFullProfileQuery } from '@/lib/vendure/queries';
import { gql } from 'graphql-tag';

const GET_REGISTRATION_FIELDS = gql`
    query GetRegistrationFields {
        registrationFields {
            id
            name
            label
            type
            options {
                label
                value
            }
            required
            order
            enabled
            description
            placeholder
        }
    }
`;

export default async function ProfilePage() {
    noStore();
    const { data } = await (query as any)(GetMyVendorFullProfileQuery, {}, { useAuthToken: true }).catch(() => ({ data: { myVendorProfile: null } }));
    const vendor = (data as any)?.myVendorProfile;

    if (!vendor) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Profil Vendeur Introuvable</h1>
                <p>Veuillez vous assurer que vous êtes connecté en tant que vendeur.</p>
            </div>
        );
    }

    // Fetch registration fields
    let registrationFields: any[] = [];
    try {
        const { data: fieldsData } = await (query as any)(GET_REGISTRATION_FIELDS);
        registrationFields = (fieldsData as any).registrationFields || [];
    } catch (e) {
        console.error('Failed to fetch registration fields:', e);
    }

    const sortedFields = [...registrationFields]
        .filter((f: any) => f.enabled)
        .sort((a: any, b: any) => a.order - b.order);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Profil de la Boutique</h1>
            <p className="text-muted-foreground">
                Gérez les informations de votre boutique.
            </p>

            <ProfileForm profile={vendor} fields={sortedFields} />
        </div>
    );
}
