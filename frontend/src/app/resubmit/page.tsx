import { query } from '@/lib/vendure/api';
import { GetMyVendorFullProfileQuery } from '@/lib/vendure/queries';
import { redirect } from 'next/navigation';
import { gql } from 'graphql-tag';
import ResubmitForm from './resubmit-form';

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

export default async function ResubmitPage() {
    // Fetch vendor profile server-side (requires auth)
    let profile: any = null;
    try {
        const { data } = await query(GetMyVendorFullProfileQuery, {}, { useAuthToken: true });
        profile = data.myVendorProfile;
    } catch (e) {
        console.error('Failed to fetch vendor profile for resubmit:', e);
    }

    // Only rejected vendors can resubmit
    if (!profile) {
        redirect('/sign-in');
    }
    if (profile.status !== 'REJECTED') {
        redirect('/dashboard');
    }

    // Fetch registration fields server-side (public query, no auth needed)
    let registrationFields: any[] = [];
    try {
        const { data } = await query(GET_REGISTRATION_FIELDS as any);
        registrationFields = data.registrationFields || [];
    } catch (e) {
        console.error('Failed to fetch registration fields:', e);
    }

    // Sort by order
    const sortedFields = [...registrationFields]
        .filter((f) => f.enabled)
        .sort((a, b) => a.order - b.order);

    return <ResubmitForm profile={profile} fields={sortedFields} />;
}
