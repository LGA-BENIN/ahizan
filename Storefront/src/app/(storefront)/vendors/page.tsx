import { rawQuery } from '@/lib/vendure/raw-api';
import { Metadata } from 'next';
import { VendorsListClient } from './vendors-list-client';

export const metadata: Metadata = {
    title: 'Boutiques Partenaires | Ahizan',
    description: 'Découvrez l\'ensemble de nos vendeurs et boutiques partenaires certifiés sur Ahizan.',
};

const GET_APPROVED_VENDORS = `
    query GetApprovedVendors($options: VendorListOptions) {
        vendors(options: $options) {
            items {
                id
                name
                zone
                address
                rating
                ratingCount
                description
                logo { preview }
                coverImage { preview }
            }
        }
    }
`;

export default async function VendorsPage() {
    let vendors = [];
    try {
        const data = await rawQuery(GET_APPROVED_VENDORS, {
            variables: {
                options: {
                    filter: { status: { eq: 'APPROVED' } },
                    sort: { rating: 'DESC' },
                },
            },
        });
        vendors = data?.vendors?.items || [];
    } catch (e) {
        console.error('[VENDORS_PAGE] Failed to fetch vendors', e);
    }

    return (
        <main className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-950 dark:text-white uppercase mb-3">
                        Nos Boutiques Partenaires
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 font-medium text-base">
                        Achetez directement auprès des meilleurs artisans, créateurs et commerçants certifiés et approuvés par la communauté Ahizan.
                    </p>
                    <div className="h-1 w-16 bg-primary mx-auto mt-5 rounded-full" />
                </div>

                <VendorsListClient initialVendors={vendors} />
            </div>
        </main>
    );
}
