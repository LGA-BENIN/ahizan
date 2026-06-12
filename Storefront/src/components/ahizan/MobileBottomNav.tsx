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
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[100] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-14">
                {navItems.map((item, idx) => {
                    const Icon = item.icon;
                    const content = (
                        <>
                            <div className="relative">
                                <Icon className={`w-5 h-5 mb-1 transition-colors ${item.isActive ? 'text-primary stroke-[2.5]' : 'text-gray-500 stroke-[2]'}`} />
                                {item.badge && (
                                    <span 
                                        className="absolute -top-1.5 -right-2 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white"
                                        style={{ backgroundColor: cartBadgeColor }}
                                    >
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-medium transition-colors ${item.isActive ? 'text-primary' : 'text-gray-500'}`}>
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
