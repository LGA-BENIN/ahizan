'use server';

import { mutate } from '@/lib/vendure/api';
import { ApplyToBecomeVendorMutation } from '@/lib/vendure/mutations';
import { getAuthToken } from '@/lib/auth';
import { formatPhoneE164 } from '@/lib/format-phone';
import { revalidatePath } from 'next/cache';

export async function applyToBecomeVendorAction(formData: FormData) {
    const token = await getAuthToken();
    if (!token) {
        return { error: 'Vous devez être connecté pour soumettre cette demande.' };
    }

    try {
        const input: any = {};
        
        // Liste des champs textuels standards du CreateVendorInput de Vendure
        const standardFields = [
            'name', 'email', 'phoneNumber', 'address', 'description', 'zone', 
            'type', 'rccmNumber', 'ifuNumber', 'idCardNumber', 'website', 
            'facebook', 'instagram'
        ];

        for (const key of standardFields) {
            const val = formData.get(key);
            if (val !== null && val !== '') {
                input[key] = val as string;
            }
        }

        // Formatage du numéro de téléphone s'il est présent
        if (input.phoneNumber) {
            input.phoneNumber = formatPhoneE164(input.phoneNumber);
        }

        // Fichiers d'entreprise et médias
        const fileFields = ['rccmFile', 'ifuFile', 'idCardFile', 'logo', 'coverImage'];
        for (const key of fileFields) {
            const file = formData.get(key) as File;
            if (file && file.size > 0) {
                input[key] = file;
            }
        }

        // Récupération des champs personnalisés dynamiques
        const dynamicDetailsStr = formData.get('dynamicDetails') as string;
        const dynamicDetails = dynamicDetailsStr ? JSON.parse(dynamicDetailsStr) : {};
        input.dynamicDetails = dynamicDetails;

        console.log('[applyToBecomeVendorAction] Sending input:', JSON.stringify(input));

        const result: any = await mutate(ApplyToBecomeVendorMutation, { input }, { token });

        if (!result.data?.applyToBecomeVendor) {
            return { error: 'Une erreur est survenue lors de la création de la demande vendeur.' };
        }

        revalidatePath('/', 'layout');
        return { success: true, redirectUrl: '/pending' };
    } catch (e: any) {
        console.error('Onboarding submission error:', e);
        return { error: e.message || 'Une erreur est survenue.' };
    }
}
