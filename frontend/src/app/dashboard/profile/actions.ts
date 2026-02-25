'use server';

import { mutate } from '@/lib/vendure/api';
import { UpdateMyVendorProfileMutation } from '@/lib/vendure/mutations';
import { revalidatePath } from 'next/cache';

export async function updateProfileAction(
    prevState: { error?: string; success?: boolean } | undefined,
    formData: FormData
) {
    const name = formData.get('name') as string | null;
    const phoneNumber = formData.get('phoneNumber') as string | null;
    const address = formData.get('address') as string | null;
    const description = formData.get('description') as string | null;
    const zone = formData.get('zone') as string | null;
    const deliveryInfo = formData.get('deliveryInfo') as string | null;
    const returnPolicy = formData.get('returnPolicy') as string | null;
    const type = formData.get('type') as string | null;
    const website = formData.get('website') as string | null;
    const facebook = formData.get('facebook') as string | null;
    const instagram = formData.get('instagram') as string | null;

    // File fields
    const rccmFile = formData.get('rccmFile') as File | null;
    const ifuFile = formData.get('ifuFile') as File | null;
    const idCardFile = formData.get('idCardFile') as File | null;
    const logo = formData.get('logo') as File | null;
    const coverImage = formData.get('coverImage') as File | null;

    // Text fields that may come from dynamic registration fields
    const rccmNumber = formData.get('rccmNumber') as string | null;
    const ifuNumber = formData.get('ifuNumber') as string | null;
    const idCardNumber = formData.get('idCardNumber') as string | null;

    try {
        await mutate(UpdateMyVendorProfileMutation, {
            input: {
                name: name || undefined,
                phoneNumber: phoneNumber || undefined,
                address: address || undefined,
                description: description || undefined,
                zone: zone || undefined,
                deliveryInfo: deliveryInfo || undefined,
                returnPolicy: returnPolicy || undefined,
                type: type || undefined,
                website: website || undefined,
                facebook: facebook || undefined,
                instagram: instagram || undefined,
                rccmNumber: rccmNumber || undefined,
                ifuNumber: ifuNumber || undefined,
                idCardNumber: idCardNumber || undefined,
                rccmFile: (rccmFile && rccmFile.size > 0 ? rccmFile : undefined) as any,
                ifuFile: (ifuFile && ifuFile.size > 0 ? ifuFile : undefined) as any,
                idCardFile: (idCardFile && idCardFile.size > 0 ? idCardFile : undefined) as any,
                logo: (logo && logo.size > 0 ? logo : undefined) as any,
                coverImage: (coverImage && coverImage.size > 0 ? coverImage : undefined) as any,
            },
        } as any, { useAuthToken: true });

        revalidatePath('/dashboard/profile');
        return { success: true };
    } catch (error: any) {
        console.error('Profile update error:', error);
        return { error: error.message || 'Échec de la mise à jour du profil.' };
    }
}
