'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CheckCircle2 } from 'lucide-react';

interface ProductMobileFixedBarProps {
    product: {
        id: string;
        name: string;
        optionGroups: Array<any>;
    };
    selectedVariant: any;
    canAddToCart?: boolean;
    isPending?: boolean;
    isAdded?: boolean;
    handleAddToCart: () => void;
    whatsappNumber?: string;
}

export function ProductMobileFixedBar({
    product,
    selectedVariant,
    canAddToCart,
    isPending,
    isAdded,
    handleAddToCart,
    whatsappNumber
}: ProductMobileFixedBarProps) {
    const [isFixed, setIsFixed] = useState(true);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const findTarget = () => {
            const anchor = document.getElementById('cms-last-section-top') || document.getElementById('cms-penultimate-section-bottom');
            if (anchor) setPortalTarget(anchor);
        };

        findTarget();
        const timer = setTimeout(findTarget, 500);

        const checkScrollPosition = () => {
            const anchor = document.getElementById('cms-last-section-top') || document.getElementById('cms-penultimate-section-bottom');
            if (!anchor) {
                setIsFixed(true);
                return;
            }

            const rect = anchor.getBoundingClientRect();
            if (rect.top <= window.innerHeight - 56) {
                setIsFixed(false);
            } else {
                setIsFixed(true);
            }
        };

        window.addEventListener('scroll', checkScrollPosition, { passive: true });
        checkScrollPosition();

        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', checkScrollPosition);
        };
    }, []);

    const isInStock = selectedVariant ? (selectedVariant.stockLevel !== 'OUT_OF_STOCK' && selectedVariant.stockLevel !== '0') : true;

    const renderButtons = () => (
        <div className="grid grid-cols-[38%_1fr] gap-0 w-full p-0 m-0">
            {/* Commander sur WhatsApp (Flush rectangle) */}
            <Button
                type="button"
                size="lg"
                className="w-full h-12 rounded-none font-bold text-xs bg-[#25D366] text-white hover:bg-[#20bd5a] flex items-center justify-center gap-1.5 px-2 border-r border-white/20 shadow-none"
                onClick={() => {
                    const targetNumber = whatsappNumber || '';
                    const cleanNumber = targetNumber.replace(/[^0-9+]/g, '');
                    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
                    const message = `Bonjour, je souhaite commander ce produit : ${product.name}\n${currentUrl}`;

                    if (cleanNumber) {
                        const phone = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : cleanNumber;
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                    } else {
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
                    }
                }}
            >
                <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.705 1.754zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span className="truncate">WhatsApp</span>
            </Button>

            {/* Ajouter au panier (Flush rectangle) */}
            <Button
                size="lg"
                className="w-full h-12 rounded-none font-bold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1.5 px-2 shadow-none"
                disabled={!canAddToCart || isPending}
                onClick={handleAddToCart}
            >
                {isAdded ? (
                    <>
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0"/>
                        <span className="truncate">Ajouté</span>
                    </>
                ) : (
                    <>
                        <ShoppingCart className="h-4 w-4 flex-shrink-0"/>
                        <span className="truncate">
                            {isPending
                                ? 'Ajout...'
                                : !selectedVariant && product.optionGroups.length > 0
                                    ? 'Options'
                                    : !isInStock
                                        ? 'Rupture'
                                        : 'Ajouter au panier'}
                        </span>
                    </>
                )}
            </Button>
        </div>
    );

    // Portalled inline mode: mounted right into cms-last-section-top (above the last section)
    if (!isFixed && portalTarget) {
        return createPortal(
            <div className="w-full p-0 m-0 border-y border-border/30 lg:hidden">
                {renderButtons()}
            </div>,
            portalTarget
        );
    }

    // Default Fixed mode glued directly to mobile bottom nav with 0 padding/margins
    return (
        <div className="fixed bottom-[56px] left-0 right-0 z-40 p-0 m-0 border-t border-border/40 shadow-2xl lg:hidden">
            {renderButtons()}
        </div>
    );
}
