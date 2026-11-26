'use client';

import React, { useState, useRef, useCallback } from 'react';
import { uploadFileAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';
import { Upload, X, Loader2, Star, GripVertical, ImagePlus, Eye, Crop, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageCropModal from './ImageCropModal';

export interface UploadedAsset {
    id: string;
    preview: string;
}

interface ImageUploaderProps {
    assets: UploadedAsset[];
    featuredAssetId?: string | null;
    onAssetsChange: (assets: UploadedAsset[]) => void;
    onFeaturedChange?: (assetId: string | null) => void;
    onFeaturedAssetChange?: (assetId: string | null) => void;
    onUploadingChange?: (isUploading: boolean) => void;
    maxFiles?: number;
    maxAssets?: number;
}

export default function ImageUploader({
    assets,
    featuredAssetId,
    onAssetsChange,
    onFeaturedChange,
    onFeaturedAssetChange,
    onUploadingChange,
    maxFiles,
    maxAssets,
}: ImageUploaderProps) {
    const effectiveMaxFiles = maxFiles ?? maxAssets ?? 10;

    const setFeaturedSafe = useCallback((assetId: string | null) => {
        if (typeof onFeaturedChange === 'function') onFeaturedChange(assetId);
        if (typeof onFeaturedAssetChange === 'function') onFeaturedAssetChange(assetId);
    }, [onFeaturedChange, onFeaturedAssetChange]);

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Optional manual crop state for already uploaded assets or specific asset
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [cropTargetAssetId, setCropTargetAssetId] = useState<string | null>(null);
    const [cropImageSrc, setCropImageSrc] = useState<string>('');

    // Drag-to-reorder state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    // ─── Direct Batch Upload Function (No forced cropping) ───────────
    const uploadMultipleFiles = async (files: File[]) => {
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            toast.error('Veuillez sélectionner des images valides (JPG, PNG, WEBP...)');
            return;
        }

        const remainingSlots = effectiveMaxFiles - assets.length;
        if (remainingSlots <= 0) {
            toast.warning(`Limite de ${effectiveMaxFiles} images atteinte.`);
            return;
        }

        const filesToUpload = imageFiles.slice(0, remainingSlots);
        if (imageFiles.length > remainingSlots) {
            toast.info(`Seules les ${remainingSlots} premières images sélectionnées seront envoyées.`);
        }

        setUploading(true);
        setUploadProgress({ current: 0, total: filesToUpload.length });
        if (typeof onUploadingChange === 'function') onUploadingChange(true);

        const newUploadedAssets: UploadedAsset[] = [];
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i];
            setUploadProgress({ current: i + 1, total: filesToUpload.length });

            try {
                const formData = new FormData();
                formData.append('file', file);
                const result = await uploadFileAction(formData);

                if (result && result.success && result.asset) {
                    const asset = result.asset as any;
                    newUploadedAssets.push({ id: asset.id, preview: asset.preview });
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                console.error('[ImageUploader] Upload error for file:', file.name, err);
                failCount++;
            }
        }

        if (newUploadedAssets.length > 0) {
            const updated = [...assets, ...newUploadedAssets];
            if (typeof onAssetsChange === 'function') onAssetsChange(updated);
            if (!featuredAssetId && updated.length > 0) {
                setFeaturedSafe(updated[0].id);
            }
            if (successCount === 1) {
                toast.success('Image ajoutée avec succès');
            } else {
                toast.success(`${successCount} images ajoutées avec succès`);
            }
        }

        if (failCount > 0) {
            toast.error(`Échec de l'envoi pour ${failCount} image(s).`);
        }

        setUploading(false);
        setUploadProgress(null);
        if (typeof onUploadingChange === 'function') onUploadingChange(false);
    };

    const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        await uploadMultipleFiles(files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── Drop zone ────────────────────────────────────────────────────
    const handleDropZoneDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (dragIndex === null) setIsDragOver(true);
    };

    const handleDropZoneDragLeave = () => setIsDragOver(false);

    const handleDropZoneDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (dragIndex !== null) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await uploadMultipleFiles(files);
        }
    };

    // ─── Optional Manual Crop for a specific uploaded photo ─────────
    const handleOpenCropForAsset = (asset: UploadedAsset) => {
        setCropTargetAssetId(asset.id);
        setCropImageSrc(asset.preview);
        setCropModalOpen(true);
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        const targetId = cropTargetAssetId;
        if (!targetId) return;
        setUploading(true);

        try {
            const croppedFile = new File([croppedBlob], `recadre-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', croppedFile);
            const result = await uploadFileAction(formData);

            if (result && result.success && result.asset) {
                const newAsset = result.asset as any;
                const updated = assets.map(a => a.id === targetId ? { id: newAsset.id, preview: newAsset.preview } : a);
                if (typeof onAssetsChange === 'function') onAssetsChange(updated);
                if (featuredAssetId === targetId) {
                    setFeaturedSafe(newAsset.id);
                }
                toast.success('Image recadrée et mise à jour');
                setCropModalOpen(false);
                setCropTargetAssetId(null);
                setCropImageSrc('');
            } else {
                toast.error("Échec de l'enregistrement du recadrage");
            }
        } catch (err) {
            toast.error("Erreur lors de l'application du recadrage");
        } finally {
            setUploading(false);
        }
    };

    const removeAsset = (assetId: string) => {
        const updated = assets.filter(a => a.id !== assetId);
        if (typeof onAssetsChange === 'function') onAssetsChange(updated);
        if (featuredAssetId === assetId) {
            setFeaturedSafe(updated.length > 0 ? updated[0].id : null);
        }
    };

    // ─── Drag-to-reorder (card level) ────────────────────────────────
    const handleCardDragStart = (e: React.DragEvent, idx: number) => {
        setDragIndex(idx);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleCardDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropIndex(idx);
    };

    const handleCardDrop = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === idx) {
            setDragIndex(null);
            setDropIndex(null);
            return;
        }
        const reordered = [...assets];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(idx, 0, moved);
        if (typeof onAssetsChange === 'function') onAssetsChange(reordered);
        setDragIndex(null);
        setDropIndex(null);
    };

    const handleCardDragEnd = () => {
        setDragIndex(null);
        setDropIndex(null);
    };

    const canAddMore = assets.length < effectiveMaxFiles;

    return (
        <div className="w-full space-y-4">
            {/* ── Upload Drop Zone ──────────────────────────────────── */}
            {canAddMore && (
                <label
                    className={cn(
                        'relative flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none',
                        isDragOver
                            ? 'border-primary bg-primary/5 scale-[1.01]'
                            : uploading
                                ? 'border-primary/50 bg-primary/5 cursor-wait'
                                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
                        assets.length === 0 ? 'py-12' : 'py-5'
                    )}
                    onDragOver={handleDropZoneDragOver}
                    onDragLeave={handleDropZoneDragLeave}
                    onDrop={handleDropZoneDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFilesChange}
                        className="hidden"
                        disabled={uploading}
                    />
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2.5">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-xs font-bold text-primary">
                                Envoi des photos... {uploadProgress ? `(${uploadProgress.current}/${uploadProgress.total})` : ''}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2.5 text-center px-4">
                            <div className={cn(
                                'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                                isDragOver ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                            )}>
                                <ImagePlus className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                                    {assets.length === 0 ? 'Sélectionner les photos du produit' : '+ Ajouter plusieurs photos'}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                                    Sélection multiple autorisée · Tout format accepté (portrait, paysage, carré) · {assets.length}/{effectiveMaxFiles}
                                </p>
                            </div>
                        </div>
                    )}
                </label>
            )}

            {/* ── Image Grid ─────────────────────────────────────────── */}
            {assets.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                            <GripVertical className="w-3.5 h-3.5" />
                            Glisser pour réorganiser · La 1ère image est la vitrine
                        </p>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                            {assets.length}/{effectiveMaxFiles} photo(s)
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {assets.map((asset, idx) => {
                            const isFeatured = featuredAssetId ? featuredAssetId === asset.id : idx === 0;
                            const isDragging = dragIndex === idx;
                            const isDropTarget = dropIndex === idx && dragIndex !== idx;

                            return (
                                <div
                                    key={asset.id}
                                    draggable
                                    onDragStart={(e) => handleCardDragStart(e, idx)}
                                    onDragOver={(e) => handleCardDragOver(e, idx)}
                                    onDrop={(e) => handleCardDrop(e, idx)}
                                    onDragEnd={handleCardDragEnd}
                                    className={cn(
                                        'relative group aspect-square rounded-2xl overflow-hidden border bg-muted/15 flex items-center justify-center transition-all cursor-grab active:cursor-grabbing p-1.5',
                                        isFeatured ? 'ring-2 ring-primary border-primary shadow-sm bg-primary/5' : 'border-border/70 hover:border-border',
                                        isDragging && 'opacity-30 scale-95',
                                        isDropTarget && 'ring-2 ring-primary/60 scale-[1.02]'
                                    )}
                                >
                                    {/* Automatic non-cropping container: object-contain preserves 100% of the image */}
                                    <img
                                        src={asset.preview}
                                        alt="Photo produit"
                                        className="w-full h-full object-contain select-none rounded-xl"
                                        draggable={false}
                                    />

                                    {/* Order / Featured Badge */}
                                    <div className="absolute top-1.5 left-1.5 z-20 flex items-center gap-1 pointer-events-none">
                                        {isFeatured ? (
                                            <span className="flex items-center gap-1 bg-primary text-primary-foreground text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md tracking-wider">
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                                Principale
                                            </span>
                                        ) : (
                                            <span className="bg-black/70 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                                #{idx + 1}
                                            </span>
                                        )}
                                    </div>

                                    {/* Touch-Friendly Action Buttons (Always accessible on Mobile & Desktop) */}
                                    <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
                                        {/* Crop button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenCropForAsset(asset);
                                            }}
                                            className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                                            title="Recadrer la photo"
                                        >
                                            <Crop className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Delete button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeAsset(asset.id);
                                            }}
                                            className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
                                            title="Supprimer cette photo"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Set As Primary Button (Bottom) */}
                                    {!isFeatured && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFeaturedSafe(asset.id);
                                            }}
                                            className="absolute bottom-1.5 left-1.5 right-1.5 z-20 bg-background/90 hover:bg-primary hover:text-white backdrop-blur-xs text-foreground text-[10px] font-bold py-1 px-1.5 rounded-lg border border-border shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                                        >
                                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                            <span className="truncate">Définir principale</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Adaptation info */}
                    <p className="text-[10px] text-muted-foreground mt-2.5 text-center font-medium flex items-center justify-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>Vos photos sont automatiquement adaptées et centrées pour la vitrine Ahizan.</span>
                    </p>
                </div>
            )}

            {!canAddMore && (
                <p className="text-xs text-muted-foreground text-center font-medium">
                    Maximum {effectiveMaxFiles} images atteint
                </p>
            )}

            {/* Optional Manual Crop Modal */}
            <ImageCropModal
                isOpen={cropModalOpen}
                onClose={() => {
                    setCropModalOpen(false);
                    setCropTargetAssetId(null);
                    setCropImageSrc('');
                }}
                onCropComplete={handleCropComplete}
                onSkipCropping={() => {
                    setCropModalOpen(false);
                    setCropTargetAssetId(null);
                    setCropImageSrc('');
                }}
                imageSrc={cropImageSrc}
                aspectRatio={1}
            />
        </div>
    );
}
