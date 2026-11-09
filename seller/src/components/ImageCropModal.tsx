'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCropComplete: (croppedImage: Blob) => Promise<void> | void;
    onSkipCropping?: () => void;
    imageSrc: string;
    aspectRatio?: number;
}

export default function ImageCropModal({
    isOpen,
    onClose,
    onCropComplete,
    onSkipCropping,
    imageSrc,
    aspectRatio = 1,
}: ImageCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [safeImageSrc, setSafeImageSrc] = useState<string>('');

    // Preload image as safe blob URL to avoid CORS / canvas tainting issues
    useEffect(() => {
        let active = true;
        let blobUrlToRevoke: string | null = null;

        if (isOpen && imageSrc) {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setCroppedAreaPixels(null);
            setIsProcessing(false);

            // If already a blob or data url, use directly
            if (imageSrc.startsWith('blob:') || imageSrc.startsWith('data:')) {
                setSafeImageSrc(imageSrc);
            } else {
                fetch(imageSrc, { mode: 'cors' })
                    .then((res) => res.blob())
                    .then((blob) => {
                        if (active) {
                            const objectUrl = URL.createObjectURL(blob);
                            blobUrlToRevoke = objectUrl;
                            setSafeImageSrc(objectUrl);
                        }
                    })
                    .catch(() => {
                        // Fallback to original imageSrc if fetch fails
                        if (active) setSafeImageSrc(imageSrc);
                    });
            }
        } else {
            setSafeImageSrc('');
        }

        return () => {
            active = false;
            if (blobUrlToRevoke) {
                URL.revokeObjectURL(blobUrlToRevoke);
            }
        };
    }, [isOpen, imageSrc]);

    const onCropCompleteHandler = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCrop = useCallback(async () => {
        if (!croppedAreaPixels || isProcessing) return;
        setIsProcessing(true);

        try {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            
            await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = (e) => reject(e);
                image.src = safeImageSrc || imageSrc;
            });

            const radian = (rotation * Math.PI) / 180;
            const sin = Math.abs(Math.sin(radian));
            const cos = Math.abs(Math.cos(radian));

            // Bounding box size of the rotated image
            const bBoxWidth = image.naturalWidth * cos + image.naturalHeight * sin;
            const bBoxHeight = image.naturalWidth * sin + image.naturalHeight * cos;

            // Create a temporary canvas for the full rotated image with white background
            const bBoxCanvas = document.createElement('canvas');
            const bBoxCtx = bBoxCanvas.getContext('2d');
            if (!bBoxCtx) throw new Error("Impossible d'initialiser le rendu graphique");

            bBoxCanvas.width = bBoxWidth;
            bBoxCanvas.height = bBoxHeight;

            // Fill background with solid white
            bBoxCtx.fillStyle = '#ffffff';
            bBoxCtx.fillRect(0, 0, bBoxWidth, bBoxHeight);

            // Draw rotated image centered on bBoxCanvas
            bBoxCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
            bBoxCtx.rotate(radian);
            bBoxCtx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
            bBoxCtx.drawImage(image, 0, 0);

            // Create final canvas of size croppedAreaPixels.width x croppedAreaPixels.height
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Impossible d'initialiser le canvas de recadrage");

            canvas.width = Math.max(1, Math.round(croppedAreaPixels.width));
            canvas.height = Math.max(1, Math.round(croppedAreaPixels.height));

            // Fill final canvas background with solid white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw cropped portion from bBoxCanvas onto final canvas
            ctx.drawImage(
                bBoxCanvas,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                canvas.width,
                canvas.height
            );

            const blob: Blob | null = await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
            });

            if (!blob) {
                throw new Error("Erreur de génération de l'image recadrée");
            }

            if (typeof onCropComplete === 'function') {
                await onCropComplete(blob);
            }
        } catch (err: any) {
            console.error('[ImageCropModal] Crop failure:', err);
            toast.error(err?.message || "Impossible de recadrer l'image.");
        } finally {
            setIsProcessing(false);
        }
    }, [croppedAreaPixels, isProcessing, safeImageSrc, imageSrc, rotation, onCropComplete]);

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.1, 5));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.1, 0.2));
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isProcessing && typeof onClose === 'function') onClose(); }}>
            <DialogContent className="max-w-4xl w-full p-0 overflow-hidden max-h-[95vh] bg-background border-none gap-0">
                <div className="flex flex-col max-h-[95vh] w-full gap-0">
                    <DialogHeader className="px-5 py-3.5 border-b shrink-0">
                        <DialogTitle className="text-base sm:text-lg">Ajuster l'image</DialogTitle>
                        <DialogDescription className="text-xs">
                            Déplacez et zoomez pour cadrer votre image, puis cliquez sur Confirmer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative bg-slate-950 w-full h-[45vh] min-h-[240px] md:min-h-[360px] overflow-hidden border-b border-t border-border shrink flex items-center justify-center">
                        {(safeImageSrc || imageSrc) ? (
                            <Cropper
                                image={safeImageSrc || imageSrc}
                                crop={crop}
                                zoom={zoom}
                                minZoom={0.5}
                                maxZoom={4.0}
                                restrictPosition={false}
                                rotation={rotation}
                                aspect={aspectRatio}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropCompleteHandler}
                                style={{
                                    containerStyle: {
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: '#090d16',
                                    },
                                    cropAreaStyle: {
                                        border: '2px solid #3b82f6',
                                        boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.65)',
                                    }
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <p className="text-xs">Chargement de l'image...</p>
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-3 space-y-3 shrink-0 bg-background">
                        {/* Zoom Controls */}
                        <div className="flex items-center gap-3">
                            <button 
                                type="button" 
                                onClick={handleZoomOut}
                                disabled={isProcessing}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                title="Zoom arrière"
                            >
                                <ZoomOut className="w-4 h-4 shrink-0" />
                            </button>
                            <Slider
                                value={[zoom]}
                                onValueChange={(value) => setZoom(value[0])}
                                min={0.2}
                                max={5.0}
                                step={0.05}
                                disabled={isProcessing}
                                className="flex-1 cursor-pointer"
                            />
                            <button 
                                type="button" 
                                onClick={handleZoomIn}
                                disabled={isProcessing}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                title="Zoom avant"
                            >
                                <ZoomIn className="w-4 h-4 shrink-0" />
                            </button>
                            <span className="text-xs font-medium w-12 text-right shrink-0">{Math.round(zoom * 100)}%</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRotate}
                                disabled={isProcessing}
                                className="gap-2 w-full sm:w-auto h-9 text-xs"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                                Pivoter
                            </Button>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={isProcessing}
                                    className="gap-2 flex-1 sm:flex-none h-9 text-xs"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Annuler
                                </Button>
                                {onSkipCropping && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={onSkipCropping}
                                        disabled={isProcessing}
                                        className="gap-1.5 flex-1 sm:flex-none h-9 text-xs"
                                        title="Conserver l'image telle quelle sans recadrage"
                                    >
                                        Conserver l'original
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    onClick={handleCrop}
                                    disabled={isProcessing}
                                    className="gap-2 flex-1 sm:flex-none h-9 text-xs"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Application...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            Confirmer
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

