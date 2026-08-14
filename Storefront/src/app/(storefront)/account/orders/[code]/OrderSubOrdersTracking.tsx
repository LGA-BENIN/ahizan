'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Package, RefreshCw, Store } from 'lucide-react';
import { Price } from '@/components/commerce/price';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

import { continueOrderWithoutReassigningAction, cancelCustomerOrderAction } from './actions';

export function OrderSubOrdersTracking({ order }: { order: any }) {
    const router = useRouter();
    const [loadingVendorId, setLoadingVendorId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Parse vendorStatuses JSON
    let vendorStatusesMap: Record<string, any> = {};
    try {
        if (order.customFields?.vendorStatuses) {
            vendorStatusesMap = typeof order.customFields.vendorStatuses === 'string'
                ? JSON.parse(order.customFields.vendorStatuses)
                : order.customFields.vendorStatuses;
        }
    } catch (e) {}

    // Group lines by vendor
    const linesByVendorMap: { [id: string]: { vendor: any; lines: any[]; total: number } } = {};
    (order.lines || []).forEach((line: any) => {
        const lineVendor = line.productVariant?.product?.customFields?.vendor || { id: 'default', name: 'Boutique Principale' };
        const vId = String(lineVendor?.id || 'default');
        if (!linesByVendorMap[vId]) {
            linesByVendorMap[vId] = { vendor: lineVendor, lines: [], total: 0 };
        }
        linesByVendorMap[vId].lines.push(line);
        linesByVendorMap[vId].total += (line.proratedLinePriceWithTax || line.linePriceWithTax || (line.listPrice * line.quantity) || 0);
    });

    const vendorGroups = Object.keys(linesByVendorMap).map(k => linesByVendorMap[k]);

    // Calculate how many lines are active (i.e. not cancelled, refused, or in reassignment)
    const totalLinesCount = order.lines?.length || 0;
    const cancelledOrRefusedLinesCount = (order.lines || []).filter((l: any) => 
        l.customFields?.sellerStatus === 'cancelled' ||
        l.customFields?.sellerStatus === 'refused' ||
        l.customFields?.sellerStatus === 'reassigning' ||
        l.customFields?.sellerStatus === 'reassigned_to_other'
    ).length;
    const remainingActiveLinesCount = totalLinesCount - cancelledOrRefusedLinesCount;

    // Check if any vendor has refused / reassigning pending customer decision
    const cancelledVendorGroups = vendorGroups.filter(group => {
        const vId = String(group.vendor?.id || 'default');
        const vStat = vendorStatusesMap[vId]?.sellerStatus || 'pending';
        const hasRefusedLine = group.lines.some(l => l.customFields?.sellerStatus === 'refused' || l.customFields?.sellerStatus === 'reassigning');
        return vStat === 'refused' || vStat === 'reassigning' || hasRefusedLine;
    });

    const handleContinueWithoutReassigned = async (lineId?: string) => {
        const targetId = lineId || 'all';
        setLoadingVendorId(targetId);
        setErrorMsg(null);
        try {
            const res = await continueOrderWithoutReassigningAction(order.id, lineId);
            if (!res.success) {
                throw new Error(res.error);
            }
            router.refresh();
        } catch (e: any) {
            setErrorMsg(e.message || 'Échec de la mise à jour.');
        } finally {
            setLoadingVendorId(null);
        }
    };

    const handleCancelOrder = async () => {
        if (!confirm('Êtes-vous sûr de vouloir annuler la totalité de cette commande ?')) return;
        setLoadingVendorId('cancel');
        setErrorMsg(null);
        try {
            const res = await cancelCustomerOrderAction(order.id);
            if (!res.success) {
                throw new Error(res.error);
            }
            router.refresh();
        } catch (e: any) {
            setErrorMsg(e.message || 'Échec de l\'annulation.');
        } finally {
            setLoadingVendorId(null);
        }
    };

    const reassignedLines = (order.lines || []).filter((l: any) =>
        l.customFields?.sellerStatus === 'refused' || l.customFields?.sellerStatus === 'reassigning'
    );

    return (
        <div className="space-y-6">
            {/* Banner if vendor cancellation occurs */}
            {cancelledVendorGroups.length > 0 && order.state !== 'Cancelled' && (
                <Card className="border-2 border-amber-400 bg-amber-50/50 shadow-md">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600 animate-pulse" />
                            Avis important sur votre commande multi-vendeurs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-amber-950">
                        <p>
                            Un ou plusieurs vendeurs n'ont pas pu confirmer leur partie de votre commande.
                            Vous pouvez choisir de continuer la commande sans cet article ou d'annuler la commande.
                        </p>

                        {errorMsg && (
                            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-xs font-semibold">
                                {errorMsg}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                            <Button
                                size="sm"
                                variant="default"
                                disabled={loadingVendorId !== null}
                                onClick={() => handleContinueWithoutReassigned(reassignedLines.length === 1 ? reassignedLines[0].id : undefined)}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow"
                            >
                                {loadingVendorId === 'all' || (reassignedLines.length === 1 && loadingVendorId === reassignedLines[0].id) ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                ) : (
                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                {reassignedLines.length > 1 ? 'Continuer la commande sans les produits refusés' : 'Continuer la commande sans ce produit'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={loadingVendorId !== null}
                                onClick={handleCancelOrder}
                                className="border-rose-300 text-rose-700 hover:bg-rose-100 font-bold text-xs"
                            >
                                {loadingVendorId === 'cancel' ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                ) : null}
                                Annuler la commande
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Sub-Orders list by Vendor */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    Suivi des articles par Vendeur ({vendorGroups.length})
                </h3>

                {vendorGroups.map((group) => {
                    const vId = String(group.vendor.id || 'default');
                    const sellerStat = vendorStatusesMap[vId]?.sellerStatus || 'pending';
                    const adminStat = vendorStatusesMap[vId]?.adminStatus || 'pending';

                    // Compute display status according to specification
                    let statusLabel = '⏳ En cours de confirmation';
                    let badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                    if (order.state === 'Cancelled' || sellerStat === 'cancelled') {
                        statusLabel = '❌ Annulée';
                        badgeClass = 'bg-slate-100 text-slate-600 border-slate-200 font-bold';
                    } else if (sellerStat === 'refused' || sellerStat === 'reassigning') {
                        statusLabel = '🚨 En cours de réassignation';
                        badgeClass = 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
                    } else if (sellerStat === 'reassigned_to_other') {
                        statusLabel = '⏭️ Réassignée à un autre vendeur';
                        badgeClass = 'bg-purple-100 text-purple-800 border-purple-200 font-bold';
                    } else if (sellerStat === 'confirmed') {
                        if (adminStat === 'delivered') {
                            statusLabel = '📦 Livré au client';
                            badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        } else if (adminStat === 'shipped') {
                            statusLabel = '🚚 Expédiée par livreur';
                            badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                        } else if (adminStat === 'in_transit') {
                            statusLabel = '✈️ En cours d\'acheminement';
                            badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
                        } else {
                            statusLabel = '👨‍🍳 En cours de préparation';
                            badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
                        }
                    }

                    return (
                        <Card key={vId} className="border shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/80 py-3 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Store className="h-4 w-4 text-slate-500" />
                                    <span className="font-bold text-sm text-slate-900">
                                        Vendeur : {group.vendor.name || 'Boutique Ahizan'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Badge className={`text-xs px-2.5 py-1 border ${badgeClass}`}>
                                        {statusLabel}
                                    </Badge>
                                    {(sellerStat === 'refused' || sellerStat === 'reassigning') && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer">
                                                        <span className="text-[12px] font-black leading-none bg-slate-200 text-slate-700 w-4 h-4 rounded-full flex items-center justify-center font-sans border border-slate-300">?</span>
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs bg-slate-900 text-white p-3 rounded-lg text-xs leading-normal shadow-lg border border-slate-800">
                                                    La réassignation signifie que le SuperAdmin recherche un autre vendeur partenaire pour vous livrer ce produit.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                {group.lines.map((line: any) => {
                                    const isCancelled = line.customFields?.sellerStatus === 'cancelled';
                                    return (
                                        <div key={line.id} className={`flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0 ${isCancelled ? 'opacity-60 grayscale' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded flex items-center justify-center font-bold text-xs ${isCancelled ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                    {line.quantity}x
                                                </div>
                                                <div>
                                                    <p className={`font-semibold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                        {line.productVariant.product.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{line.productVariant.name}</p>
                                                    {isCancelled && (
                                                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                                            Annulé par le client
                                                        </span>
                                                    )}
                                                    {(line.customFields?.sellerStatus === 'refused' || line.customFields?.sellerStatus === 'reassigning') && order.state !== 'Cancelled' && (
                                                        <Button
                                                            size="sm"
                                                            disabled={loadingVendorId !== null}
                                                            onClick={() => handleContinueWithoutReassigned(line.id)}
                                                            className="mt-2 h-7 px-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shadow"
                                                        >
                                                            {loadingVendorId === line.id ? (
                                                                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                                            ) : null}
                                                            Continuer sans ce produit
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`font-medium ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                <Price value={line.linePriceWithTax} currencyCode={order.currencyCode} />
                                            </span>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
