import type { Metadata } from 'next';
import { rawQuery } from '@/lib/vendure/raw-api';
import { notFound } from 'next/navigation';
import { VendorShopClient } from './vendor-shop-client';
import { decodeId } from '@/lib/hash-utils';

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
                createdAt
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

async function resolveVendor(paramId: string) {
    if (!paramId) return null;

    // 1. Try decoded ID (if it was an encoded hash)
    const decoded = decodeId(paramId);
    if (decoded && decoded !== paramId) {
        const vendorByDecoded = await getVendorData(decoded);
        if (vendorByDecoded) return vendorByDecoded;
    }

    // 2. Try raw param directly (e.g. numeric ID '53' or string ID)
    const vendorByRaw = await getVendorData(paramId);
    if (vendorByRaw) return vendorByRaw;

    return null;
}

export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
    const { id: paramId } = await params;
    const vendor = await resolveVendor(paramId);
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
    const { id: paramId } = await params;
    const vendor = await resolveVendor(paramId);

    if (!vendor) {
        notFound();
    }

    return <VendorShopClient vendor={vendor} />;
}
