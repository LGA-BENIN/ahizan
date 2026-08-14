'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCropComplete: (croppedImage: Blob) => void;
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

    // Reset states when modal opens/closes or image changes
    useEffect(() => {
        if (isOpen) {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setCroppedAreaPixels(null);
        }
    }, [isOpen, imageSrc]);

    const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCrop = useCallback(async () => {
        if (!croppedAreaPixels) return;

        const image = new Image();
        image.src = imageSrc;
        
        await new Promise((resolve) => {
            image.onload = resolve;
        });

        const radian = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(radian));
        const cos = Math.abs(Math.cos(radian));

        // Bounding box size of the rotated image
        const bBoxWidth = image.width * cos + image.height * sin;
        const bBoxHeight = image.width * sin + image.height * cos;

        // Create a temporary canvas for the full rotated image with white background
        const bBoxCanvas = document.createElement('canvas');
        const bBoxCtx = bBoxCanvas.getContext('2d');
        if (!bBoxCtx) return;

        bBoxCanvas.width = bBoxWidth;
        bBoxCanvas.height = bBoxHeight;

        // Fill background with solid white
        bBoxCtx.fillStyle = '#ffffff';
        bBoxCtx.fillRect(0, 0, bBoxWidth, bBoxHeight);

        // Draw rotated image centered on bBoxCanvas
        bBoxCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
        bBoxCtx.rotate(radian);
        bBoxCtx.translate(-image.width / 2, -image.height / 2);
        bBoxCtx.drawImage(image, 0, 0);

        // Create final canvas of size croppedAreaPixels.width x croppedAreaPixels.height
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

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
            croppedAreaPixels.width,
            croppedAreaPixels.height
        );

        canvas.toBlob((blob) => {
            if (blob) {
                onCropComplete(blob);
                onClose();
            }
        }, 'image/jpeg', 0.9);
    }, [croppedAreaPixels, imageSrc, rotation, onCropComplete, onClose]);

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
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full p-0 overflow-hidden max-h-[95vh] bg-background border-none gap-0">
                <div className="flex flex-col max-h-[95vh] w-full gap-0">
                    <DialogHeader className="px-5 py-3.5 border-b shrink-0">
                        <DialogTitle className="text-base sm:text-lg">Ajuster l'image</DialogTitle>
                        <DialogDescription className="text-xs">
                            Déplacez et zoomez (avant/arrière) pour cadrer votre image, puis cliquez sur Confirmer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative bg-white w-full h-[45vh] min-h-[220px] md:min-h-[350px] overflow-hidden border-b border-t border-border shrink">
                        {imageSrc ? (
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                minZoom={0.2}
                                maxZoom={5.0}
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
                                        backgroundColor: '#ffffff',
                                    },
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white">
                                <p className="text-xs text-muted-foreground">Aucune image</p>
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-3 space-y-3 shrink-0 bg-background">
                        {/* Zoom Controls */}
                        <div className="flex items-center gap-3">
                            <button 
                                type="button" 
                                onClick={handleZoomOut}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
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
                                className="flex-1 cursor-pointer"
                            />
                            <button 
                                type="button" 
                                onClick={handleZoomIn}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
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
                                    className="gap-2 flex-1 sm:flex-none h-9 text-xs"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Annuler
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleCrop}
                                    className="gap-2 flex-1 sm:flex-none h-9 text-xs"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Confirmer
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

