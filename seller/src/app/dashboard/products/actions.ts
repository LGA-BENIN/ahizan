'use server';

import { revalidateTag } from 'next/cache';
import { mutate } from '@/lib/vendure/api';
import { CreateMyProductMutation, UpdateMyProductMutation, UpdateMyProductVariantMutation, CreateVendorFacetValueMutation, UploadVendorFileMutation, DeleteMyProductMutation } from '@/lib/vendure/vendor-product-mutations';

export async function createProductAction(prevState: any, formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseInt(formData.get('price') as string);
    const stock = parseInt(formData.get('stock') as string);
    const categoryId = formData.get('category') as string;
    const assetIds = JSON.parse(formData.get('assetIds') as string || '[]');

    try {
        const { data } = await mutate(CreateMyProductMutation, {
            input: {
                name,
                description,
                price,
                stock,
                facetValueIds: categoryId ? [categoryId] : [],
                assetIds,
                featuredAssetId: assetIds[0],
            },
        }, { useAuthToken: true });

        // revalidateTag('vendor-products'); // If you add tags to GetMyVendorProducts
        return { success: true, product: data.createMyProduct };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateProductAction(prevState: any, formData: FormData) {
    const id = formData.get('id') as string;
    const variantId = formData.get('variantId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') ? parseInt(formData.get('price') as string) : undefined;
    const stock = formData.get('stock') ? parseInt(formData.get('stock') as string) : undefined;
    const categoryId = formData.get('category') as string;
    const assetIds = JSON.parse(formData.get('assetIds') as string || '[]');

    try {
        await mutate(UpdateMyProductMutation, {
            id,
            input: {
                name,
                description,
                facetValueIds: categoryId ? [categoryId] : [],
                assetIds,
                featuredAssetId: assetIds[0],
            },
        }, { useAuthToken: true });

        if (variantId && (price !== undefined || stock !== undefined)) {
            await mutate(UpdateMyProductVariantMutation, {
                input: {
                    id: variantId,
                    price,
                    stock,
                },
            }, { useAuthToken: true });
        }

        // revalidateTag('vendor-products');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createCategoryAction(name: string, facetId: string) {
    try {
        const { data } = await mutate(CreateVendorFacetValueMutation, {
            input: { name, facetId: facetId },
        }, { useAuthToken: true });
        return { success: true, category: data.createVendorFacetValue };
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

export async function deleteProductAction(id: string) {
    try {
        await mutate(DeleteMyProductMutation, {
            id,
        }, { useAuthToken: true });

        revalidateTag('vendor-products');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
