'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeSettings } from '@/components/providers/theme-provider';
import { getAssetUrl } from '@/lib/vendure/api-utils';

interface ProductImageCarouselProps {
    images: Array<{
        id: string;
        preview: string;
        source: string;
    }>;
}

const isGif = (url: string) => url.toLowerCase().endsWith('.gif');

export function ProductImageCarousel({ images }: ProductImageCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const themeSettings = useThemeSettings();
    const defaultImage = themeSettings?.defaultProductImage;

    const displayImages = images && images.length > 0 ? images : (defaultImage ? [{ id: 'default', preview: defaultImage, source: defaultImage }] : []);

    if (!displayImages || displayImages.length === 0) {
        return (
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">No images available</span>
            </div>
        );
    }

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
    };

    const currentImage = displayImages[currentIndex];
    const isCurrentGif = isGif(currentImage.source);

    return (
        <div className="space-y-3">
            {/* Main Image */}
            <div className="relative aspect-square bg-muted rounded-xl overflow-hidden group border border-border/40 shadow-sm">
                {isCurrentGif ? (
                    <img
                        src={getAssetUrl(currentImage.source)}
                        alt={`Product image ${currentIndex + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <Image
                        src={getAssetUrl(currentImage.source) as string}
                        alt={`Product image ${currentIndex + 1}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 320px) 100vw, 320px"
                        priority={currentIndex === 0}
                    />
                )}

                {/* Navigation Arrows */}
                {displayImages.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/60 hover:bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all rounded-full border border-border/20"
                            onClick={goToPrevious}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/60 hover:bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all rounded-full border border-border/20"
                            onClick={goToNext}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}

                {/* Image Counter */}
                {displayImages.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold border border-border/20 shadow-sm">
                        {currentIndex + 1} / {displayImages.length}
                    </div>
                )}
            </div>

            {/* Thumbnail Grid */}
            {displayImages.length > 1 && (
                <div className="flex flex-wrap gap-2 justify-center">
                    {displayImages.map((image, index) => {
                        const isThumbnailGif = isGif(image.preview);
                        return (
                            <button
                                key={image.id}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-12 h-12 relative rounded-lg overflow-hidden border-2 transition-all ${
                                    index === currentIndex
                                        ? 'border-primary shadow-sm scale-105'
                                        : 'border-transparent hover:border-muted-foreground/50 opacity-70 hover:opacity-100'
                                }`}
                            >
                                {isThumbnailGif ? (
                                    <img
                                        src={getAssetUrl(image.preview)}
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Image
                                        src={getAssetUrl(image.preview) as string}
                                        alt={`Thumbnail ${index + 1}`}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
