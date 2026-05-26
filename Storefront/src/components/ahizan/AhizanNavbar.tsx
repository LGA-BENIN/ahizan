"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, User, HelpCircle, ShoppingCart, ChevronDown, Heart, X, Menu } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { getAssetUrl } from "@/lib/vendure/api-utils";
import { useMobileMenu } from "@/contexts/mobile-menu-context";

export function AhizanNavbar({ 
    config, 
    customer, 
    order 
}: { 
    config?: any;
    customer?: any;
    order?: any;
}) {
    const router = useRouter();
    const { mobileMenuOpen, setMobileMenuOpen, setLogoUrl } = useMobileMenu();
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

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

    return (
        <div className="w-full flex flex-col font-sans animate-in fade-in duration-700">
            {/* Top Navigation Menu Items */}
            {menuItems.length > 0 && (
                <div className="bg-[#f8f9fa] h-10 border-b border-gray-100 hidden md:block">
                    <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 lg:px-12 h-full flex items-center justify-between text-[12px] text-gray-600">
                        <div className="flex items-center gap-6">
                            {menuItems.map((item: any, idx: number) => (
                                <Link 
                                    key={idx} 
                                    href={item.link || '#'} 
                                    className={`font-medium transition-colors hover:text-[${cartBadgeColor}] ${item.isHighlighted ? 'text-red-600 font-bold' : ''}`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#002f6c] transition-colors">
                                <span className="w-4 h-3 bg-red-600 inline-block border border-gray-200"></span>
                                <span className="font-medium">Français</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Header */}
            <div
                className={`w-full ${headerShadow ? 'shadow-sm' : ''} sticky top-0 z-50 animate-in slide-in-from-top-2 duration-500 ${mobileMenuOpen ? 'hidden lg:block' : ''}`}
                style={{
                    backgroundColor: headerBgColor,
                    color: headerTextColor,
                    borderBottom: `1px solid ${headerBorderColor}`
                }}
            >
                <div 
                    className="max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12 flex items-center gap-3 sm:gap-6 md:gap-12"
                    style={{ height: headerHeight, minHeight: '56px' }}
                >
                    {/* Mobile Menu Toggle Button */}
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="lg:hidden p-2 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5 text-foreground" />
                    </button>

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-1 flex-shrink-0">
                        {logoUrl ? (
                            <img src={getAssetUrl(logoUrl)} className="h-10 w-auto object-contain" alt={siteName} />
                        ) : (
                            <span className="text-2xl font-bold tracking-tight text-[#002f6c]">{siteName}</span>
                        )}
                    </Link>

                    {/* Search Bar */}
                    {showSearch ? (
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
                    ) : (
                        <div className="flex-grow"></div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:gap-4 xl:gap-8 shrink-0">
                        {showVendorLink && (
                            <Link href={vendorLinkUrl} className="font-medium text-sm hidden md:block hover:opacity-80 transition-opacity" style={{ color: cartBadgeColor }}>
                                {vendorLinkText}
                            </Link>
                        )}

                        {showAccountIcon && (
                            <Link href={isLoggedIn ? "/account" : "/sign-in"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <User className="h-5 w-5" />
                                <div className="flex flex-col leading-tight hidden lg:flex">
                                    <span className="text-[11px] opacity-70">
                                        {isLoggedIn ? `Bonjour, ${customer.firstName}` : "Se connecter"}
                                    </span>
                                    <span className="text-sm font-semibold">{isLoggedIn ? "Mon Compte" : "Compte"}</span>
                                </div>
                                <ChevronDown className="h-3 w-3 hidden lg:inline" />
                            </Link>
                        )}

                        {showWishlistIcon && (
                            <Link href="/account/wishlist" className="flex items-center gap-2 hover:opacity-80 transition-opacity hidden sm:flex">
                                <Heart className="h-5 w-5" />
                            </Link>
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
    );
}
