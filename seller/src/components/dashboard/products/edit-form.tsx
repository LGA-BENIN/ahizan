'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { query } from '@/lib/vendure/api';
import { tagProductWithVariantOffersAction, uploadFileAction } from '@/app/dashboard/products/actions';
import ImageCropModal from '@/components/ImageCropModal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
    Package, 
    ImageIcon, 
    Trash2, 
    Tag, 
    Percent, 
    CheckCircle2, 
    AlertTriangle, 
    Loader2, 
    Plus, 
    Layers, 
    Check, 
    Eye,
    ArrowLeft,
    Sparkles,
    SlidersHorizontal,
    Camera,
    UploadCloud,
    Truck,
    Info,
    ChevronDown,
    ChevronUp,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { priceFromSubunit } from '@/lib/format';
import Link from 'next/link';

// Global option groups query
const GET_GLOBAL_OPTION_GROUPS_QUERY = `
  query GetGlobalOptionGroups {
    getGlobalOptionGroups {
      id
      code
      name
      options {
        id
        code
        name
      }
    }
  }
`;

interface EditProductFormProps {
    product: any;
    collectionTree: any[];
}

interface VariantOfferRow {
    id: string; // ProductVariant ID or temp ID
    name: string;
    optionIds: string[];
    sku: string;
    price: number;
    stock: number;
    onPromotion: boolean;
    promotionalPrice: number;
    featuredAssetId?: string;
    featuredAssetPreview?: string;
    deliveryTimeValue: number;
    deliveryTimeUnit: string;
    condition: string;
    rejectionReason?: string | null;
    offerStatus?: string | null;
    enabled: boolean;
}

interface OptionGroupSelection {
    id: string;
    code: string;
    name: string;
    selectedOptions: Array<{ id: string; code: string; name: string }>;
    customValues: string[];
}

