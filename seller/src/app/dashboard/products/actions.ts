'use server';

import { revalidateTag } from 'next/cache';
import { mutate } from '@/lib/vendure/api';
import { CreateMyProductMutation, UpdateMyProductMutation, UpdateMyProductVariantMutation, UploadVendorFileMutation, DeleteMyProductMutation, TagProductWithVariantOffersMutation, UpdateMyVariantOffersMutation } from '@/lib/vendure/vendor-product-mutations';
import { priceToSubunit } from '@/lib/format';

export async function createProductAction(prevState: any, formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const shortDescription = formData.get('shortDescription') as string;
    const price = priceToSubunit(parseInt(formData.get('price') as string) || 0);
    const stock = parseInt(formData.get('stock') as string) || 0;
    const sku = (formData.get('sku') as string) || undefined;
    const weight = formData.get('weight') ? parseFloat(formData.get('weight') as string) : undefined;
    const width = formData.get('width') ? parseFloat(formData.get('width') as string) : undefined;
    const height = formData.get('height') ? parseFloat(formData.get('height') as string) : undefined;
    const enabled = formData.get('enabled') === 'true';

    const categoryRaw = formData.get('category') as string;
    let collectionIds: string[] = [];
    if (categoryRaw) {
        if (categoryRaw.startsWith('[')) {
            try {
                collectionIds = JSON.parse(categoryRaw);
            } catch (e) {
                collectionIds = [categoryRaw];
            }
        } else {
            collectionIds = [categoryRaw];
        }
    }
    const assetIds = JSON.parse(formData.get('assetIds') as string || '[]');
    const featuredAssetId = formData.get('featuredAssetId') as string || null;
    const facetValueIds = JSON.parse(formData.get('facetValueIds') as string || '[]');
    const onPromotion = formData.get('onPromotion') === 'true';
    const promotionalPrice = priceToSubunit(parseInt(formData.get('promotionalPrice') as string) || 0);

    const deliveryTimeValue = formData.get('deliveryTimeValue') ? parseInt(formData.get('deliveryTimeValue') as string) : 2;
    const deliveryTimeUnit = (formData.get('deliveryTimeUnit') as string) || 'd';
    const condition = (formData.get('condition') as string) || 'NEW';

    // Multi-variants parsing
    const rawVariants = formData.get('variants') as string;
    let variants: any[] | undefined = undefined;
    if (rawVariants) {
        try {
            const parsed = JSON.parse(rawVariants);
            if (Array.isArray(parsed) && parsed.length > 0) {
                variants = parsed.map((v: any) => ({
                    name: v.name,
                    sku: v.sku || undefined,
                    price: priceToSubunit(parseInt(v.price) || 0),
                    stock: parseInt(v.stock) || 0,
                    onPromotion: v.onPromotion === true,
                    promotionalPrice: v.onPromotion ? priceToSubunit(parseInt(v.promotionalPrice) || 0) : undefined,
                    featuredAssetId: v.featuredAssetId || undefined,
                }));
            }
        } catch (e) {}
    }

    try {
        console.log(`[ACTION] Creating product: ${name}`);
        const { data } = await mutate(CreateMyProductMutation, {
            input: {
                name,
                description,
                shortDescription,
                price,
                stock,
                sku,
                weight,
                width,
                height,
                enabled,
                collectionIds,
                facetValueIds,
                assetIds,
                featuredAssetId: featuredAssetId || assetIds[0],
                onPromotion,
                promotionalPrice: onPromotion ? promotionalPrice : undefined,
                variants,
                deliveryTimeValue,
                deliveryTimeUnit,
                condition,
            },
        } as any, { useAuthToken: true });

        console.log(`[ACTION] Product created successfully: ${(data as any)?.createMyProduct?.id}`);
        return { success: true, product: (data as any)?.createMyProduct };
    } catch (e: any) {
        console.error(`[ACTION] Error creating product: ${e.message}`);
        return { success: false, error: e.message };
    }
}

