'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Package, Calendar, Store, Truck, ChevronRight, ShoppingBag } from 'lucide-react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Price } from '@/components/commerce/price';
import { OrderStatusBadge } from '@/components/commerce/order-status-badge';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { getAssetUrl } from '@/lib/vendure/api-utils';

interface OrderLine {
    id: string;
    quantity: number;
    linePriceWithTax: number;
    productVariant?: {
        id: string;
        name: string;
        sku?: string;
        options?: Array<{
            id: string;
            code: string;
            name: string;
            group?: {
                id: string;
                code: string;
                name: string;
            };
        }>;
        product?: {
            id: string;
            name: string;
            slug: string;
            featuredAsset?: {
                preview: string;
            } | null;
            customFields?: {
                vendor?: {
                    id: string;
                    name: string;
                } | null;
            } | null;
        };
    };
    customFields?: {
        sellerStatus?: string;
        assignedVendor?: {
            id: string;
            name: string;
        } | null;
    };
}

interface Order {
    id: string;
    code: string;
    state: string;
    totalWithTax: number;
    currencyCode: string;
    createdAt: string;
    totalQuantity?: number;
    lines: OrderLine[];
    customFields?: {
        sellerStatus?: string;
        adminStatus?: string;
        vendorStatuses?: any;
        isConsolidated?: boolean;
        hubArrivalDate?: string;
        deliveryMissionStatus?: string;
    };
}

interface OrdersTableProps {
    orders: Order[];
    totalPages: number;
    currentPage: number;
}

export function OrdersTable({ orders, totalPages, currentPage }: OrdersTableProps) {
    if (orders.length === 0) {
        return (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 p-8 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Vous n'avez pas encore passé de commande</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mb-6">
                    Découvrez des milliers d'articles proposés par nos marchands et vendeurs certifiés sur Ahizan.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md active:scale-95"
                >
                    Découvrir nos produits
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Orders List Cards */}
            <div className="space-y-4">
                {orders.map((order) => {
                    const lines = order.lines || [];
                    const isDelivered = order.state === 'Delivered' || order.customFields?.adminStatus === 'delivered';
                    const isCancelled = order.state === 'Cancelled' || order.customFields?.adminStatus === 'cancelled';
                    const isOutForDelivery = order.customFields?.deliveryMissionStatus === 'OUT_FOR_DELIVERY';

                    // Unique vendors in this order
                    const vendorNames = Array.from(new Set(
                        lines.map(l => l.customFields?.assignedVendor?.name || l.productVariant?.product?.customFields?.vendor?.name).filter(Boolean)
                    ));

                    return (
                        <div
                            key={order.id}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col"
                        >
                            {/* Card Header: Order Code, Date, Badges */}
                            <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white bg-slate-200/70 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                                        #{order.code}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{formatDate(order.createdAt, 'long')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {isDelivered ? (
                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[11px]">
                                            ✅ Livrée
                                        </Badge>
                                    ) : isCancelled ? (
                                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold text-[11px]">
                                            ❌ Annulée
                                        </Badge>
                                    ) : isOutForDelivery ? (
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold text-[11px] animate-pulse">
                                            🚚 En cours de livraison
                                        </Badge>
                                    ) : (
                                        <OrderStatusBadge state={order.state} />
                                    )}

                                    {order.customFields?.isConsolidated && !isDelivered && !isCancelled && (
                                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold hidden sm:inline-flex">
                                            Hub Central Ahizan
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Card Body: Items Preview and Vendors */}
                            <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                                {/* Items preview thumbnails & names */}
                                <div className="flex-1 min-w-0 space-y-3">
                                    {/* Product items preview */}
                                    <div className="space-y-2">
                                        {lines.slice(0, 3).map((line) => {
                                            const prodName = line.productVariant?.product?.name || line.productVariant?.name || 'Produit';
                                            const variantName = line.productVariant?.name;
                                            const options = line.productVariant?.options || [];
                                            const imgUrl = line.productVariant?.product?.featuredAsset?.preview || null;

                                            return (
                                                <div key={line.id} className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700 overflow-hidden flex-shrink-0 relative">
                                                        {imgUrl ? (
                                                            <img
                                                                src={getAssetUrl(imgUrl)}
                                                                alt={prodName}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                <Package className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                                            {prodName}
                                                        </p>
                                                        {/* Variant options / Declinaisons */}
                                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                            {options.length > 0 ? (
                                                                options.map((opt) => (
                                                                    <span
                                                                        key={opt.id}
                                                                        className="inline-flex items-center text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-slate-600"
                                                                    >
                                                                        {opt.group?.name ? `${opt.group.name}: ` : ''}{opt.name}
                                                                    </span>
                                                                ))
                                                            ) : variantName && variantName !== prodName ? (
                                                                <span className="text-[10px] text-muted-foreground font-medium truncate">
                                                                    {variantName}
                                                                </span>
                                                            ) : null}
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                × {line.quantity}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {lines.length > 3 && (
                                            <p className="text-[11px] text-slate-400 font-medium pl-1">
                                                + {lines.length - 3} autre(s) article(s) dans cette commande
                                            </p>
                                        )}
                                    </div>

                                    {/* Vendors summary */}
                                    {vendorNames.length > 0 && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                                            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="font-semibold truncate">
                                                {vendorNames.length === 1 ? `Vendeur : ${vendorNames[0]}` : `${vendorNames.length} vendeurs : ${vendorNames.join(', ')}`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: Total & CTA Action */}
                                <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700/50 gap-3 shrink-0">
                                    <div className="text-left md:text-right">
                                        <span className="text-[11px] text-slate-400 uppercase font-black tracking-wider block">Total TTC</span>
                                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                            <Price value={order.totalWithTax} currencyCode={order.currencyCode} />
                                        </span>
                                    </div>

                                    <Link
                                        href={`/account/orders/${order.code}`}
                                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white hover:bg-primary/90 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                                    >
                                        <span>Détails & Suivi</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-8">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href={
                                        currentPage > 1
                                            ? `/account/orders?page=${currentPage - 1}`
                                            : '#'
                                    }
                                    className={
                                        currentPage === 1
                                            ? 'pointer-events-none opacity-50'
                                            : ''
                                    }
                                />
                            </PaginationItem>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <PaginationItem key={page}>
                                            <PaginationLink
                                                href={`/account/orders?page=${page}`}
                                                isActive={page === currentPage}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                } else if (
                                    page === currentPage - 2 ||
                                    page === currentPage + 2
                                ) {
                                    return (
                                        <PaginationItem key={page}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    );
                                }
                                return null;
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    href={
                                        currentPage < totalPages
                                            ? `/account/orders?page=${currentPage + 1}`
                                            : '#'
                                    }
                                    className={
                                        currentPage === totalPages
                                            ? 'pointer-events-none opacity-50'
                                            : ''
                                    }
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}
