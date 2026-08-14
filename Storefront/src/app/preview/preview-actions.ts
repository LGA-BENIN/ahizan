'use server';

import { rawQuery } from '@/lib/vendure/raw-api';

export async function getPreviewHabillageAction(presetId: string) {
    const query = `
        query PreviewHabillage($presetId: ID!) {
            previewHabillage(presetId: $presetId) {
                id
                name
                isDefault
                isBackup
                sections {
                    id 
                    type 
                    title 
                    description 
                    layout 
                    order 
                    isActive 
                    pageSlug 
                    dataJson
                }
            }
        }
    `;
    try {
        const result = await rawQuery(query, { variables: { presetId } });
        return { success: true, preview: result?.previewHabillage };
    } catch (err: any) {
        console.error('[getPreviewHabillageAction] Failed to fetch preview:', err);
        return { success: false, error: err.message };
    }
}
