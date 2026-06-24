'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, User, MapPin, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/account/profile', label: 'Mon Profil', icon: User },
    { href: '/account/orders', label: 'Mes Commandes', icon: Package },
    { href: '/account/addresses', label: 'Mes Adresses', icon: MapPin },
    { href: '/account/favorites', label: 'Mes Favoris', icon: Heart },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="container mx-auto px-4 py-10 md:py-20 max-w-7xl">
            {/* Title & Welcome header */}
            <div className="mb-8 md:mb-10">
                <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-foreground">
                    Mon Espace Client
                </h1>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                    Gerez vos informations personnelles, vos commandes et vos produits favoris
                </p>
            </div>

            {/* Mobile Tab Navigation (horizontal scroll) */}
            <div className="lg:hidden flex overflow-x-auto border-b border-border pb-1.5 mb-8 gap-6 scrollbar-none sticky top-16 bg-white z-40 -mx-4 px-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href === '/account/orders' && pathname?.startsWith('/account/orders'));
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 pb-3 text-xs font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all",
                                isActive
                                    ? "border-primary text-primary"
                                    : "border-transparent text-slate-500 hover:text-slate-900"
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            {/* Desktop Layout Grid */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Desktop Sidebar Navigation */}
                <aside className="hidden lg:block w-64 shrink-0">
                    <nav className="space-y-1 bg-white dark:bg-slate-900 border border-border p-4 rounded-2xl shadow-sm">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href === '/account/orders' && pathname?.startsWith('/account/orders'));
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all border-l-4",
                                        isActive
                                            ? "bg-primary/5 text-primary border-primary rounded-r-xl"
                                            : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-r-xl"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-slate-450")} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Dashboard Panel */}
                <main className="flex-grow bg-white dark:bg-slate-900 border border-border p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}