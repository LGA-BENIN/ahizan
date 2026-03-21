import Image from "next/image";
import Link from "next/link";
import { NavbarCollections } from '@/components/layout/navbar/navbar-collections';
import { NavbarCart } from '@/components/layout/navbar/navbar-cart';
import { NavbarUser } from '@/components/layout/navbar/navbar-user';
import { ThemeSwitcher } from '@/components/layout/navbar/theme-switcher';
import { Suspense } from "react";
import { SearchInput } from '@/components/layout/search-input';
import { NavbarUserSkeleton } from '@/components/shared/skeletons/navbar-user-skeleton';
import { SearchInputSkeleton } from '@/components/shared/skeletons/search-input-skeleton';
import { HelpCircle, Store, ChevronDown, Menu } from 'lucide-react';

import { HeaderConfData } from "@/lib/vendure/cms-queries";

export function Navbar({ config }: { config?: HeaderConfData }) {
    const logoUrl = config?.logoUrl || "/vendure.svg";
    const siteName = config?.siteName || "AHIZAN";
    const showSearch = config?.showSearch !== false;
    const searchPlaceholder = config?.searchPlaceholder || "Rechercher un produit, une marque ou une catégorie";
    const showVendorLink = config?.showVendorLink !== false;
    const vendorLinkText = config?.vendorLinkText || "Vendez sur AHIZAN";
    const vendorLinkUrl = config?.vendorLinkUrl || "/register";
    const helpLinks = config?.helpLinks || [{ label: 'Aide', link: '/help' }];

    return (
        <header className="bg-background border-b border-border">
            {/* Row 1: Vendor link + secondary nav */}
            <div className="border-b border-border/50 bg-muted/30">
                <div className="container mx-auto px-4 flex items-center justify-between h-8">
                    <div className="flex items-center gap-4">
                        {showVendorLink && (
                            <Link href={vendorLinkUrl} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
                                <Store className="w-3 h-3" />
                                {vendorLinkText}
                            </Link>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {helpLinks.map((link, i) => (
                            <Link key={i} href={link.link} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                                <HelpCircle className="w-3 h-3" />
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 2: Logo + Search + Actions */}
            <div className="container mx-auto px-4">
                <div className="flex items-center gap-4 h-14 md:h-16">
                    {/* Mobile menu */}
                    <button className="md:hidden p-1.5 rounded-lg hover:bg-muted" aria-label="Menu">
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
                        {logoUrl && logoUrl !== '/vendure.svg' ? (
                            <Image src={logoUrl} alt={siteName} width={120} height={40} className="h-8 w-auto" />
                        ) : (
                            <span className="text-xl md:text-2xl font-black tracking-tighter text-primary">{siteName}</span>
                        )}
                    </Link>

                    {/* Search bar — prominente comme Jumia */}
                    {showSearch && (
                        <div className="flex-1 max-w-2xl mx-4 hidden md:block">
                            <Suspense fallback={<SearchInputSkeleton />}>
                                <SearchInput placeholder={searchPlaceholder} />
                            </Suspense>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 md:gap-3 ml-auto flex-shrink-0">
                        <Suspense fallback={<NavbarUserSkeleton />}>
                            <NavbarUser />
                        </Suspense>
                        <ThemeSwitcher />
                        <Suspense>
                            <NavbarCart />
                        </Suspense>
                    </div>
                </div>

                {/* Mobile search */}
                {showSearch && (
                    <div className="pb-2 md:hidden">
                        <Suspense fallback={<SearchInputSkeleton />}>
                            <SearchInput placeholder={searchPlaceholder} />
                        </Suspense>
                    </div>
                )}
            </div>

            {/* Row 3: Categories navigation */}
            <div className="border-t border-border/50 bg-muted/20 hidden md:block">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-1 h-10 overflow-x-auto scrollbar-hide">
                        <Suspense>
                            <NavbarCollections />
                        </Suspense>
                    </div>
                </div>
            </div>
        </header>
    );
}
