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

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Calculate the rotated dimensions
        const radian = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(radian));
        const cos = Math.abs(Math.cos(radian));

        const newWidth = image.width * cos + image.height * sin;
        const newHeight = image.width * sin + image.height * cos;

        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        // Translate and rotate context
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(radian);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        // Draw the cropped image
        ctx.drawImage(
            image,
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
        setZoom((prev) => Math.min(prev + 0.1, 3));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.1, 1));
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle>Ajuster l'image</DialogTitle>
                    <DialogDescription>
                        Déplacez et zoomez pour cadrer votre image, puis cliquez sur Confirmer.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative bg-muted/30 w-full h-[55vh] min-h-[320px] overflow-hidden">
                    {imageSrc ? (
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
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
                                    backgroundColor: '#f5f5f5',
                                },
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <p className="text-sm text-muted-foreground">Aucune image</p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t space-y-4 shrink-0">
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-4">
                        <ZoomOut className="w-5 h-5 text-muted-foreground shrink-0" />
                        <Slider
                            value={[zoom]}
                            onValueChange={(value) => setZoom(value[0])}
                            min={1}
                            max={3}
                            step={0.1}
                            className="flex-1"
                        />
                        <ZoomIn className="w-5 h-5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium w-12 text-right shrink-0">{Math.round(zoom * 100)}%</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRotate}
                            className="gap-2 w-full sm:w-auto"
                        >
                            <RotateCw className="w-4 h-4" />
                            Pivoter
                        </Button>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="gap-2 flex-1 sm:flex-none"
                            >
                                <X className="w-4 h-4" />
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                onClick={handleCrop}
                                className="gap-2 flex-1 sm:flex-none"
                            >
                                <Check className="w-4 h-4" />
                                Confirmer
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
