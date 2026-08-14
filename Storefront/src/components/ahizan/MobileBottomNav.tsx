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
            href: customer ? "/account/profile" : "/sign-in",
            isActive: pathname?.startsWith("/account") || pathname === "/sign-in",
            action: null
        }
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border/40 z-[100] pb-safe shadow-lg">
            <div className="flex justify-around items-center h-14 px-2">
                {navItems.map((item, idx) => {
                    const Icon = item.icon;
                    const content = (
                        <div className={`flex flex-col items-center justify-center transition-all duration-200 ${
                            item.isActive 
                                ? 'bg-[#d8263e]/10 text-[#d8263e] px-3.5 py-1 rounded-2xl' 
                                : 'text-[#002f6c] hover:text-[#d8263e]'
                        }`}>
                            <div className="relative">
                                <Icon className={`w-5 h-5 transition-transform ${item.isActive ? 'text-[#d8263e] fill-[#d8263e] scale-105' : 'text-[#002f6c] stroke-[2]'}`} />
                                {item.badge && (
                                    <span
                                        className="absolute -top-1.5 -right-2.5 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm"
                                        style={{ backgroundColor: cartBadgeColor }}
                                    >
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-bold mt-0.5 ${item.isActive ? 'text-[#d8263e]' : 'text-[#002f6c]'}`}>
                                {item.label}
                            </span>
                        </div>
                    );

                    if (item.action) {
                        return (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.preventDefault();
                                    item.action();
                                }}
                                className="flex flex-col items-center justify-center h-full flex-1"
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={idx}
                            href={item.href}
                            className="flex flex-col items-center justify-center h-full flex-1"
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
