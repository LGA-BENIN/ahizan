'use server';

import { mutate } from '@/lib/vendure/api';
import { ApplyToBecomeVendorMutation } from '@/lib/vendure/mutations';
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

    // Additional Fields
    const type = formData.get('type') as string || 'INDIVIDUAL';
    const deliveryInfo = formData.get('deliveryInfo') as string;
    const returnPolicy = formData.get('returnPolicy') as string;
    const zone = formData.get('zone') as string;

    // Legal & Identity
    const rccmNumber = formData.get('rccmNumber') as string;
    const rccmFile = formData.get('rccmFile') as File;
    const ifuNumber = formData.get('ifuNumber') as string;
    const ifuFile = formData.get('ifuFile') as File;
    const idCardNumber = formData.get('idCardNumber') as string;
    const idCardFile = formData.get('idCardFile') as File;

    // Socials
    const website = formData.get('website') as string;
    const facebook = formData.get('facebook') as string;
    const instagram = formData.get('instagram') as string;

    // Visuals (if handled in this form)
    const logo = formData.get('logo') as File;
    const coverImage = formData.get('coverImage') as File;

    // Debug logging
    console.log('FormData Keys:', Array.from(formData.keys()));
    console.log('Registering vendor with data:', {
        shopName, email, phoneNumber, type, firstName, lastName,
        rccmFileSize: rccmFile?.size,
        ifuFileSize: ifuFile?.size,
        idCardFileSize: idCardFile?.size
    });

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
            // In a real app, you might want to log the user in automatically or redirect to a specific success page
            // For now, redirect to login with a success message (or handle it in UI)
            return { message: 'Inscription réussie ! Veuillez vous connecter.', error: '' };
        }
    } catch (e: any) {
        // eslint-disable-next-line
        try { require('fs').appendFileSync('frontend-error.log', `[${new Date().toISOString()}] Error: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}\n`); } catch { }
        console.error('Registration failed detailed:', JSON.stringify(e, null, 2));
        console.error('Registration failed error object:', e);
        return {
            message: '',
            error: e.message || "Une erreur s'est produite lors de l'inscription.",
        };
    }

    return { message: 'Inscription réussie ! Veuillez vous connecter.', error: '' };
}
