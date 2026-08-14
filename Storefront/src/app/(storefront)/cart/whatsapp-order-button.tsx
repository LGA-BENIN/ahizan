"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { emptyCart } from './actions';

export function WhatsappOrderButton({ activeOrder, whatsappNumber }: { activeOrder: any, whatsappNumber?: string }) {
    const [loading, setLoading] = useState(false);

    const handleWhatsappOrder = async () => {
        if (!activeOrder || !activeOrder.lines || activeOrder.lines.length === 0) return;
        setLoading(true);

        try {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

            // Format price helper
            const formatPrice = (amount: number) => {
                return new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: activeOrder.currencyCode || 'XOF',
                    maximumFractionDigits: 0,
                }).format(amount / 100);
            };

            let message = `🛒 *NOUVELLE COMMANDE AHIZAN*\n`;
            message += `-----------------------------------\n\n`;

            activeOrder.lines.forEach((line: any, index: number) => {
                const prodName = line.productVariant?.product?.name || line.productVariant?.name || 'Produit';
                const variantName = line.productVariant?.name && line.productVariant?.name !== prodName ? ` (${line.productVariant.name})` : '';
                const qty = line.quantity;
                const linePrice = formatPrice(line.linePriceWithTax);
                const link = line.productVariant?.product?.slug ? `${baseUrl}/product/${line.productVariant.product.slug}` : '';

                message += `*${index + 1}. ${prodName}${variantName}*\n`;
                message += `• Quantité : ${qty}\n`;
                message += `• Prix : ${linePrice}\n`;
                if (link) {
                    message += `• Lien : ${link}\n`;
                }
                message += `\n`;
            });

            message += `-----------------------------------\n`;
            message += `*TOTAL COMMANDE : ${formatPrice(activeOrder.totalWithTax)}*\n`;
            message += `-----------------------------------`;

            const targetNumber = whatsappNumber || '';
            const cleanNumber = targetNumber.replace(/[^0-9+]/g, '');
            const phone = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : cleanNumber;

            const whatsappUrl = phone 
                ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
                : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

            // Open WhatsApp
            window.open(whatsappUrl, '_blank');

            // Clear the cart after sending
            await emptyCart();
        } catch (err) {
            console.error('Erreur lors de la commande WhatsApp:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            type="button"
            className="w-full h-11 rounded-lg font-bold text-sm shadow-md transition-all active:scale-[0.98] bg-[#25D366] text-white hover:bg-[#20bd5a] flex items-center justify-center gap-2 mt-3"
            onClick={handleWhatsappOrder}
            disabled={loading}
        >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.705 1.754zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            {loading ? 'Redirection...' : 'Continuer la commande sur WhatsApp'}
        </Button>
    );
}