export default function EditProductForm({ product, collectionTree }: EditProductFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOfficialDetails, setShowOfficialDetails] = useState(false);
    const [showReconfigurator, setShowReconfigurator] = useState(false);
    const [uploadingVariantId, setUploadingVariantId] = useState<string | null>(null);

    // Platform option groups state
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState<OptionGroupSelection[]>([]);
    const [customOptionInputs, setCustomOptionInputs] = useState<Record<string, string>>({});

    // Parse initial variant offers
    const initialVariantOffers: VariantOfferRow[] = useMemo(() => {
        if (!product.variants || product.variants.length === 0) {
            return [{
                id: 'default',
                name: product.name,
                optionIds: [],
                sku: '',
                price: 0,
                stock: 5,
                onPromotion: false,
                promotionalPrice: 0,
                featuredAssetId: product.featuredAsset?.id,
                featuredAssetPreview: product.featuredAsset?.preview,
                deliveryTimeValue: 2,
                deliveryTimeUnit: 'DAYS',
                condition: 'NEW',
                enabled: true
            }];
        }

        return product.variants.map((v: any, idx: number) => {
            const vPrice = v.priceWithTax ? priceFromSubunit(v.priceWithTax, v.currencyCode || 'XOF') : 0;
            const vPromo = (v.customFields as any)?.onPromotion || false;
            const vPromoPrice = (v.customFields as any)?.promotionalPrice 
                ? priceFromSubunit((v.customFields as any).promotionalPrice, v.currencyCode || 'XOF') 
                : 0;

            const optIds = (v.options || []).map((o: any) => String(o.id));
            const optionsStr = (v.options || []).map((o: any) => o.name).filter(Boolean).join(' ');
            const fallbackName = optionsStr ? `${product.name} ${optionsStr}` : product.name;
            const resolvedName = v.name && !v.name.includes('Option ') && !v.name.includes('Option 2') ? v.name : fallbackName;

            return {
                id: String(v.id),
                name: resolvedName,
                optionIds: optIds,
                sku: v.sku || '',
                price: vPrice,
                stock: v.stockOnHand !== undefined && v.stockOnHand !== null ? v.stockOnHand : 5,
                onPromotion: vPromo,
                promotionalPrice: vPromoPrice,
                featuredAssetId: v.featuredAsset?.id || product.featuredAsset?.id,
                featuredAssetPreview: v.featuredAsset?.preview || product.featuredAsset?.preview,
                deliveryTimeValue: (v.customFields as any)?.deliveryTimeValue || 2,
                deliveryTimeUnit: (v.customFields as any)?.deliveryTimeUnit || 'DAYS',
                condition: (v.customFields as any)?.condition || 'NEW',
                rejectionReason: (v.customFields as any)?.rejectionReason || null,
                offerStatus: (v.customFields as any)?.offerStatus || null,
                enabled: true
            };
        });
    }, [product]);

    const [variantOffers, setVariantOffers] = useState<VariantOfferRow[]>(initialVariantOffers);

    // Fetch platform option groups
    useEffect(() => {
        async function fetchOptionGroups() {
            setLoadingGroups(true);
            try {
                const res = await query(GET_GLOBAL_OPTION_GROUPS_QUERY, {});
                if ((res.data as any)?.getGlobalOptionGroups) {
                    setAvailableGroups((res.data as any).getGlobalOptionGroups);
                }
            } catch (err) {
                console.error('[EditProductForm] Failed to load option groups:', err);
            } finally {
                setLoadingGroups(false);
            }
        }
        fetchOptionGroups();
    }, []);

    // Handlers for variant offers
    const handleVariantChange = (id: string, field: keyof VariantOfferRow, value: any) => {
        setVariantOffers(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const handleRemoveVariant = (id: string) => {
        if (variantOffers.length <= 1) {
            toast.warning('Votre offre doit contenir au moins une déclinaison.');
            return;
        }
        setVariantOffers(prev => prev.filter(v => v.id !== id));
    };

    // Handle variant image crop & upload
    const [cropState, setCropState] = useState<{
        variantId: string;
        imageSrc: string;
        file: File;
    } | null>(null);

    const handleVariantFileChange = (variantId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Veuillez sélectionner un fichier image');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setCropState({
                variantId,
                imageSrc: reader.result as string,
                file,
            });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!cropState) return;
        const variantId = cropState.variantId;
        const sourceFile = cropState.file;
        setUploadingVariantId(variantId);
        setCropState(null);

        try {
            const croppedFile = new File([croppedBlob], sourceFile.name, { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', croppedFile);
            const res = await uploadFileAction(formData);

            if (res.success && res.asset) {
                setVariantOffers((prev: any[]) => prev.map((v: any) => 
                    v.id === variantId 
                        ? { ...v, featuredAssetId: res.asset.id, featuredAssetPreview: res.asset.preview } 
                        : v
                ));
                toast.success('Visuel de la déclinaison cadré et mis à jour');
            } else {
                toast.error(res.error || 'Erreur lors du téléversement');
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du téléversement');
        } finally {
            setUploadingVariantId(null);
        }
    };

    // Option groups selection helpers
    const toggleGroup = (group: any) => {
        setSelectedGroups(prev => {
            const exists = prev.find(g => g.id === group.id);
            if (exists) {
                return prev.filter(g => g.id !== group.id);
            } else {
                return [...prev, {
                    id: group.id,
                    code: group.code,
                    name: group.name,
                    selectedOptions: [],
                    customValues: []
                }];
            }
        });
    };

    const toggleOption = (groupId: string, option: any) => {
        setSelectedGroups(prev => prev.map(g => {
            if (g.id !== groupId) return g;
            const exists = g.selectedOptions.find(o => o.id === option.id);
            const newOpts = exists 
                ? g.selectedOptions.filter(o => o.id !== option.id)
                : [...g.selectedOptions, option];
            return { ...g, selectedOptions: newOpts };
        }));
    };

    const handleAddCustomValue = (groupId: string) => {
        const val = (customOptionInputs[groupId] || '').trim();
        if (!val) return;

        setSelectedGroups(prev => prev.map(g => {
            if (g.id !== groupId) return g;
            if (g.customValues.includes(val) || g.selectedOptions.some(o => o.name.toLowerCase() === val.toLowerCase())) {
                toast.warning(`La valeur "${val}" existe déjà.`);
                return g;
            }
            return { ...g, customValues: [...g.customValues, val] };
        }));

        setCustomOptionInputs(prev => ({ ...prev, [groupId]: '' }));
    };

    const handleRemoveCustomValue = (groupId: string, val: string) => {
        setSelectedGroups(prev => prev.map(g => {
            if (g.id !== groupId) return g;
            return { ...g, customValues: g.customValues.filter(v => v !== val) };
        }));
    };

    // Generate Cartesian Matrix of Variant Offers
    const handleGenerateMatrix = () => {
        const activeSelections = selectedGroups.map(g => {
            const items = [
                ...g.selectedOptions.map(o => ({ id: o.id, name: o.name, groupName: g.name })),
                ...g.customValues.map(v => ({ id: `custom_${g.code}_${v}`, name: v, groupName: g.name }))
            ];
            return { groupName: g.name, items };
        }).filter(s => s.items.length > 0);

        if (activeSelections.length === 0) {
            toast.error('Veuillez sélectionner au moins une valeur dans les groupes d\'options.');
            return;
        }

        const cartesian = (arrays: any[][]): any[][] => {
            return arrays.reduce((acc, curr) => 
                acc.flatMap(d => curr.map(e => [...d, e])), 
                [[]] as any[][]
            );
        };

        const combinations = cartesian(activeSelections.map(s => s.items));
        const defaultPrice = variantOffers[0]?.price || 1000;
        const defaultStock = variantOffers[0]?.stock || 5;

        const newGeneratedVariants: VariantOfferRow[] = combinations.map((combo, idx) => {
            const variantName = `${product.name} ${combo.map(c => c.name).join(' ')}`;
            const optIds = combo.map(c => c.id).filter(id => !id.startsWith('custom_'));

            return {
                id: `gen_${Date.now()}_${idx}`,
                name: variantName,
                optionIds: optIds,
                sku: `${product.slug?.toUpperCase().slice(0, 4) || 'OFFER'}-${idx + 1}`,
                price: defaultPrice,
                stock: defaultStock,
                onPromotion: false,
                promotionalPrice: 0,
                featuredAssetId: product.featuredAsset?.id,
                featuredAssetPreview: product.featuredAsset?.preview,
                deliveryTimeValue: 2,
                deliveryTimeUnit: 'DAYS',
                condition: 'NEW',
                enabled: true
            };
        });

        setVariantOffers(newGeneratedVariants);
        setShowReconfigurator(false);
        toast.success(`${newGeneratedVariants.length} déclinaison(s) générée(s) avec succès !`);
    };

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const activeOffers = variantOffers.filter(v => v.enabled);
        if (activeOffers.length === 0) {
            toast.error('Veuillez activer au moins une déclinaison pour votre offre.');
            setIsSubmitting(false);
            return;
        }

        // Validate prices & stocks
        for (const off of activeOffers) {
            if (!off.price || off.price <= 0) {
                toast.error(`Le prix de la déclinaison "${off.name}" doit être supérieur à 0 FCFA.`);
                setIsSubmitting(false);
                return;
            }
            if (off.onPromotion) {
                if (!off.promotionalPrice || off.promotionalPrice >= off.price) {
                    toast.error(`Le prix promotionnel pour "${off.name}" doit être inférieur au prix normal (${off.price.toLocaleString('fr-FR')} FCFA).`);
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        try {
            const optionGroupsPayload = selectedGroups.length > 0 ? selectedGroups.map(g => ({
                name: g.name,
                code: g.code,
                options: [
                    ...g.selectedOptions.map(o => ({ name: o.name, code: o.code })),
                    ...g.customValues.map(v => ({ name: v, code: v.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))
                ]
            })) : undefined;

            // Prepare TagProductWithVariantOffers input
            const payload: any = {
                productId: product.id,
                optionGroups: optionGroupsPayload,
                offers: activeOffers.map(v => {
                    let optionNames: string[] = [];
                    if (v.name && product.name && v.name.startsWith(product.name)) {
                        const rawOptsStr = v.name.substring(product.name.length).trim().replace(/^-\s*/, '');
                        optionNames = rawOptsStr.split(/\s+/).filter(Boolean);
                    }

                    return {
                        variantId: v.id && !v.id.startsWith('gen_') && !v.id.startsWith('new_') ? v.id : undefined,
                        productVariantId: v.id && !v.id.startsWith('gen_') && !v.id.startsWith('new_') ? v.id : undefined,
                        optionIds: v.optionIds && v.optionIds.length > 0 ? v.optionIds : undefined,
                        optionNames: optionNames.length > 0 ? optionNames : undefined,
                        name: v.name,
                        sku: v.sku && v.sku.trim() !== '' ? v.sku.trim() : undefined,
                        price: Math.round(v.price),
                        stock: Number(v.stock) || 0,
                        onPromotion: v.onPromotion,
                        promotionalPrice: v.onPromotion && v.promotionalPrice ? Math.round(v.promotionalPrice) : undefined,
                        featuredAssetId: v.featuredAssetId || undefined,
                        deliveryTimeValue: Number(v.deliveryTimeValue) || 2,
                        deliveryTimeUnit: v.deliveryTimeUnit || 'DAYS',
                        condition: v.condition || 'NEW',
                    };
                })
            };

            const res = await tagProductWithVariantOffersAction(payload);
            if (res.success) {
                if (product.customFields) {
                    product.customFields.rejectionReason = null;
                    product.customFields.approvalStatus = 'pending';
                }
                setVariantOffers(prev => prev.map(v => ({ ...v, rejectionReason: null })));
                toast.success('Vos offres ont été mises à jour avec succès !');
                router.push('/dashboard/products');
                router.refresh();
            } else {
                toast.error(res.error || 'Erreur lors de la mise à jour de vos offres');
            }
        } catch (err: any) {
            console.error('[EditProductForm] Submit error:', err);
            toast.error(err.message || 'Une erreur inattendue est survenue');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">

            {/* Superadmin Corrections / Remarks Banner */}
            {(() => {
                const productCorrection = product.customFields?.rejectionReason;
                const variantRemarks = variantOffers.filter(v => !!v.rejectionReason);
                const hasCorrection = !!productCorrection || variantRemarks.length > 0 || product.customFields?.approvalStatus === 'correction_requested';

                if (!hasCorrection) return null;

                return (
                    <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 md:p-6 space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm md:text-base text-amber-700 dark:text-amber-400">
                                    📢 Remarques et Corrections Demandées par l&apos;Administration
                                </h3>
                                <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                                    Veuillez ajuster les points mentionnés ci-dessous avant d&apos;enregistrer vos modifications.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 pt-1">
                            {productCorrection && (
                                <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 font-medium">
                                    <strong>Remarque globale :</strong> {productCorrection}
                                </div>
                            )}
                            {variantRemarks.map((v, i) => (
                                <div key={v.id || i} className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 font-medium">
                                    <strong>Déclinaison &laquo; {v.name} &raquo; :</strong> {v.rejectionReason}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}
            
            {/* 1. Bloc Fiche Officielle Ahizan (Lecture Seule) */}
            {(() => {
                const officialSku = product.variants?.[0]?.sku || (product.customFields as any)?.sku || '';
                const officialEan = (product.variants?.[0]?.customFields as any)?.ean || (product.customFields as any)?.ean || '';

                return (
                    <div className="bg-muted/30 border border-border/80 rounded-2xl p-5 md:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                            Catalogue Central Ahizan
                                        </span>
                                    </div>
                                    <h2 className="text-lg md:text-xl font-serif font-black text-foreground mt-0.5">
                                        {product.name}
                                    </h2>
                                </div>
                            </div>

                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowOfficialDetails(!showOfficialDetails)}
                                className="text-xs font-bold gap-1.5 self-start sm:self-auto rounded-xl"
                            >
                                <Info className="w-3.5 h-3.5" />
                                {showOfficialDetails ? 'Masquer les détails' : 'Voir les détails de référence'}
                                {showOfficialDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </Button>
                        </div>

                        {/* Extended Details Drawer */}
                        {showOfficialDetails && (
                            <div className="pt-4 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border">
                                    {product.featuredAsset?.preview ? (
                                        <img 
                                            src={product.featuredAsset.preview} 
                                            alt={product.name} 
                                            className="w-14 h-14 object-cover rounded-lg shrink-0 border"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0">
                                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="min-w-0 text-xs space-y-1">
                                        <div className="font-bold truncate">{product.name}</div>
                                        {officialSku && (
                                            <div className="text-[11px] text-muted-foreground truncate">
                                                <span className="font-semibold text-foreground">SKU Ahizan :</span> <span className="font-mono">{officialSku}</span>
                                            </div>
                                        )}
                                        {officialEan && (
                                            <div className="text-[11px] text-muted-foreground truncate">
                                                <span className="font-semibold text-foreground">Code EAN :</span> <span className="font-mono">{officialEan}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-card p-3 rounded-xl border border-border text-xs space-y-1.5">
                                    <div className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Description de référence :</div>
                                    <div 
                                        className="line-clamp-3 text-muted-foreground text-xs leading-relaxed prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: product.description || '<i>Aucune description fournie</i>' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* 2. Reconfigurateur de Groupes d'Options (Accordeon / Modal) */}
            <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-bold text-foreground">
                                Mes Déclinaisons &amp; Offres Commerciales
                            </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Définissez vos prix, stocks, promotions, visuels et délais pour chaque déclinaison.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant={showReconfigurator ? "secondary" : "default"}
                        onClick={() => setShowReconfigurator(!showReconfigurator)}
                        className="text-xs font-bold gap-2 rounded-xl shrink-0"
                    >
                        <Sparkles className="w-4 h-4" />
                        {showReconfigurator ? 'Fermer le configurateur' : '⚡ Reconfigurer les groupes d\'options'}
                    </Button>
                </div>

                {/* Option Groups Selector Matrix Generator */}
                {showReconfigurator && (
                    <div className="p-5 rounded-2xl bg-muted/40 border border-primary/20 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4 text-primary" />
                                1. Sélectionnez les Groupes d&apos;Options de la plateforme
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Cochez les groupes d&apos;options pertinents (ex: Couleur, Taille, Modèle) pour générer votre grille de variantes.
                            </p>
                        </div>

                        {loadingGroups ? (
                            <div className="flex items-center justify-center p-8 gap-2 text-xs text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                Chargement des groupes d&apos;options...
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {availableGroups.map((group) => {
                                    const isSelected = selectedGroups.some(g => g.id === group.id);
                                    return (
                                        <button
                                            key={group.id}
                                            type="button"
                                            onClick={() => toggleGroup(group)}
                                            className={cn(
                                                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer",
                                                isSelected 
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                                    : "bg-card hover:bg-muted text-foreground border-border"
                                            )}
                                        >
                                            {group.name}
                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Configurer les valeurs pour chaque groupe sélectionné */}
                        {selectedGroups.length > 0 && (
                            <div className="space-y-4 pt-2">
                                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                                    2. Définissez les valeurs pour chaque groupe
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedGroups.map((selGroup) => {
                                        const originalGroup = availableGroups.find(g => g.id === selGroup.id);
                                        const predefinedOptions = originalGroup?.options || [];

                                        return (
                                            <div key={selGroup.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                                                        {selGroup.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                                        {selGroup.selectedOptions.length + selGroup.customValues.length} valeur(s)
                                                    </span>
                                                </div>

                                                {/* Options prédéfinies */}
                                                {predefinedOptions.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                                                        {predefinedOptions.map((opt: any) => {
                                                            const isChecked = selGroup.selectedOptions.some(o => o.id === opt.id);
                                                            return (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    onClick={() => toggleOption(selGroup.id, opt)}
                                                                    className={cn(
                                                                        "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border cursor-pointer",
                                                                        isChecked 
                                                                            ? "bg-primary/15 text-primary border-primary/30 font-bold" 
                                                                            : "bg-muted/50 hover:bg-muted text-muted-foreground border-transparent"
                                                                    )}
                                                                >
                                                                    {opt.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Valeurs personnalisées */}
                                                <div className="flex items-center gap-1.5 pt-1">
                                                    <Input
                                                        placeholder={`Ajouter une valeur (ex: XL, Rouge...)`}
                                                        value={customOptionInputs[selGroup.id] || ''}
                                                        onChange={(e) => setCustomOptionInputs({ ...customOptionInputs, [selGroup.id]: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddCustomValue(selGroup.id);
                                                            }
                                                        }}
                                                        className="h-8 text-xs rounded-lg"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleAddCustomValue(selGroup.id)}
                                                        className="h-8 px-3 rounded-lg text-xs font-bold shrink-0"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>

                                                {selGroup.customValues.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 pt-1">
                                                        {selGroup.customValues.map(cv => (
                                                            <span key={cv} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-bold">
                                                                {cv}
                                                                <button type="button" onClick={() => handleRemoveCustomValue(selGroup.id, cv)} className="hover:text-destructive">
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-3 flex justify-end">
                                    <Button
                                        type="button"
                                        onClick={handleGenerateMatrix}
                                        className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider gap-2 shadow-md shadow-primary/20"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Générer la grille des combinaisons
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Grille des Déclinaisons & Offres Commerciales */}
                <div className="space-y-4">
                    {variantOffers.map((variant, index) => (
                        <div 
                            key={variant.id || index}
                            className={cn(
                                "p-4 md:p-5 rounded-2xl border transition-all space-y-4",
                                variant.enabled 
                                    ? "bg-card border-border shadow-xs" 
                                    : "bg-muted/20 border-border/50 opacity-60"
                            )}
                        >
                            {/* Variant-specific correction callout on top */}
                            {variant.rejectionReason && (
                                <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium flex items-start gap-2.5 animate-in fade-in">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-400 block">
                                            Demande de correction de l'administrateur :
                                        </span>
                                        <p className="text-xs leading-relaxed">{variant.rejectionReason}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                                <div className="flex items-center gap-3">
                                    {/* Variant Image Upload Button */}
                                    <div className="relative group shrink-0">
                                        <label className="w-14 h-14 rounded-xl border border-dashed border-border group-hover:border-primary flex flex-col items-center justify-center bg-muted/30 cursor-pointer overflow-hidden transition-all relative">
                                            {variant.featuredAssetPreview ? (
                                                <img 
                                                    src={variant.featuredAssetPreview} 
                                                    alt={variant.name} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <Camera className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            )}
                                            {uploadingVariantId === variant.id ? (
                                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <UploadCloud className="w-4 h-4 text-white" />
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        disabled={uploadingVariantId === variant.id}
                                                        onChange={(e: any) => handleVariantFileChange(variant.id, e)}
                                                    />
                                                </div>
                                            )}
                                        </label>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-sm text-foreground">
                                            {variant.name}
                                        </h4>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                            Déclinaison #{index + 1}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={variant.enabled}
                                            onCheckedChange={(checked) => handleVariantChange(variant.id, 'enabled', checked)}
                                            id={`enable-${variant.id}`}
                                        />
                                        <Label htmlFor={`enable-${variant.id}`} className="text-xs font-semibold cursor-pointer">
                                            {variant.enabled ? 'Actif' : 'Désactivé'}
                                        </Label>
                                    </div>

                                    {variantOffers.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveVariant(variant.id)}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Inputs Matrix */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Regular Price */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                                        <Tag className="w-3.5 h-3.5 text-primary" />
                                        Prix normal (FCFA) *
                                    </Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        required
                                        value={variant.price || ''}
                                        onChange={(e) => handleVariantChange(variant.id, 'price', parseInt(e.target.value) || 0)}
                                        placeholder="Ex: 5000"
                                        className="h-9 text-xs font-bold rounded-xl"
                                    />
                                </div>

                                {/* Stock */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                                        <Package className="w-3.5 h-3.5 text-primary" />
                                        Stock disponible *
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        required
                                        value={variant.stock !== undefined ? variant.stock : ''}
                                        onChange={(e) => handleVariantChange(variant.id, 'stock', Math.max(0, parseInt(e.target.value) || 0))}
                                        placeholder="Ex: 10"
                                        className="h-9 text-xs font-bold rounded-xl"
                                    />
                                </div>

                                {/* SKU */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">
                                        SKU / Réf. Vendeur
                                    </Label>
                                    <Input
                                        type="text"
                                        value={variant.sku || ''}
                                        onChange={(e) => handleVariantChange(variant.id, 'sku', e.target.value)}
                                        placeholder="Ex: REF-ROUGE-L"
                                        className="h-9 text-xs rounded-xl"
                                    />
                                </div>

                                {/* État / Condition */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">
                                        État du produit
                                    </Label>
                                    <Select 
                                        value={variant.condition || 'NEW'} 
                                        onValueChange={(val) => handleVariantChange(variant.id, 'condition', val)}
                                    >
                                        <SelectTrigger className="h-9 text-xs rounded-xl">
                                            <SelectValue placeholder="État" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NEW">Neuf</SelectItem>
                                            <SelectItem value="USED_LIKE_NEW">Comme neuf</SelectItem>
                                            <SelectItem value="USED_GOOD">Bon état</SelectItem>
                                            <SelectItem value="REFURBISHED">Reconditionné</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Promotional & Delivery Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                                {/* Enhanced Promotion Toggle & Box */}
                                <div className={cn(
                                    "col-span-1 md:col-span-2 p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5",
                                    variant.onPromotion 
                                        ? "bg-rose-500/5 border-rose-500/30 shadow-xs" 
                                        : "bg-muted/30 border-border/70"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center",
                                                variant.onPromotion ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground"
                                            )}>
                                                <Percent className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <Label htmlFor={`promo-${variant.id}`} className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-foreground">
                                                    Activer une promotion
                                                </Label>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Appliquer un prix réduit et attirer plus de clients
                                                </span>
                                            </div>
                                        </div>
                                        <Switch
                                            id={`promo-${variant.id}`}
                                            checked={variant.onPromotion}
                                            onCheckedChange={(checked) => handleVariantChange(variant.id, 'onPromotion', checked)}
                                        />
                                    </div>

                                    {variant.onPromotion ? (
                                        <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                                <div>
                                                    <Label className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                                                        Prix Promo (FCFA) *
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        placeholder="Ex: 4000"
                                                        value={variant.promotionalPrice || ''}
                                                        onChange={(e) => handleVariantChange(variant.id, 'promotionalPrice', parseInt(e.target.value) || 0)}
                                                        className="h-9 text-xs font-bold text-rose-600 bg-background border-rose-200 dark:border-rose-900/50 rounded-xl mt-1"
                                                    />
                                                </div>
                                                {variant.price && variant.promotionalPrice && variant.promotionalPrice < variant.price ? (
                                                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-0.5">
                                                        <div className="text-[11px] font-black flex items-center justify-between">
                                                            <span>Remise : -{Math.round(((variant.price - variant.promotionalPrice) / variant.price) * 100)}%</span>
                                                            <span className="line-through text-muted-foreground text-[10px]">{variant.price.toLocaleString('fr-FR')} F</span>
                                                        </div>
                                                        <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                                            Économie : {(variant.price - variant.promotionalPrice).toLocaleString('fr-FR')} FCFA
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-muted-foreground italic">
                                                        Indiquez un prix inférieur au prix normal ({variant.price || 0} FCFA).
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground italic">
                                            Aucune promotion active sur cette déclinaison.
                                        </p>
                                    )}
                                </div>

                                {/* Délai de livraison */}
                                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-2 flex flex-col justify-between">
                                    <Label className="text-xs font-bold flex items-center gap-1.5">
                                        <Truck className="w-3.5 h-3.5 text-primary" />
                                        Délai d&apos;expédition estimé
                                    </Label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={variant.deliveryTimeValue || 2}
                                            onChange={(e) => handleVariantChange(variant.id, 'deliveryTimeValue', parseInt(e.target.value) || 1)}
                                            className="h-8 text-xs font-bold rounded-lg"
                                        />
                                        <Select
                                            value={variant.deliveryTimeUnit || 'DAYS'}
                                            onValueChange={(val) => handleVariantChange(variant.id, 'deliveryTimeUnit', val)}
                                        >
                                            <SelectTrigger className="h-8 text-xs rounded-lg">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="HOURS">Heures</SelectItem>
                                                <SelectItem value="DAYS">Jours</SelectItem>
                                                <SelectItem value="WEEKS">Semaines</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Footer Submit Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                <Link href="/dashboard/products" className="w-full sm:w-auto">
                    <Button type="button" variant="outline" className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold text-xs">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour à mes produits
                    </Button>
                </Link>

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-primary/25 cursor-pointer"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enregistrement...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Enregistrer mes offres
                        </>
                    )}
                </Button>
            </div>

            {/* Variant Image Crop Modal */}
            {cropState && (
                <ImageCropModal
                    isOpen={!!cropState}
                    imageSrc={cropState.imageSrc}
                    onClose={() => setCropState(null)}
                    onCropComplete={handleCropComplete}
                    onSkipCropping={() => {
                        const file = cropState.file;
                        handleCropComplete(file);
                    }}
                />
            )}

        </form>
    );
}
