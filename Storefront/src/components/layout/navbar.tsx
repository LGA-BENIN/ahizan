import Image from "next/image";
import Link from "next/link";
import { MobileMenu } from "@/components/layout/navbar/mobile-menu";
import { NavbarCollections } from '@/components/layout/navbar/navbar-collections';
import { NavbarCart } from '@/components/layout/navbar/navbar-cart';
import { NavbarUser } from '@/components/layout/navbar/navbar-user';
import { ThemeSwitcher } from '@/components/layout/navbar/theme-switcher';
import { Suspense } from "react";
import { SearchInput } from '@/components/layout/search-input';
import { NavbarUserSkeleton } from '@/components/shared/skeletons/navbar-user-skeleton';
import { SearchInputSkeleton } from '@/components/shared/skeletons/search-input-skeleton';
import { HelpCircle, Store, ChevronDown, Menu, User, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { HeaderConfData } from "@/lib/vendure/cms-queries";

const isGif = (url: string) => url?.toLowerCase().endsWith('.gif');

export function Navbar({ config }: { config?: HeaderConfData }) {
    const logoUrl = config?.logoUrl || "/vendure.svg";
    const siteName = config?.siteName || "AHIZAN";
    const showSearch = config?.showSearch !== false;
    const searchPlaceholder = config?.searchPlaceholder || "Rechercher un produit, une marque ou une catégorie";
    const showVendorLink = config?.showVendorLink !== false;
    const vendorLinkText = config?.vendorLinkText || "Vendez sur AHIZAN";
    const vendorLinkUrl = config?.vendorLinkUrl || "/register";
    const helpLinks = config?.helpLinks || [{ label: 'Aide', link: '/help' }];
    const isLogoGif = isGif(logoUrl);

    return (
        <header className="sticky top-0 z-[100] w-full shadow-sm">
            {/* Row 1: Vendor link + secondary nav (Thin Top Bar) */}
            <div className="border-b border-border/40 bg-background">
                <div className="container mx-auto px-4 md:px-6 flex items-center justify-end h-9">
                    <div className="flex items-center gap-6">
                        {helpLinks.map((link, i) => (
                            <Link key={i} href={link.link} className="text-[11px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors">
                                <HelpCircle className="w-3.5 h-3.5" />
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 2: Main Navigation with Glassmorphism */}
            <div className="bg-background/85 backdrop-blur-xl border-b border-border/50">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex items-center gap-4 md:gap-8 h-16 md:h-18">
                        {/* Mobile menu */}
                        <div className="md:hidden">
                            <Suspense fallback={<div className="w-9 h-9 rounded-xl border border-border/50 bg-muted/10"></div>}>
                                <MobileMenu />
                            </Suspense>
                        </div>

                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 flex-shrink-0 group hover:scale-[1.02] transition-transform">
                            {logoUrl && logoUrl !== '/vendure.svg' ? (
                                isLogoGif ? (
                                    <img src={logoUrl} alt={siteName} className="h-9 w-auto drop-shadow-sm" />
                                ) : (
                                    <Image src={logoUrl} alt={siteName} width={130} height={45} className="h-9 w-auto drop-shadow-sm" />
                                )
                            ) : (
                                <span className="text-2xl md:text-3xl font-black tracking-tighter text-primary drop-shadow-sm uppercase">Ahizan</span>
                            )}
                        </Link>

                        {/* Search bar — prominente avec ombre subtile */}
                        {showSearch && (
                            <div className="flex-1 max-w-2xl hidden md:block group">
                                <Suspense fallback={<SearchInputSkeleton />}>
                                    <div className="transition-all duration-300 group-focus-within:shadow-lg rounded-xl">
                                        <SearchInput placeholder={searchPlaceholder} />
                                    </div>
                                </Suspense>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3 md:gap-5 ml-auto flex-shrink-0">
                            {showVendorLink && (
                                <Link 
                                    href={vendorLinkUrl} 
                                    className="hidden lg:flex items-center gap-2 bg-secondary/5 border border-secondary/10 px-4 py-2 rounded-xl text-[12px] font-bold text-secondary hover:bg-secondary/10 transition-all shadow-sm"
                                >
                                    <Store className="w-4 h-4" />
                                    {vendorLinkText}
                                </Link>
                            )}
                            
                            <div className="flex items-center gap-2">
                                <Suspense fallback={<NavbarUserSkeleton />}>
                                    <NavbarUser />
                                </Suspense>
                                <div className="hidden sm:block">
                                    <ThemeSwitcher />
                                </div>
                                <Suspense>
                                    <NavbarCart />
                                </Suspense>
                            </div>
                        </div>
                    </div>

                    {/* Mobile search */}
                    {showSearch && (
                        <div className="pb-3 md:hidden">
                            <Suspense fallback={<SearchInputSkeleton />}>
                                <div className="shadow-sm rounded-xl">
                                    <SearchInput placeholder={searchPlaceholder} />
                                </div>
                            </Suspense>
                        </div>
                    )}
                </div>
            </div>

            {/* Row 3: Categories navigation (Clean Bottom Bar) */}
            <div className="bg-background/80 backdrop-blur-md border-b border-border/30 hidden md:block">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex items-center gap-2 h-11 overflow-x-auto no-scrollbar py-0.5">
                        <Suspense>
                            <NavbarCollections />
                        </Suspense>
                    </div>
                </div>
            </div>
        </header>
    );
}
