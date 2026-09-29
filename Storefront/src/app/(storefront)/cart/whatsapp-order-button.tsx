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
                }).format(amount);
            };

            let message = `🛒 *COMMANDE SUR AHIZAN*\n`;
            message += `-----------------------------------\n`;
            if (activeOrder.code) {
                message += `*Réf Commande :* #${activeOrder.code}\n`;
            }
            message += `*Nombre d'articles :* ${activeOrder.totalQuantity || activeOrder.lines.length}\n\n`;
            message += `📦 *DÉTAIL DES ARTICLES :*\n\n`;

            const vendorsFound: any[] = [];

            activeOrder.lines.forEach((line: any, index: number) => {
                const prodName = line.productVariant?.product?.name || line.productVariant?.name || 'Produit';
                const variantName = line.productVariant?.name && line.productVariant?.name !== prodName ? ` (${line.productVariant.name})` : '';
                const qty = line.quantity;
                const linePrice = formatPrice(line.linePriceWithTax);
                const assignedVendor = line.customFields?.assignedVendor || line.productVariant?.product?.customFields?.vendor;
                
                if (assignedVendor?.id && !vendorsFound.some(v => String(v.id) === String(assignedVendor.id))) {
                    vendorsFound.push(assignedVendor);
                }

                const vendorName = assignedVendor?.name || '';
                const marketOrZone = assignedVendor?.physicalMarket?.name || assignedVendor?.location?.name || '';
                const vendorLabel = vendorName ? `${vendorName}${marketOrZone ? ` (${marketOrZone})` : ''}` : '';

                const vId = line.productVariant?.id;
                const sellerId = assignedVendor?.id;
                const prodSlug = line.productVariant?.product?.slug || line.productVariant?.product?.id;
                
                const queryParams = new URLSearchParams();
                if (vId) queryParams.set('variantId', String(vId));
                if (sellerId) queryParams.set('sellerId', String(sellerId));
                const queryString = queryParams.toString();
                const link = prodSlug ? `${baseUrl}/product/${prodSlug}${queryString ? `?${queryString}` : ''}` : '';

                message += `*${index + 1}. ${prodName}${variantName}*\n`;
                if (vendorLabel) {
                    message += `• Vendeur / Boutique : ${vendorLabel}\n`;
                }
                if (line.productVariant?.sku) {
                    message += `• Réf/SKU : ${line.productVariant.sku}\n`;
                }
                message += `• Quantité : ${qty}\n`;
                message += `• Prix : ${linePrice}\n`;
                if (link) {
                    message += `• Lien : ${link}\n`;
                }
                message += `\n`;
            });

            message += `-----------------------------------\n`;
            message += `*TOTAL COMMANDE : ${formatPrice(activeOrder.totalWithTax)}*\n`;
            message += `-----------------------------------\n`;
            message += `Bonjour, je souhaite finaliser cette commande. Merci de me confirmer la disponibilité et le mode de livraison.`;

            // Strictly use centralized platform WhatsApp number from backend settings
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
            variant="outline"
            className="w-full h-12 rounded-full font-bold text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-3"
            onClick={handleWhatsappOrder}
            disabled={loading}
        >
            <svg className="w-5 h-5 fill-[#25D366]" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.705 1.754zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            {loading ? 'Redirection...' : 'Continuer la commande sur WhatsApp'}
        </Button>
    );
}
