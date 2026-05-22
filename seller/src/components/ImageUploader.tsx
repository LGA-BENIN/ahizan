'use client';

import React from 'react';
import { useState, useRef } from 'react';
import { uploadFileAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';
import { Upload, X, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadedAsset {
    id: string;
    preview: string;
}

interface ImageUploaderProps {
    assets: UploadedAsset[];
    featuredAssetId?: string | null;
    onAssetsChange: (assets: UploadedAsset[]) => void;
    onFeaturedChange: (assetId: string | null) => void;
    onUploadingChange?: (isUploading: boolean) => void;
    maxFiles?: number;
}

export default function ImageUploader({ 
    assets,
    featuredAssetId,
    onAssetsChange,
    onFeaturedChange,
    onUploadingChange,
    maxFiles = 10,
}: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadingCount, setUploadingCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const remaining = maxFiles - assets.length;
        if (remaining <= 0) {
            toast.warning(`Maximum ${maxFiles} images autorisées`);
            return;
        }

        const filesToUpload = Array.from(files).slice(0, remaining);
        
        setUploading(true);
        setUploadingCount(filesToUpload.length);
        if (onUploadingChange) onUploadingChange(true);

        const newAssets: UploadedAsset[] = [];
        let failedCount = 0;

        for (const file of filesToUpload) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                const result = await uploadFileAction(formData);

                if (result.success && result.asset) {
                    const asset = result.asset as any;
                    newAssets.push({ id: asset.id, preview: asset.preview });
                } else {
                    failedCount++;
                }
            } catch {
                failedCount++;
            }
        }

        if (newAssets.length > 0) {
            const updatedAssets = [...assets, ...newAssets];
            onAssetsChange(updatedAssets);
            
            // Auto-select first image as featured if none selected
            if (!featuredAssetId && updatedAssets.length > 0) {
                onFeaturedChange(updatedAssets[0].id);
            }
            
            toast.success(`${newAssets.length} image(s) ajoutée(s)`);
        }
        
        if (failedCount > 0) {
            toast.error(`${failedCount} échec(s) d'envoi`);
        }

        setUploading(false);
        setUploadingCount(0);
        if (onUploadingChange) onUploadingChange(false);
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAsset = (assetId: string) => {
        const updated = assets.filter(a => a.id !== assetId);
        onAssetsChange(updated);
        
        if (featuredAssetId === assetId) {
            onFeaturedChange(updated.length > 0 ? updated[0].id : null);
        }
    };

    const canAddMore = assets.length < maxFiles;

    return (
        <div className="w-full space-y-6">
            {/* Image Grid */}
            {assets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assets.map((asset) => {
                        const isFeatured = asset.id === featuredAssetId;
                        return (
                            <div 
                                key={asset.id} 
                                className={cn(
                                    "relative aspect-[4/3] rounded-2xl overflow-hidden border-2 group cursor-pointer transition-all",
                                    isFeatured 
                                        ? "border-brand-navy ring-4 ring-brand-navy/30 shadow-xl" 
                                        : "border-border hover:border-brand-navy/40 shadow-md"
                                )}
                            >
                                <img 
                                    src={asset.preview} 
                                    alt="Produit" 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                />
                                
                                {/* Featured badge */}
                                {isFeatured && (
                                    <div className="absolute top-2 left-2 bg-brand-navy text-white rounded-lg px-2 py-0.5 flex items-center gap-1 shadow-lg">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        <span className="text-[8px] font-black uppercase tracking-wider">À la une</span>
                                    </div>
                                )}

                                {/* Hover overlay with actions */}
                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!isFeatured && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onFeaturedChange(asset.id); }}
                                            className="bg-white text-brand-navy rounded-full p-2 shadow-lg hover:bg-brand-navy hover:text-white transition-colors"
                                            title="Définir comme image à la une"
                                        >
                                            <Star className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                                        className="bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600 transition-colors"
                                        title="Supprimer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Upload Button */}
            {canAddMore && (
                <label className={cn(
                    "flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed transition-all cursor-pointer p-6",
                    uploading 
                        ? "border-brand-navy bg-brand-navy/5" 
                        : "border-muted-foreground/20 hover:border-brand-navy/40 hover:bg-muted/5"
                )}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,image/gif"
                        multiple
                        onChange={handleFilesChange}
                        className="hidden"
                        disabled={uploading}
                    />
                    
                    {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-brand-navy animate-spin" />
                            <p className="text-[10px] font-bold text-brand-navy uppercase tracking-widest">
                                Envoi de {uploadingCount} image(s)...
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <Upload className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest">
                                    {assets.length === 0 ? 'Ajouter des photos' : 'Ajouter d\'autres photos'}
                                </p>
                                <p className="text-[9px] text-muted-foreground mt-1 font-medium">
                                    PNG ou JPG (max. 10MB) • {assets.length}/{maxFiles}
                                </p>
                            </div>
                        </div>
                    )}
                </label>
            )}

            {!canAddMore && (
                <p className="text-[10px] text-muted-foreground text-center font-medium">
                    Maximum {maxFiles} images atteint
                </p>
            )}
        </div>
    );
}
