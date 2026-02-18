'use server';

import { mutate } from '@/lib/vendure/api';
import { ApplyToBecomeVendorMutation, UpdateMyVendorProfileMutation } from '@/lib/vendure/mutations';
import { redirect } from 'next/navigation';

export async function registerVendor(prevState: any, formData: FormData) {
    try { require('fs').appendFileSync('frontend-debug.log', `[${new Date().toISOString()}] registerVendor called\n`); } catch { }

    const shopName = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const description = (formData.get('description') || formData.get('shopDescription')) as string;
    const address = formData.get('address') as string;

    const type = formData.get('type') as string || 'INDIVIDUAL';
    const deliveryInfo = formData.get('deliveryInfo') as string;
    const returnPolicy = formData.get('returnPolicy') as string;
    const zone = formData.get('zone') as string;

    const rccmNumber = formData.get('rccmNumber') as string;
    const rccmFile = formData.get('rccmFile') as File;
    const ifuNumber = formData.get('ifuNumber') as string;
    const ifuFile = formData.get('ifuFile') as File;
    const idCardNumber = formData.get('idCardNumber') as string;
    const idCardFile = formData.get('idCardFile') as File;

    const website = formData.get('website') as string;
    const facebook = formData.get('facebook') as string;
    const instagram = formData.get('instagram') as string;

    const logo = formData.get('logo') as File;
    const coverImage = formData.get('coverImage') as File;

    console.log('FormData Keys:', Array.from(formData.keys()));

    try {
        const { data } = await mutate(ApplyToBecomeVendorMutation, {
            input: {
                name: shopName,
                firstName,
                lastName,
                email,
                phoneNumber,
                password,
                description,
                address,
                type,
                deliveryInfo,
                returnPolicy,
                zone,
                rccmNumber,
                rccmFile: rccmFile?.size > 0 ? rccmFile : undefined,
                ifuNumber,
                ifuFile: ifuFile?.size > 0 ? ifuFile : undefined,
                idCardNumber,
                idCardFile: idCardFile?.size > 0 ? idCardFile : undefined,
                website,
                facebook,
                instagram,
            },
        });

        if (data.applyToBecomeVendor) {
            return { message: 'Inscription réussie ! Veuillez vous connecter.', error: '' };
        }
    } catch (e: any) {
        try { require('fs').appendFileSync('frontend-error.log', `[${new Date().toISOString()}] Error: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}\n`); } catch { }
        console.error('Registration failed:', e);
        return {
            message: '',
            error: e.message || "Une erreur s'est produite lors de l'inscription.",
        };
    }

    return { message: 'Inscription réussie ! Veuillez vous connecter.', error: '' };
}

export async function resubmitVendor(prevState: any, formData: FormData) {
    const shopName = formData.get('name') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const description = (formData.get('description') || formData.get('shopDescription')) as string;
    const address = formData.get('address') as string;
    const type = formData.get('type') as string;
    const deliveryInfo = formData.get('deliveryInfo') as string;
    const returnPolicy = formData.get('returnPolicy') as string;
    const zone = formData.get('zone') as string;
    const rccmNumber = formData.get('rccmNumber') as string;
    const rccmFile = formData.get('rccmFile') as File;
    const ifuNumber = formData.get('ifuNumber') as string;
    const ifuFile = formData.get('ifuFile') as File;
    const idCardNumber = formData.get('idCardNumber') as string;
    const idCardFile = formData.get('idCardFile') as File;
    const website = formData.get('website') as string;
    const facebook = formData.get('facebook') as string;
    const instagram = formData.get('instagram') as string;
    const logo = formData.get('logo') as File;
    const coverImage = formData.get('coverImage') as File;

    try {
        await mutate(UpdateMyVendorProfileMutation, {
            input: {
                name: shopName || undefined,
                phoneNumber: phoneNumber || undefined,
                description: description || undefined,
                address: address || undefined,
                type: type || undefined,
                deliveryInfo: deliveryInfo || undefined,
                returnPolicy: returnPolicy || undefined,
                zone: zone || undefined,
                rccmNumber: rccmNumber || undefined,
                rccmFile: rccmFile?.size > 0 ? rccmFile : undefined,
                ifuNumber: ifuNumber || undefined,
                ifuFile: ifuFile?.size > 0 ? ifuFile : undefined,
                idCardNumber: idCardNumber || undefined,
                idCardFile: idCardFile?.size > 0 ? idCardFile : undefined,
                website: website || undefined,
                facebook: facebook || undefined,
                instagram: instagram || undefined,
                logo: logo?.size > 0 ? logo : undefined,
                coverImage: coverImage?.size > 0 ? coverImage : undefined,
            },
        }, { useAuthToken: true });
    } catch (e: any) {
        console.error('Resubmission failed:', e);
        return {
            message: '',
            error: e.message || "Une erreur s'est produite lors de la soumission.",
        };
    }

    redirect('/pending');
}
