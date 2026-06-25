import type { Metadata } from 'next';
import { rawQuery } from '@/lib/vendure/raw-api';
import { notFound } from 'next/navigation';
import { VendorShopClient } from './vendor-shop-client';

interface VendorPageProps {
    params: Promise<{ id: string }>;
}

const GET_VENDOR_PROFILE = `
    query GetVendorProfile($id: ID!) {
        vendor(id: $id) {
            id
            name
            description
            address
            zone
            deliveryInfo
            returnPolicy
            rating
            ratingCount
            followersCount
            createdAt
            email
            phoneNumber
            website
            facebook
            instagram
            logo {
                preview
            }
            coverImage {
                preview
            }
            products {
                id
                name
                slug
                description
                enabled
                featuredAsset {
                    id
                    preview
                }
                collections {
                    id
                    name
                    slug
                }
                customFields {
                    approvalStatus
                }
                variants {
                    id
                    priceWithTax
                    stockLevel
                    customFields {
                        compareAtPrice
                        onPromotion
                        promotionalPrice
                    }
                }
            }
        }
    }
`;

async function getVendorData(id: string) {
    try {
        const data = await rawQuery(GET_VENDOR_PROFILE, {
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
        title: `${vendor.name} - Boutique Officielle | Ahizan`,
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
