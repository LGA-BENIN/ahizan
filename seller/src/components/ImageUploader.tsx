'use client';

import React from 'react';
import { useState } from 'react';
import { uploadFileAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
    onImageUploaded: (assetId: string) => void;
    onUploadingChange?: (isUploading: boolean) => void;
}

interface AssetResponse {
    id: string;
    preview: string;
    source: string;
}

export default function ImageUploader({ 
    onImageUploaded, 
    onUploadingChange 
}: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        if (onUploadingChange) onUploadingChange(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadFileAction(formData);

            if (result.success && result.asset) {
                const asset = result.asset as AssetResponse;
                setPreview(asset.preview);
                onImageUploaded(asset.id);
                toast.success('Image téléchargée');
            } else {
                toast.error('Erreur: ' + (result as any).error);
            }
        } catch (err) {
            toast.error('Erreur inattendue');
        } finally {
            setUploading(false);
            if (onUploadingChange) onUploadingChange(false);
        }
    };

    return (
        <div className="w-full">
            {preview ? (
                <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-border group bg-muted/20">
                    <img src={preview} alt="Uploaded" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                    <button
                        type="button"
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { setPreview(null); }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label className={cn(
                    "flex flex-col items-center justify-center aspect-square w-full rounded-xl border-2 border-dashed transition-all cursor-pointer",
                    uploading 
                        ? "border-brand-navy bg-brand-navy/5" 
                        : "border-muted-foreground/20 hover:border-brand-navy/40 hover:bg-muted/5"
                )}>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                    />
                    
                    {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-brand-navy animate-spin" />
                            <p className="text-[10px] font-bold text-brand-navy uppercase tracking-widest">Envoi en cours...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 px-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <Upload className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest">Ajouter une photo</p>
                                <p className="text-[9px] text-muted-foreground mt-1 font-medium">PNG ou JPG (max. 10MB)</p>
                            </div>
                        </div>
                    )}
                </label>
            )}
        </div>
    );
}
