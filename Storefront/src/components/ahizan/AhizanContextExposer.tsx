"use client";
import { useEffect } from 'react';
import { syncCustomerActiveLocationAction } from '@/lib/vendure/location-actions';

declare global {
    interface Window {
        ahizan: any;
    }
}

export function AhizanContextExposer({ page, order, customer, market, neighborhood }: any) {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.ahizan = {
                ...window.ahizan,
                page: page !== undefined ? page : window.ahizan?.page,
                cart: order !== undefined ? order : window.ahizan?.cart,
                customer: customer !== undefined ? customer : window.ahizan?.customer,
                market: market !== undefined ? market : window.ahizan?.market,
                neighborhood: neighborhood !== undefined ? neighborhood : window.ahizan?.neighborhood,
            };

            // Helper to get products in cart that belong to the current market
            window.ahizan.getMarketCartProducts = () => {
                const currentOrder = window.ahizan.cart;
                const currentMarket = window.ahizan.market;
                if (!currentOrder || !currentOrder.lines || !currentMarket) return [];
                return currentOrder.lines.filter((line: any) => {
                    const vendor = line.productVariant?.product?.customFields?.vendor;
                    if (!vendor) return false;
                    const vendorMarketIds = [
                        ...(vendor.markets || []).map((m: any) => String(m.id)),
                        vendor.physicalMarket ? String(vendor.physicalMarket.id) : null
                    ].filter(Boolean);
                    return vendorMarketIds.includes(String(currentMarket.id));
                });
            };

            // Helper to get products in cart that belong to the current neighborhood/quartier
            window.ahizan.getNeighborhoodCartProducts = () => {
                const currentOrder = window.ahizan.cart;
                const currentNeighborhood = window.ahizan.neighborhood;
                if (!currentOrder || !currentOrder.lines || !currentNeighborhood) return [];
                return currentOrder.lines.filter((line: any) => {
                    const vendor = line.productVariant?.product?.customFields?.vendor;
                    if (!vendor || !vendor.location) return false;
                    return String(vendor.location.id) === String(currentNeighborhood.id);
                });
            };
        }
    }, [page, order, customer, market, neighborhood]);

    // Automatically sync localStorage client location with authenticated customer profile in DB
    useEffect(() => {
        if (customer?.id && typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('ahizan_client_location');
                if (stored) {
                    const loc = JSON.parse(stored);
                    syncCustomerActiveLocationAction(loc).catch(() => {});
                }
            } catch {}
        }
    }, [customer?.id]);

    return null;
}