export async function updateProductAction(prevState: any, formData: FormData) {
    const id = formData.get('id') as string;
    const variantId = formData.get('variantId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const shortDescription = formData.get('shortDescription') as string;
    const price = formData.get('price') ? priceToSubunit(parseInt(formData.get('price') as string)) : undefined;
    const stock = formData.get('stock') ? parseInt(formData.get('stock') as string) : undefined;
    const sku = (formData.get('sku') as string) || undefined;
    const weight = formData.get('weight') ? parseFloat(formData.get('weight') as string) : undefined;
    const width = formData.get('width') ? parseFloat(formData.get('width') as string) : undefined;
    const height = formData.get('height') ? parseFloat(formData.get('height') as string) : undefined;
    const categoryRaw = formData.get('category') as string;
    let collectionIds: string[] = [];
    if (categoryRaw) {
        if (categoryRaw.startsWith('[')) {
            try {
                collectionIds = JSON.parse(categoryRaw);
            } catch (e) {
                collectionIds = [categoryRaw];
            }
        } else {
            collectionIds = [categoryRaw];
        }
    }
    const enabled = formData.get('enabled') === 'true';
    const assetIds = JSON.parse(formData.get('assetIds') as string || '[]');
    const featuredAssetId = formData.get('featuredAssetId') as string || null;
    const facetValueIds = JSON.parse(formData.get('facetValueIds') as string || '[]');
    const onPromotion = formData.get('onPromotion') === 'true';
    const promotionalPrice = priceToSubunit(parseInt(formData.get('promotionalPrice') as string) || 0);

    const deliveryTimeValue = formData.get('deliveryTimeValue') ? parseInt(formData.get('deliveryTimeValue') as string) : undefined;
    const deliveryTimeUnit = formData.get('deliveryTimeUnit') as string || undefined;
    const condition = formData.get('condition') as string || undefined;

    // Multi-variants parsing
    const rawVariants = formData.get('variants') as string;
    let variants: any[] | undefined = undefined;
    if (rawVariants) {
        try {
            const parsed = JSON.parse(rawVariants);
            if (Array.isArray(parsed) && parsed.length > 0) {
                variants = parsed.map((v: any) => ({
                    id: v.id && !String(v.id).startsWith('new_') ? v.id : undefined,
                    name: v.name,
                    sku: v.sku || undefined,
                    price: priceToSubunit(parseInt(v.price) || 0),
                    stock: parseInt(v.stock) || 0,
                    onPromotion: v.onPromotion === true,
                    promotionalPrice: v.onPromotion ? priceToSubunit(parseInt(v.promotionalPrice) || 0) : undefined,
                    featuredAssetId: v.featuredAssetId || undefined,
                }));
            }
        } catch (e) {}
    }

    try {
        await mutate(UpdateMyProductMutation, {
            id,
            input: {
                name,
                description,
                shortDescription,
                collectionIds,
                facetValueIds,
                assetIds,
                featuredAssetId: featuredAssetId || assetIds[0],
                enabled,
                sku,
                weight,
                width,
                height,
                variants,
                deliveryTimeValue,
                deliveryTimeUnit,
                condition,
            },
        } as any, { useAuthToken: true });

        if (variantId && (price !== undefined || stock !== undefined || sku !== undefined || onPromotion !== undefined || promotionalPrice !== undefined)) {
            await mutate(UpdateMyProductVariantMutation, {
                input: {
                    id: variantId,
                    price,
                    stock,
                    sku,
                    onPromotion,
                    promotionalPrice: onPromotion ? promotionalPrice : undefined,
                },
            } as any, { useAuthToken: true });
        }

        // revalidateTag('vendor-products');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteProductAction(id: string) {
    try {
        await mutate(DeleteMyProductMutation, {
            id,
        } as any, { useAuthToken: true });

        revalidateTag('vendor-products', 'max');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateMyVariantOffersAction(offers: any[]) {
    try {
        const formattedOffers = offers.map(off => ({
            variantId: off.variantId,
            price: priceToSubunit(parseInt(off.price) || 0),
            stock: parseInt(off.stock) || 0,
            sku: off.sku || undefined,
            onPromotion: off.onPromotion === true,
            promotionalPrice: off.onPromotion ? priceToSubunit(parseInt(off.promotionalPrice) || 0) : undefined,
            featuredAssetId: off.featuredAssetId || undefined,
            deliveryTimeValue: off.deliveryTimeValue ? parseInt(off.deliveryTimeValue) : undefined,
            deliveryTimeUnit: off.deliveryTimeUnit || undefined,
            condition: off.condition || undefined,
        }));

        await mutate(UpdateMyVariantOffersMutation, {
            offers: formattedOffers,
        }, { useAuthToken: true });

        revalidateTag('vendor-products', 'max');
        return { success: true };
    } catch (e: any) {
        console.error('[ACTION] Error updating variant offers:', e);
        return { success: false, error: e.message };
    }
}

export async function uploadFileAction(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'No file provided' };

    try {
        const { data } = await mutate(UploadVendorFileMutation, {
            file: file,
        }, { useAuthToken: true });
        return { success: true, asset: data.uploadVendorFile };
    } catch (e: any) {
        console.error('Upload Error:', e);
        return { success: false, error: e.message };
    }
}

export async function tagProductWithVariantOffersAction(input: any) {
    try {
        const { data } = await mutate(TagProductWithVariantOffersMutation, {
            input,
        }, { useAuthToken: true });

        revalidateTag('vendor-products', 'max');
        return { success: true, offers: (data as any)?.tagProductWithVariantOffers };
    } catch (e: any) {
        console.error('[ACTION] Error tagging product with variant offers:', e.message);
        return { success: false, error: e.message };
    }
}



