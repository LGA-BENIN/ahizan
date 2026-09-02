'use client';

import React, { useState, useRef, useCallback } from 'react';
import { uploadFileAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';
import { Upload, X, Loader2, Star, GripVertical, ImagePlus, Eye } from 'lucide-react';
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
    const [uploadingCount, setUploadingCount] = useState(0);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [currentImageSrc, setCurrentImageSrc] = useState<string>('');
    const [currentFile, setCurrentFile] = useState<File | null>(null);

    // Drag-to-reorder state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    // ─── File processing ──────────────────────────────────────────────
    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Veuillez sélectionner une image');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setCurrentImageSrc(reader.result as string);
            setCurrentFile(file);
            setCropModalOpen(true);
        };
        reader.onerror = () => toast.error('Erreur lors de la lecture du fichier');
        reader.readAsDataURL(file);
    };

    const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const remaining = effectiveMaxFiles - assets.length;
        if (remaining <= 0) { toast.warning(`Maximum ${effectiveMaxFiles} images autorisées`); return; }
        processFile(files[0]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── Drop zone ────────────────────────────────────────────────────
    const handleDropZoneDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        // Only set isDragOver if dragging files (not reordering)
        if (dragIndex === null) setIsDragOver(true);
    };
    const handleDropZoneDragLeave = () => setIsDragOver(false);
    const handleDropZoneDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (dragIndex !== null) return; // reorder handled by card handlers
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;
        const remaining = effectiveMaxFiles - assets.length;
        if (remaining <= 0) { toast.warning(`Maximum ${effectiveMaxFiles} images autorisées`); return; }
        processFile(files[0]);
    };

    // ─── Upload (after crop or skip) ─────────────────────────────────
    const uploadFile = async (file: File) => {
        setUploading(true);
        setUploadingCount(1);
        if (typeof onUploadingChange === 'function') onUploadingChange(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const result = await uploadFileAction(formData);
            if (result && result.success && result.asset) {
                const asset = result.asset as any;
                const updatedAssets = [...assets, { id: asset.id, preview: asset.preview }];
                if (typeof onAssetsChange === 'function') onAssetsChange(updatedAssets);
                if (!featuredAssetId && updatedAssets.length > 0) setFeaturedSafe(updatedAssets[0].id);
                toast.success('Image ajoutée avec succès');
            } else {
                toast.error(result?.error ? `Échec de l'envoi : ${result.error}` : 'Échec de l\'envoi');
            }
        } catch (err: any) {
            console.error('[ImageUploader] Upload error:', err);
            // Only show toast if it is a real error message, not a minification artefact
            const errMsg = typeof err === 'string' ? err : err?.message || '';
            if (errMsg && !errMsg.includes('not a function')) {
                toast.error('Erreur lors de l\'envoi : ' + errMsg);
            }
        } finally {
            setUploading(false);
            setUploadingCount(0);
            if (typeof onUploadingChange === 'function') onUploadingChange(false);
            setCurrentFile(null);
            setCurrentImageSrc('');
            setCropModalOpen(false);
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        const fileToUpload = currentFile;
        if (!fileToUpload) return;
        const croppedFile = new File([croppedBlob], fileToUpload.name, { type: 'image/jpeg', lastModified: Date.now() });
        await uploadFile(croppedFile);
    };

    const handleSkipCropping = async () => {
        const fileToUpload = currentFile;
        setCropModalOpen(false);
        if (fileToUpload) await uploadFile(fileToUpload);
    };

    const removeAsset = (assetId: string) => {
        const updated = assets.filter(a => a.id !== assetId);
        if (typeof onAssetsChange === 'function') onAssetsChange(updated);
        if (featuredAssetId === assetId) setFeaturedSafe(updated.length > 0 ? updated[0].id : null);
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
        if (dragIndex === null || dragIndex === idx) { setDragIndex(null); setDropIndex(null); return; }
        const reordered = [...assets];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(idx, 0, moved);
        onAssetsChange(reordered);
        // Keep featured: if moved was featured, it stays featured
        setDragIndex(null); setDropIndex(null);
    };
    const handleCardDragEnd = () => { setDragIndex(null); setDropIndex(null); };

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
                        assets.length === 0 ? 'py-14' : 'py-6'
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
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-9 h-9 text-primary animate-spin" />
                            <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
                                Envoi en cours…
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 text-center px-4">
                            <div className={cn(
                                'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
                                isDragOver ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                            )}>
                                <ImagePlus className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[12px] font-bold uppercase tracking-widest text-foreground">
                                    {assets.length === 0 ? 'Ajouter des photos produit' : 'Ajouter d\'autres photos'}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                                    Glisser-déposer ou cliquer · Portrait, paysage ou carré · {assets.length}/{effectiveMaxFiles}
                                </p>
                            </div>
                        </div>
                    )}
                </label>
            )}

            {/* ── Image Grid ─────────────────────────────────────────── */}
            {assets.length > 0 && (
                <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <GripVertical className="w-3 h-3" />
                        Glisser pour réorganiser · La 1ère image est la principale
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                                        'relative group aspect-square rounded-2xl overflow-hidden border bg-muted/20 transition-all cursor-grab active:cursor-grabbing',
                                        isFeatured ? 'ring-2 ring-primary border-primary shadow-sm' : 'border-border/60 hover:border-border',
                                        isDragging && 'opacity-30 scale-95',
                                        isDropTarget && 'ring-2 ring-primary/60 scale-[1.02]'
                                    )}
                                >
                                    <img
                                        src={asset.preview}
                                        alt="Photo produit"
                                        className="w-full h-full object-cover select-none"
                                        draggable={false}
                                    />

                                    {/* Order / Featured Badge */}
                                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                                        {isFeatured ? (
                                            <span className="flex items-center gap-1 bg-primary text-primary-foreground text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md tracking-wider">
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                                Principale
                                            </span>
                                        ) : (
                                            <span className="bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                                #{idx + 1}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                        {!isFeatured && (
                                            <button
                                                type="button"
                                                onClick={() => setFeaturedSafe(asset.id)}
                                                className="flex items-center gap-1.5 bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md hover:bg-primary hover:text-white transition-colors uppercase tracking-wide"
                                            >
                                                <Star className="w-3 h-3" />
                                                Mettre en avant
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeAsset(asset.id)}
                                            className="flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors uppercase tracking-wide"
                                        >
                                            <X className="w-3 h-3" />
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Preview note */}
                    <p className="text-[9px] text-muted-foreground mt-2 text-center font-medium flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" />
                        Les images apparaissent en format carré 1:1 sur la vitrine AHIZAN
                    </p>
                </div>
            )}

            {!canAddMore && (
                <p className="text-[10px] text-muted-foreground text-center font-medium">
                    Maximum {effectiveMaxFiles} images atteint
                </p>
            )}

            {/* Crop Modal */}
            <ImageCropModal
                isOpen={cropModalOpen}
                onClose={() => {
                    setCropModalOpen(false);
                    setCurrentFile(null);
                    setCurrentImageSrc('');
                }}
                onCropComplete={handleCropComplete}
                onSkipCropping={handleSkipCropping}
                imageSrc={currentImageSrc}
                aspectRatio={1}
            />
        </div>
    );
}
