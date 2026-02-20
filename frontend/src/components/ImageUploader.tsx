'use client';

import { useState } from 'react';
import { uploadFileAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';

// Assuming we have a mutation to upload files. 
// Standard Vendure upload is via multipart/form-data to /shop-api but helper mutations might exist or we use fetch.
// Usually in Vendure: 
// mutation($file: Upload!) { uploadFile(file: $file) { id preview source } } - Admin API
// For Shop API, Multivendor plugin might need to expose something or we use standard flow.
// Let's assume we need to add `uploadFile` permissions or use a specific mutation.
// Current `api-extensions` didn't explicitly add upload.
// Vendor should likely use standard `uploadFile` but it might be restricted to Admin.
// Multivendor usually allows vendors to upload assets. 
// Let's check permissions or use a simple fetch wrapper if needed.
// For now, I'll implement assuming standard `createProduct`'s `assetIds` input works, 
// but we need the upload logic.
// I'll create a simple file input that calls a customized upload function.

// Note: If standard uploadFile is not exposed to Shop API, we might need to enable it or use a custom one.
// Let's proceed with a standard implementation and we can debug if it fails.

export default function ImageUploader({ onImageUploaded }: { onImageUploaded: (assetId: string) => void }) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadFileAction(formData);

            if (result.success && result.asset) {
                setPreview(result.asset.preview);
                onImageUploaded(result.asset.id);
                toast.success('Image téléchargée avec succès');
            } else {
                console.error('Upload failed', result.error);
                toast.error('Erreur lors du téléchargement: ' + result.error);
            }
        } catch (err) {
            console.error('Upload error', err);
            toast.error('Erreur inattendue');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {preview ? (
                <div className="relative inline-block">
                    <img src={preview} alt="Uploaded" className="h-32 w-32 object-cover rounded" />
                    <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center p-1"
                        onClick={() => { setPreview(null); }}
                    >
                        ×
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="text-gray-500">
                        {uploading ? 'Envoi en cours...' : 'Glissez une image ou cliquez pour sélectionner'}
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-violet-50 file:text-violet-700
                            hover:file:bg-violet-100"
                        disabled={uploading}
                    />
                </div>
            )}
        </div>
    );
}
