"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Search, ShoppingCart, UserRound } from "lucide-react";
import { useMobileMenu } from "@/contexts/mobile-menu-context";

export function MobileBottomNav({
    customer,
    order,
    config
}: {
    customer?: any;
    order?: any;
    config?: any;
}) {
    const pathname = usePathname();
    const { setMobileMenuOpen } = useMobileMenu();

    const cartCount = order?.totalQuantity || 0;
    const cartBadgeColor = config?.cartBadgeColor || "#e31837";

    const navItems = [
        {
            label: "Accueil",
            icon: Home,
            href: "/",
            isActive: pathname === "/",
            action: null
        },
        {
            label: "Catégories",
            icon: LayoutGrid,
            href: "#",
            isActive: false,
            action: () => setMobileMenuOpen(true)
        },
        {
            label: "Recherche",
            icon: Search,
            href: "/search",
            isActive: pathname === "/search",
            action: null
        },
        {
            label: "Panier",
            icon: ShoppingCart,
            href: "/cart",
            isActive: pathname === "/cart",
            badge: cartCount > 0 ? cartCount : null,
            action: null
        },
        {
            label: "Compte",
            icon: UserRound,
            href: customer ? "/account" : "/sign-in",
            isActive: pathname?.startsWith("/account") || pathname === "/sign-in",
            action: null
        }
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-[100] pb-safe">
            {/* Gradient transition overlay extending 48px above the bottom bar */}
            <div className="absolute bottom-full left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            <div className="flex justify-around items-center h-14">
                {navItems.map((item, idx) => {
                    const Icon = item.icon;
                    const content = (
                        <>
                            <div className="relative">
                                <Icon className={`w-5 h-5 mb-1 transition-colors ${item.isActive ? 'text-[#d8263e] stroke-[2.5]' : 'text-[#d8263e]/60 stroke-[2]'}`} />
                                {item.badge && (
                                    <span
                                        className="absolute -top-1.5 -right-2 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white"
                                        style={{ backgroundColor: cartBadgeColor }}
                                    >
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-medium transition-colors ${item.isActive ? 'text-[#d8263e]' : 'text-[#d8263e]/60'}`}>
                                {item.label}
                            </span>
                        </>
                    );

                    if (item.action) {
                        return (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.preventDefault();
                                    item.action();
                                }}
                                className="flex flex-col items-center justify-center w-full h-full"
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={idx}
                            href={item.href}
                            className="flex flex-col items-center justify-center w-full h-full"
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
