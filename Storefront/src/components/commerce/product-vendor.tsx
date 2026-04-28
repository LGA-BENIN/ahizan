import { rawQuery } from '@/lib/vendure/raw-api';
import { VendorBadge } from './vendor-badge';

const GET_PRODUCT_VENDOR = `
    query GetProductVendor($slug: String!) {
        product(slug: $slug) {
            id
            customFields {
                vendor {
                    id
                    name
                    zone
                    rating
                    ratingCount
                }
            }
        }
    }
`;

interface ProductVendorProps {
    productSlug: string;
}

export async function ProductVendor({ productSlug }: ProductVendorProps) {
    try {
        const data = await rawQuery(GET_PRODUCT_VENDOR, {
            variables: { slug: productSlug },
        });
        const vendor = data?.product?.customFields?.vendor;
        if (!vendor) return null;
        return <VendorBadge vendor={vendor} />;
    } catch {
        return null;
    }
}
