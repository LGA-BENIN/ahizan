import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCropModalProps {
    isOpen: boolean;
    imageSrc: string;
    onClose: () => void;
    onCropComplete: (croppedBlob: Blob) => void;
    initialAspectRatio?: number; // e.g. 16/9, 4/3, 1
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
    isOpen,
    imageSrc,
    onClose,
    onCropComplete,
    initialAspectRatio = 16 / 9,
}) => {
    const [aspectRatio, setAspectRatio] = useState<number>(initialAspectRatio);
    const [zoom, setZoom] = useState<number>(1);
    const [rotation, setRotation] = useState<number>(0);
    const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    // Load image
    useEffect(() => {
        if (!isOpen || !imageSrc) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imageRef.current = img;
            setZoom(1);
            setRotation(0);
            setOffset({ x: 0, y: 0 });
            drawPreview();
        };
        img.src = imageSrc;
    }, [isOpen, imageSrc]);

    // Redraw canvas whenever zoom, rotation, offset, or aspectRatio changes
    const drawPreview = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Container display size
        const targetW = 640;
        const targetH = Math.round(targetW / aspectRatio);
        canvas.width = targetW;
        canvas.height = targetH;

        // 1. Fill solid white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);

        // 2. Draw image with zoom, rotation, and offset
        ctx.save();
        ctx.translate(targetW / 2 + offset.x, targetH / 2 + offset.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);

        // Calculate fit dimensions maintaining original aspect
        const imgAspect = img.width / img.height;
        let drawW = targetW;
        let drawH = targetW / imgAspect;

        if (drawH < targetH) {
            drawH = targetH;
            drawW = targetH * imgAspect;
        }

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
    }, [aspectRatio, zoom, rotation, offset]);

    useEffect(() => {
        if (isOpen && imageRef.current) {
            drawPreview();
        }
    }, [isOpen, aspectRatio, zoom, rotation, offset, drawPreview]);

    // Mouse Drag handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;
        setOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    // Touch Drag handlers
    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - offset.x,
                y: e.touches[0].clientY - offset.y,
            });
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDragging || e.touches.length !== 1) return;
        setOffset({
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y,
        });
    };

    const handleTouchEnd = () => setIsDragging(false);

    // Zoom handlers
    const handleZoomIn = () => setZoom((z) => Math.min(+(z + 0.1).toFixed(2), 4.0));
    const handleZoomOut = () => setZoom((z) => Math.max(+(z - 0.1).toFixed(2), 0.2));
    const handleRotate = () => setRotation((r) => (r + 90) % 360);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
    };

    // Final Crop Export
    const handleConfirm = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    onCropComplete(blob);
                    onClose();
                }
            },
            'image/jpeg',
            0.92
        );
    };

    if (!isOpen) return null;

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(6px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                fontFamily: 'inherit',
            }}
            onClick={onClose}
        >
            <div 
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '720px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                            ✂️ Cadrer et Rogner l'Image
                        </h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                            Glissez l'image et ajustez le zoom (fond blanc automatique).
                        </p>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Ratio selector */}
                <div style={{ padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Format :</span>
                    {[
                        { label: '16:9 (Bannière / Marché)', value: 16 / 9 },
                        { label: '4:3 (Photo standard)', value: 4 / 3 },
                        { label: '1:1 (Carré)', value: 1 },
                    ].map((r) => (
                        <button
                            key={r.label}
                            type="button"
                            onClick={() => setAspectRatio(r.value)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: '1px solid',
                                borderColor: Math.abs(aspectRatio - r.value) < 0.05 ? '#0B1E3B' : '#cbd5e1',
                                background: Math.abs(aspectRatio - r.value) < 0.05 ? '#0B1E3B' : '#ffffff',
                                color: Math.abs(aspectRatio - r.value) < 0.05 ? '#ffffff' : '#475569',
                                cursor: 'pointer',
                            }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* Canvas Cropper Area */}
                <div 
                    style={{
                        padding: '16px',
                        background: '#f1f5f9',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '280px',
                        maxHeight: '400px',
                        overflow: 'hidden',
                        position: 'relative',
                        userSelect: 'none',
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '360px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            borderRadius: '8px',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            background: '#ffffff',
                            border: '2px dashed #94a3b8',
                        }}
                    />
                </div>

                {/* Controls toolbar */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Zoom slider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            type="button" 
                            onClick={handleZoomOut} 
                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                            title="Zoom arrière"
                        >
                            🔍 -
                        </button>
                        <input
                            type="range"
                            min="0.2"
                            max="3.5"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            style={{ flex: 1, cursor: 'pointer', accentColor: '#0B1E3B' }}
                        />
                        <button 
                            type="button" 
                            onClick={handleZoomIn} 
                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                            title="Zoom avant"
                        >
                            🔍 +
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', width: '48px', textAlign: 'right' }}>
                            {Math.round(zoom * 100)}%
                        </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={handleRotate}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                            >
                                🔄 Pivoter 90°
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                            >
                                ↩️ Réinitialiser
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                style={{ padding: '7px 18px', borderRadius: '8px', border: 'none', background: '#0B1E3B', color: '#ffffff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                            >
                                ✅ Valider & Sauvegarder
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
