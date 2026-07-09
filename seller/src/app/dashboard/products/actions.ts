'use server';

import { revalidateTag } from 'next/cache';
import { mutate } from '@/lib/vendure/api';
import { CreateMyProductMutation, UpdateMyProductMutation, UpdateMyProductVariantMutation, UploadVendorFileMutation, DeleteMyProductMutation } from '@/lib/vendure/vendor-product-mutations';
import { priceToSubunit } from '@/lib/format';

export async function createProductAction(prevState: any, formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = priceToSubunit(parseInt(formData.get('price') as string) || 0);
    const stock = parseInt(formData.get('stock') as string);
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

    try {
        console.log(`[ACTION] Creating product: ${name}`);
        const { data } = await mutate(CreateMyProductMutation, {
            input: {
                name,
                description,
                price,
                stock,
                collectionIds,
                facetValueIds,
                assetIds,
                featuredAssetId: featuredAssetId || assetIds[0],
                onPromotion,
                promotionalPrice: onPromotion ? promotionalPrice : undefined,
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
    const price = formData.get('price') ? priceToSubunit(parseInt(formData.get('price') as string)) : undefined;
    const stock = formData.get('stock') ? parseInt(formData.get('stock') as string) : undefined;
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

    try {
        await mutate(UpdateMyProductMutation, {
            id,
            input: {
                name,
                description,
                collectionIds,
                facetValueIds,
                assetIds,
                featuredAssetId: featuredAssetId || assetIds[0],
                enabled,
            },
        } as any, { useAuthToken: true });

        if (variantId && (price !== undefined || stock !== undefined || onPromotion !== undefined || promotionalPrice !== undefined)) {
            await mutate(UpdateMyProductVariantMutation, {
                input: {
                    id: variantId,
                    price,
                    stock,
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
