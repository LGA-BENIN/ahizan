"use client";

import { useState, useEffect, useMemo } from "react";
import { AhizanHome } from "@/components/ahizan/AhizanHome";
import { AhizanNavbar } from "@/components/ahizan/AhizanNavbar";
import { HeaderWrapper } from "@/components/ahizan/HeaderWrapper";
import { TopFlashBanner } from "@/components/ahizan/TopFlashBanner";
import { MobileBottomNav } from "@/components/ahizan/MobileBottomNav";
import { MobileCategorySidebar } from "@/components/ahizan/MobileCategorySidebar";
import { PreviewFooter } from "@/components/ahizan/PreviewFooter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CmsSection, ThemeSettingsData, HeaderConfData, FooterConfData } from "@/lib/vendure/cms-queries";
import { getAssetUrl } from "@/lib/vendure/api-utils";

interface PreviewSection {
    id: string;
    type: string;
    title: string;
    description: string;
    layout: string;
    order: number;
    isActive: boolean;
    pageSlug?: string;
    dataJson: string;
}

interface HabillagePreview {
    id: string;
    name: string;
    isDefault: boolean;
    isBackup: boolean;
    sections: PreviewSection[];
}

export function PreviewContent({ presetId, version }: { presetId: string | null; version: string | null }) {
    const [habillage, setHabillage] = useState<HabillagePreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!presetId) {
            setError("Aucun presetId fourni. Utilisez ?presetId=xxx");
            setLoading(false);
            return;
        }

        setError("");
        setLoading(true);

        const fetchPreview = async () => {
            try {
                const shopApiUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'https://api.ahizan.com/shop-api';

                const res = await fetch(shopApiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    cache: "no-store",
                    body: JSON.stringify({
                        query: `
                            query PreviewHabillage($presetId: ID!) {
                                previewHabillage(presetId: $presetId) {
                                    id
                                    name
                                    isDefault
                                    isBackup
                                    sections {
                                        id type title description layout order isActive pageSlug dataJson
                                    }
                                }
                            }
                        `,
                        variables: { presetId },
                    }),
                });

                const data = await res.json();
                console.log('[Preview] Fetched data for presetId:', presetId, data);
                if (data.errors) {
                    throw new Error(data.errors.map((e: any) => e.message).join(', '));
                }

                const preview = data.data?.previewHabillage;
                console.log('[Preview] Habillage preview:', preview);
                if (!preview) {
                    throw new Error("Habillage introuvable");
                }

                preview.sections.sort((a: PreviewSection, b: PreviewSection) => a.order - b.order);
                setHabillage(preview);
            } catch (err: any) {
                console.error('[Preview] Error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPreview();
    }, [presetId, version]);

    // Parse sections into CmsSection[] with parsed data
    const cmsSections: CmsSection[] = useMemo(() => {
        if (!habillage) return [];
        return habillage.sections
            .filter(s => (s.pageSlug || 'home') === 'home')
            .map(s => {
            let parsedData: any = {};
            try {
                parsedData = s.dataJson ? JSON.parse(s.dataJson) : {};
            } catch {}
            return {
                id: s.id,
                type: s.type,
                title: s.title,
                description: s.description,
                layout: s.layout,
                order: s.order,
                isActive: s.isActive,
                data: parsedData,
            };
        });
    }, [habillage]);

    // Extract theme, header, footer from habillage sections (NOT from live page)
    const theme = cmsSections.find(s => s.type === 'THEME_SETTINGS')?.data as ThemeSettingsData | undefined;
    const headerConfig = cmsSections.find(s => s.type === 'HEADER_CONF')?.data as HeaderConfData | undefined;
    const footerConfig = cmsSections.find(s => s.type === 'FOOTER_CONF')?.data as FooterConfData | undefined;

    // Build theme CSS vars from habillage (same logic as layout.tsx DynamicBranding)
    const maxW = theme?.layoutMode === 'full' ? '100%' : theme?.layoutMode === 'wide' ? '1440px' : (theme?.maxWidth || '1280px');
    const themeStyles = useMemo(() => ({
        '--primary': theme?.primaryColor || "#0f172a",
        '--brand-primary': theme?.primaryColor || "#0f172a",
        '--brand-secondary': theme?.secondaryColor || "#f59e0b",
        '--accent': theme?.accentColor || "#e31837",
        '--success': theme?.successColor || "#059669",
        '--warning': theme?.warningColor || "#d97706",
        '--danger': theme?.dangerColor || "#dc2626",
        '--background': theme?.backgroundColor || "#ffffff",
        '--surface': theme?.surfaceColor || "#f8fafc",
        '--foreground': theme?.textColor || "#1e293b",
        '--muted-foreground': theme?.textMutedColor || "#64748b",
        '--border': theme?.borderColor || "#e2e8f0",
        '--font-family': theme?.fontFamily || "Inter, sans-serif",
        '--heading-font': theme?.headingFontFamily || theme?.fontFamily || "Inter, sans-serif",
        '--base-font-size': theme?.baseFontSize || "16px",
        '--heading-weight': theme?.headingFontWeight || "800",
        '--body-line-height': theme?.bodyLineHeight || "1.6",
        '--radius': theme?.borderRadius || "8px",
        '--button-radius': theme?.buttonRadius || "8px",
        '--card-radius': theme?.cardRadius || "12px",
        '--input-radius': theme?.inputRadius || "8px",
        '--content-max-width': maxW,
        '--section-spacing': theme?.sectionSpacing || "48px",
        '--container-padding': theme?.containerPadding || "16px",
        '--mobile-nav-offset': (headerConfig?.mobileNavStyle === 'bottom' || headerConfig?.mobileNavStyle === 'both' || !headerConfig?.mobileNavStyle) ? '5rem' : '1.5rem',
    }) as React.CSSProperties, [theme, maxW, headerConfig]);

    // Background from habillage theme
    let bgType = 'color';
    let bgValue = '#ffffff';
    if (theme?.backgroundType) {
        bgType = theme.backgroundType;
        if (bgType === 'color') bgValue = theme.backgroundColor || '#ffffff';
        else if (bgType === 'image') bgValue = theme.backgroundImageUrl || '';
        else if (bgType === 'video') bgValue = theme.backgroundVideoUrl || '';
    }

    if (loading) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Skeleton className="w-12 h-12 rounded-full mx-auto" />
                    <p className="text-muted-foreground font-medium">Chargement de l&apos;aperçu...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTitle>Erreur d&apos;aperçu</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col overflow-x-hidden overflow-y-auto" style={themeStyles}>
            {/* Global Background Layer (from habillage theme) */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                {bgType === 'color' && (
                    <div className="absolute inset-0" style={{ background: bgValue }} />
                )}
                {bgType === 'image' && bgValue && (
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-fixed"
                        style={{ backgroundImage: `url(${getAssetUrl(bgValue)})` }}
                    />
                )}
                {bgType === 'video' && bgValue && (
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        key={bgValue}
                        className="absolute min-w-full min-h-full object-cover opacity-60"
                    >
                        <source src={getAssetUrl(bgValue)} type="video/mp4" />
                    </video>
                )}
            </div>

            {/* Preview Banner (always on top) */}
            <div className="sticky top-0 z-[60] py-2 px-4 text-center text-sm font-bold flex items-center justify-center gap-3" style={{ background: '#7c3aed', color: '#fff' }}>
                <span>👁️ Aperçu — {habillage?.name || `Habillage #${presetId}`}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">ID: {presetId}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">{habillage?.sections?.length || 0} sections</span>
                {habillage?.isDefault && (
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">DÉFAUT</span>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.close()}
                    className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold"
                >
                    Fermer
                </Button>
            </div>

            <HeaderWrapper config={headerConfig} isPreview={true}>
                <TopFlashBanner config={headerConfig?.topBar} />
                <AhizanNavbar config={headerConfig} customer={null} order={null} isPreview={true} />
            </HeaderWrapper>

            <MobileCategorySidebar categories={[]} />

            {/* Body sections rendered via AhizanHome (same engine as real storefront) */}
            <main className={`relative z-10 flex-grow w-full mx-auto ${(headerConfig?.mobileNavStyle === 'bottom' || headerConfig?.mobileNavStyle === 'both' || !headerConfig?.mobileNavStyle) ? 'pb-16 lg:pb-0' : ''}`}>
                <AhizanHome sections={cmsSections} />
            </main>

            {(headerConfig?.mobileNavStyle === 'bottom' || headerConfig?.mobileNavStyle === 'both' || !headerConfig?.mobileNavStyle) && (
                <MobileBottomNav config={headerConfig} customer={null} order={null} />
            )}

            {/* Footer from habillage (not live storefront) */}
            <PreviewFooter config={footerConfig} />
        </div>
    );
}
