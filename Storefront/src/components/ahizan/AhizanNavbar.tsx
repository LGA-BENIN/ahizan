"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, UserRound, UserRoundCheck, HelpCircle, ShoppingCart, ChevronDown, Heart, X, Menu, ShoppingBag, ArrowLeft, ChevronLeft, Download } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { getAssetUrl } from "@/lib/vendure/api-utils";
import { useMobileMenu } from "@/contexts/mobile-menu-context";
import { logoutAction } from "@/app/(storefront)/sign-in/actions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from './NotificationBell';
import { LocationWidget } from './LocationWidget';

const SHOP_API_URL = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_SHOP_API_URL || 'https://api.ahizan.com/shop-api';
const SSE_BASE_URL = SHOP_API_URL.replace('/shop-api', '');

export function AhizanNavbar({
    config,
    customer,
    order,
    isPreview = false
}: {
    config?: any;
    customer?: any;
    order?: any;
    isPreview?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { mobileMenuOpen, setMobileMenuOpen, setLogoUrl } = useMobileMenu();
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const checkStandalone = () => {
            const standalone =
                window.matchMedia("(display-mode: standalone)").matches ||
                window.matchMedia("(display-mode: fullscreen)").matches ||
                window.matchMedia("(display-mode: minimal-ui)").matches ||
                (window.navigator as any).standalone === true;
            setIsStandalone(standalone);
            return standalone;
        };

        const standalone = checkStandalone();
        if (standalone) {
            setIsInstallable(false);
            return;
        }

        // Check if event was already captured globally
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
            setIsInstallable(true);
        }

        const handleReady = () => {
            if (checkStandalone()) return;
            setDeferredPrompt((window as any).deferredPrompt);
            setIsInstallable(true);
        };

        const handleInstalled = () => {
            setIsInstallable(false);
            setIsStandalone(true);
        };

        const handleBeforeInstallPrompt = (e: Event) => {
            if (checkStandalone()) {
                setIsInstallable(false);
                return;
            }
            e.preventDefault();
            (window as any).deferredPrompt = e;
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener("pwa-install-ready", handleReady);
        window.addEventListener("pwa-installed", handleInstalled);
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleInstalled);

        return () => {
            window.removeEventListener("pwa-install-ready", handleReady);
            window.removeEventListener("pwa-installed", handleInstalled);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA Install Choice: ${outcome}`);
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Set logo URL in context when config changes
    useEffect(() => {
        if (config?.logoUrl) {
            setLogoUrl(config.logoUrl);
        }
    }, [config?.logoUrl, setLogoUrl]);

    const handleSearch = () => {
        const q = searchQuery.trim();
        if (!q) return;
        router.push(`/search?q=${encodeURIComponent(q)}`);
        setIsSearchExpanded(false);
    };

    // Close expanded search when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchExpanded(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const cartCount = order?.totalQuantity || 0;
    const isLoggedIn = !!customer;
    const displayName = customer?.firstName || "Compte";
    const fullName = customer ? [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() : "";

    const {
        siteName = "AHIZAN",
        logoUrl,
        headerBgColor = "#ffffff",
        headerTextColor = "#1e293b",
        headerBorderColor = "#e2e8f0",
        headerShadow = true,
        headerHeight = "64px",
        showSearch = true,
        searchPlaceholder = "Rechercher des produits...",
        searchStyle = "rounded",
        showCartIcon = true,
        showWishlistIcon = true,
        showAccountIcon = true,
        cartBadgeColor = "#e31837",
        showVendorLink = true,
        vendorLinkText = "Vendez sur AHIZAN",
        vendorLinkUrl = "/register",
        menuItems = [],
        helpLinks = []
    } = config || {};

    const mobileNavStyle = config?.mobileNavStyle || 'bottom';
    const showTopIconsOnMobile = mobileNavStyle === 'top' || mobileNavStyle === 'both';

    const stickyStyleSetting = config?.stickyStyle || 'solid';
    const isStickySetting = config?.sticky !== false && stickyStyleSetting !== 'none';
    const isTransparentState = isStickySetting && stickyStyleSetting === 'transparent-to-solid' && !isScrolled;

    let currentBgColor = headerBgColor;
    let currentTextColor = headerTextColor;
    let currentBorderColor = headerBorderColor;

    if (isTransparentState) {
        currentBgColor = 'transparent';
        currentBorderColor = 'transparent';
        currentTextColor = '#ffffff';
    }

    let currentHeight = headerHeight || '64px';
    if (isStickySetting && stickyStyleSetting === 'shrink' && isScrolled) {
        if (headerHeight === '72px') currentHeight = '56px';
        else if (headerHeight === '64px') currentHeight = '50px';
        else if (headerHeight === '56px') currentHeight = '48px';
        else if (headerHeight === '48px') currentHeight = '44px';
        else currentHeight = '50px';
    }

    const topOffset = isPreview ? "top-[36px]" : "top-0";
    const headerShadowSetting = config?.headerShadow !== false;

    let positionClass = "relative";
    let shadowClass = "";

    if (isStickySetting) {
        if (stickyStyleSetting === 'transparent-to-solid') {
            positionClass = isScrolled
                ? `fixed ${topOffset} left-0 w-full z-40 transition-all duration-300`
                : `absolute ${topOffset} left-0 w-full z-40 transition-all duration-300`;
            shadowClass = (headerShadowSetting && isScrolled) ? "shadow-sm" : "";
        } else {
            // 'solid' or 'shrink'
            positionClass = `sticky ${topOffset} z-40 w-full`;
            shadowClass = headerShadowSetting ? "shadow-sm" : "";
        }
    }

    return (
        <>
            {/* Top Navigation Menu Items */}
            <div className="w-full font-sans animate-in fade-in duration-700 bg-[#f8f9fa] h-10 border-b border-gray-100 hidden md:block">
                <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 lg:px-12 h-full flex items-center justify-between text-[12px] text-gray-600">
                    <div className="flex items-center gap-6">
                        {menuItems.map((item: any, idx: number) => {
                            const isPill = item.style === 'pill';
                            const isRect = item.style === 'rectangle';
                            const hasStyle = isPill || isRect;

                            return (
                                <Link
                                    key={idx}
                                    href={item.link || '#'}
                                    className={`font-medium transition-all flex items-center justify-center ${hasStyle
                                        ? `px-4 py-1.5 ${isPill ? 'rounded-full' : 'rounded-md'} hover:opacity-90 shadow-sm text-[12px] font-bold`
                                        : `hover:text-[${cartBadgeColor}] ${item.isHighlighted ? 'text-red-600 font-bold' : ''}`
                                        }`}
                                    style={hasStyle ? { backgroundColor: item.bgColor || '#e31837', color: item.textColor || '#ffffff' } : undefined}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#002f6c] transition-colors">
                            <span className="w-4 h-3 bg-red-600 inline-block border border-gray-200"></span>
                            <span className="font-medium">Français</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div
                className={`w-full font-sans transition-all duration-300 animate-in slide-in-from-top-2 duration-500 ${mobileMenuOpen ? 'hidden lg:block' : ''} ${positionClass} ${shadowClass}`}
                style={{
                    backgroundColor: currentBgColor,
                    color: currentTextColor,
                    borderBottom: `1px solid ${currentBorderColor}`
                }}
            >
                <div
                    className="max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12 transition-all duration-300"
                    style={{ minHeight: currentHeight }}
                >
                    {/* Mobile Layout */}
                    <div className="lg:hidden flex flex-col gap-2 py-2">
                        {/* Row 1: Menu, Logo, Icons */}
                        <div className="flex items-center justify-between">
                            {/* Left: Menu + Logo */}
                            <div className="flex items-center gap-1">
                                {pathname !== '/' && (
                                    <button
                                        onClick={() => router.back()}
                                        className="p-1 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
                                        aria-label="Go back"
                                    >
                                        <ChevronLeft className="w-6 h-6 stroke-[1.5]" />
                                    </button>
                                )}
                                {showTopIconsOnMobile && (
                                    <button
                                        onClick={() => setMobileMenuOpen(true)}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                        aria-label="Open menu"
                                    >
                                        <Menu className="w-5 h-5" />
                                    </button>
                                )}
                                <Link href="/" className={`flex items-center gap-1.5 flex-shrink-0 ${showTopIconsOnMobile ? 'ml-1' : ''}`}>
                                    {logoUrl ? (
                                        <img
                                            src={getAssetUrl(logoUrl)}
                                            className="h-8 w-auto object-contain transition-all duration-300"
                                            alt={siteName}
                                            style={isTransparentState ? { filter: 'brightness(0) invert(1)' } : undefined}
                                        />
                                    ) : (
                                        <>
                                            <ShoppingBag className="w-5 h-5" />
                                            <span className="text-lg font-bold tracking-tight">{siteName}</span>
                                        </>
                                    )}
                                </Link>
                            </div>

                            {/* Right: Icons */}
                            {showTopIconsOnMobile && (
                                <div className="flex items-center gap-1">
                                    {isInstallable && !isStandalone && (
                                        <button
                                            onClick={handleInstallClick}
                                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-primary animate-pulse flex items-center justify-center"
                                            aria-label="Installer l'application"
                                        >
                                            <Download className="h-5 w-5" />
                                        </button>
                                    )}
                                    {showAccountIcon && (
                                        isLoggedIn ? (
                                            <DropdownMenu modal={false}>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none cursor-pointer">
                                                        <UserRoundCheck className="h-5 w-5" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-56 mt-2 p-2 rounded-2xl shadow-2xl border border-border/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white z-[9999] animate-in fade-in slide-in-from-top-4 duration-200" align="end">
                                                    {fullName && (
                                                        <DropdownMenuLabel className="px-3 py-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                                            {fullName}
                                                        </DropdownMenuLabel>
                                                    )}
                                                    <DropdownMenuItem asChild className="rounded-lg py-2.5 cursor-pointer hover:bg-muted focus:bg-muted">
                                                        <Link href="/account/profile" className="flex items-center gap-3 w-full font-bold">
                                                            Profil
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild className="rounded-lg py-2.5 cursor-pointer hover:bg-muted focus:bg-muted">
                                                        <Link href="/account/orders" className="flex items-center gap-3 w-full font-bold">
                                                            Mes Commandes
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="my-2 border-t border-border" />
                                                    <DropdownMenuItem
                                                        onClick={async () => {
                                                            await logoutAction();
                                                        }}
                                                        className="rounded-lg py-2.5 cursor-pointer text-destructive focus:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-3 w-full font-bold"
                                                    >
                                                        Déconnexion
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <Link href="/sign-in" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                                <UserRound className="h-5 w-5" />
                                            </Link>
                                        )
                                    )}
                                    {false && showWishlistIcon && (
                                        <Link href="/account/wishlist" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                            <Heart className="h-5 w-5" />
                                        </Link>
                                    )}
                                    {isLoggedIn && (
                                        <NotificationBell
                                            apiUrl={SHOP_API_URL}
                                            authToken={customer?.authToken}
                                            userId={customer?.userId}
                                            sseBaseUrl={SSE_BASE_URL}
                                            iconColor={currentTextColor}
                                        />
                                    )}
                                    {showCartIcon && (
                                        <Link href="/cart" className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                                            <ShoppingCart className="h-5 w-5" />
                                            {cartCount > 0 && (
                                                <span
                                                    className="absolute -top-1 -right-1 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: cartBadgeColor }}
                                                >
                                                    {cartCount}
                                                </span>
                                            )}
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Geolocation selector on Mobile */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secteur</span>
                            <LocationWidget />
                        </div>

                        {/* Row 2: Search Bar */}
                        {showSearch && (
                            <div className="relative flex items-center">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className={`block w-full pl-9 pr-10 py-2 border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 focus:outline-none transition-all
                                        ${['rounded', 'icon-only'].includes(searchStyle) ? 'rounded-full' : ''}
                                        ${searchStyle === 'square' ? 'rounded-none' : ''}
                                        ${searchStyle === 'underline' ? 'border-t-0 border-r-0 border-l-0 bg-transparent rounded-none' : ''}
                                        ${!['rounded', 'icon-only', 'square', 'underline'].includes(searchStyle) ? 'rounded-lg' : ''}
                                    `}
                                    placeholder={searchPlaceholder}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Desktop/Tablet Layout */}
                    <div className="hidden lg:flex items-center gap-6 md:gap-12 transition-all duration-300"
                        style={{ height: currentHeight, minHeight: '56px' }}
                    >
                        {/* Mobile Menu Toggle Button - Hidden on desktop */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            aria-label="Open menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-1.5 flex-shrink-0">
                            {logoUrl ? (
                                <img
                                    src={getAssetUrl(logoUrl)}
                                    className="h-10 w-auto object-contain transition-all duration-300"
                                    alt={siteName}
                                    style={isTransparentState ? { filter: 'brightness(0) invert(1)' } : undefined}
                                />
                            ) : (
                                <>
                                    <ShoppingBag className="w-6 h-6" />
                                    <span className="text-2xl font-bold tracking-tight">{siteName}</span>
                                </>
                            )}
                        </Link>

                        {/* Search Bar */}
                        {showSearch && (
                            <div className={`flex items-center transition-all duration-300 ${searchStyle === 'icon-only' && !isSearchExpanded ? 'w-auto' : 'flex-grow max-w-3xl'}`} ref={searchRef}>
                                {searchStyle === 'icon-only' && !isSearchExpanded ? (
                                    <button
                                        onClick={() => setIsSearchExpanded(true)}
                                        className="p-2 lg:p-3 rounded-full hover:bg-gray-100 transition-colors"
                                    >
                                        <Search className="h-5 w-5 text-gray-600" />
                                    </button>
                                ) : (
                                    <>
                                        <div className="relative flex-grow flex items-center">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <Search className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                autoFocus={searchStyle === 'icon-only'}
                                                className={`block w-full pl-9 sm:pl-11 pr-8 sm:pr-10 py-2 sm:py-2.5 border border-gray-200 bg-gray-50 text-xs sm:text-sm placeholder:text-gray-400 focus:outline-none focus:border-[${cartBadgeColor}] transition-all
                                                    ${searchStyle === 'icon-only' ? 'rounded-full pr-12' : ''}
                                                    ${searchStyle === 'rounded' ? 'rounded-l-full rounded-r-none' : ''}
                                                    ${searchStyle === 'square' ? 'rounded-none' : ''}
                                                    ${searchStyle === 'underline' ? 'border-t-0 border-r-0 border-l-0 bg-transparent rounded-none' : (!['rounded', 'icon-only'].includes(searchStyle) ? 'rounded-l-md' : '')}
                                                `}
                                                placeholder={searchPlaceholder}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                            />
                                            {searchStyle === 'icon-only' && (
                                                <button
                                                    onClick={() => setIsSearchExpanded(false)}
                                                    className="absolute right-3 p-1 hover:bg-gray-200 rounded-full"
                                                >
                                                    <X className="h-4 w-4 text-gray-500" />
                                                </button>
                                            )}
                                        </div>
                                        {searchStyle !== 'icon-only' && (
                                            <button
                                                onClick={handleSearch}
                                                className={`text-white px-3 sm:px-6 py-2 sm:py-2.5 text-sm font-semibold transition-colors flex items-center justify-center
                                                    ${searchStyle === 'rounded' ? 'rounded-r-full' : ''}
                                                    ${searchStyle !== 'rounded' && searchStyle !== 'underline' ? 'rounded-r-md' : ''}
                                                    ${searchStyle === 'underline' ? 'hidden' : ''}
                                                `}
                                                style={{ backgroundColor: cartBadgeColor }}
                                            >
                                                <Search className="h-4 w-4 sm:hidden" />
                                                <span className="hidden sm:inline">Rechercher</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Spacer */}
                        <div className="flex-grow"></div>

                        {/* Actions */}
                        <div className="flex items-center gap-4 xl:gap-8 shrink-0">
                            {isInstallable && !isStandalone && (
                                <button
                                    onClick={handleInstallClick}
                                    className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity text-primary cursor-pointer border border-border px-3 py-1.5 rounded-full hover:bg-muted"
                                >
                                    <Download className="h-4 w-4 animate-bounce" />
                                    <span className="hidden xl:inline">Installer l'application</span>
                                </button>
                            )}
                            {showVendorLink && (
                                <Link href={vendorLinkUrl} className="font-medium text-sm hidden md:block hover:opacity-80 transition-opacity" style={{ color: cartBadgeColor }}>
                                    {vendorLinkText}
                                </Link>
                            )}

                            <div className="hidden lg:block">
                                <LocationWidget />
                            </div>

                            {showAccountIcon && (
                                isLoggedIn ? (
                                    <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer">
                                                <UserRoundCheck className="h-5 w-5" />
                                                <div className="flex flex-col leading-tight hidden lg:flex text-left">
                                                    <span className="text-[11px] opacity-70">
                                                        Bonjour, {customer.firstName}
                                                    </span>
                                                    <span className="text-sm font-semibold">Mon Compte</span>
                                                </div>
                                                <ChevronDown className="h-3 w-3 hidden lg:inline" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56 mt-2 p-2 rounded-2xl shadow-2xl border border-border/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white z-[9999] animate-in fade-in slide-in-from-top-4 duration-200" align="end">
                                            {fullName && (
                                                <DropdownMenuLabel className="px-3 py-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                                    {fullName}
                                                </DropdownMenuLabel>
                                            )}
                                            <DropdownMenuItem asChild className="rounded-lg py-2.5 cursor-pointer hover:bg-muted focus:bg-muted">
                                                <Link href="/account/profile" className="flex items-center gap-3 w-full font-bold">
                                                    Profil
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="rounded-lg py-2.5 cursor-pointer hover:bg-muted focus:bg-muted">
                                                <Link href="/account/orders" className="flex items-center gap-3 w-full font-bold">
                                                    Mes Commandes
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="my-2 border-t border-border" />
                                            <DropdownMenuItem
                                                onClick={async () => {
                                                    await logoutAction();
                                                }}
                                                className="rounded-lg py-2.5 cursor-pointer text-destructive focus:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-3 w-full font-bold"
                                            >
                                                Déconnexion
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <Link href="/sign-in" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                        <UserRound className="h-5 w-5" />
                                        <div className="flex flex-col leading-tight hidden lg:flex">
                                            <span className="text-[11px] opacity-70">Se connecter</span>
                                            <span className="text-sm font-semibold">Compte</span>
                                        </div>
                                        <ChevronDown className="h-3 w-3 hidden lg:inline" />
                                    </Link>
                                )
                            )}

                            {false && showWishlistIcon && (
                                <Link href="/account/wishlist" className="flex items-center gap-2 hover:opacity-80 transition-opacity hidden sm:flex">
                                    <Heart className="h-5 w-5" />
                                </Link>
                            )}

                            {isLoggedIn && (
                                <NotificationBell
                                    apiUrl={SHOP_API_URL}
                                    authToken={customer?.authToken}
                                    userId={customer?.userId}
                                    sseBaseUrl={SSE_BASE_URL}
                                    iconColor={currentTextColor}
                                />
                            )}

                            {showCartIcon && (
                                <Link href="/cart" className="flex items-center gap-2 hover:opacity-80 transition-opacity relative">
                                    <div className="relative">
                                        <ShoppingCart className="h-5 w-5" />
                                        {cartCount > 0 && (
                                            <span
                                                className="absolute -top-1.5 -right-1.5 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: cartBadgeColor }}
                                            >
                                                {cartCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold hidden lg:inline">Panier</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
