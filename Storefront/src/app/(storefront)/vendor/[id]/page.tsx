import { rawQuery } from '@/lib/vendure/raw-api';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VendorShopClient } from './vendor-shop-client';

interface VendorPageProps {
    params: Promise<{ id: string }>;
}

const GET_VENDOR_DETAIL = `
    query GetVendorDetail($id: ID!) {
        vendor(id: $id) {
            id
            name
            description
            address
            phoneNumber
            email
            zone
            deliveryInfo
            returnPolicy
            rating
            ratingCount
            followersCount
            facebook
            instagram
            website
            logo { preview }
            coverImage { preview }
            products {
                id
                name
                slug
                enabled
                featuredAsset { preview }
                customFields {
                    approvalStatus
                }
                collections {
                    id
                    name
                    slug
                }
                variants {
                    id
                    priceWithTax
                }
            }
        }
    }
`;

async function getVendorData(id: string) {
    try {
        const data = await rawQuery(GET_VENDOR_DETAIL, {
            variables: { id },
        });
        return data?.vendor || null;
    } catch (e) {
        console.error(`[VENDOR_PAGE] Failed to fetch vendor detail for id ${id}`, e);
        return null;
    }
}

export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
    const { id } = await params;
    const vendor = await getVendorData(id);
    if (!vendor) {
        return {
            title: 'Boutique introuvable | Ahizan',
        };
    }
    return {
        title: `${vendor.name} | Boutique Partenaire Ahizan`,
        description: vendor.description || `Découvrez l'ensemble des produits de la boutique ${vendor.name} sur Ahizan.`,
    };
}

export default async function VendorDetailPage({ params }: VendorPageProps) {
    const { id } = await params;
    const vendor = await getVendorData(id);

    if (!vendor) {
        notFound();
    }

    return <VendorShopClient vendor={vendor} />;
}
