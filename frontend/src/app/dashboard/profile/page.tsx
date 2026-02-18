import { query } from '@/lib/vendure/api';
import { gql } from 'graphql-tag';
import { ProfileForm } from './profile-form';
import { unstable_noStore as noStore } from 'next/cache';

const GET_MY_VENDOR_PROFILE = gql`
    query GetMyVendorProfile {
        myVendorProfile {
            id
            email
            type
            dynamicDetails
        }
    }
`;

export default async function ProfilePage() {
    noStore();
    const { data } = await (query as any)(GET_MY_VENDOR_PROFILE, {}, { useAuthToken: true }).catch(() => ({ data: { myVendorProfile: null } }));
    const vendor = (data as any)?.myVendorProfile;

    if (!vendor) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Vendor Profile Not Found</h1>
                <p>Please ensure you are logged in as a vendor.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Store Profile</h1>
            <p className="text-muted-foreground">
                Manage your store information and details.
            </p>

            <ProfileForm vendor={vendor} />
        </div>
    );
}
