"use client";

import Link from "next/link";
import { Search, User, HelpCircle, ShoppingCart, ChevronDown } from "lucide-react";
import { useState } from "react";

export function AhizanNavbar({ logoUrl }: { logoUrl?: string }) {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="w-full flex flex-col font-sans animate-in fade-in duration-700">
            {/* Top Bar - Simplified */}
            <div className="bg-[#f8f9fa] h-10 border-b border-gray-100">
                <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 lg:px-12 h-full flex items-center justify-between text-[12px] text-gray-600">
                <div className="flex items-center gap-4">
                    <Link href="/register" className="flex items-center gap-1.5 hover:text-[#e31837] font-medium transition-colors">
                        <span>Vendez sur Ahizan</span>
                    </Link>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#002f6c] transition-colors">
                        <span className="w-4 h-3 bg-red-600 inline-block border border-gray-200"></span>
                        <span className="font-medium">Français</span>
                    </div>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#002f6c] transition-colors">
                        <span className="w-4 h-3 bg-blue-800 inline-block border border-gray-200"></span>
                        <span className="font-medium">العربية</span>
                    </div>
                </div>
                </div>
            </div>

            {/* Main Header - Clean White */}
            <div className="bg-white py-4 shadow-sm sticky top-0 z-50 animate-in slide-in-from-top-2 duration-500">
                <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 lg:px-12 flex items-center gap-6 md:gap-12">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-1 flex-shrink-0">
                    {logoUrl ? (
                        <img src={`http://localhost:3000${logoUrl}`} className="h-10 w-auto object-contain" alt="Ahizan Logo" />
                    ) : (
                        <span className="text-2xl font-bold tracking-tight text-[#002f6c]">AHIZAN</span>
                    )}
                </Link>

                {/* Search Bar - Professional */}
                <div className="flex-grow max-w-3xl flex items-center">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-l-md focus:outline-none focus:border-[#e31837] transition-all bg-gray-50 text-sm placeholder:text-gray-400"
                            placeholder="Rechercher des produits..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="bg-[#e31837] hover:bg-[#c4152f] text-white px-6 py-2.5 rounded-r-md text-sm font-semibold transition-colors">
                        Rechercher
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 xl:gap-8 text-gray-700">
                    {/* User */}
                    <Link href="/account" className="flex items-center gap-2 hover:text-[#e31837] transition-colors">
                        <User className="h-5 w-5" />
                        <div className="flex flex-col leading-tight hidden lg:flex">
                            <span className="text-[11px] text-gray-500">Se connecter</span>
                            <span className="text-sm font-semibold">Compte</span>
                        </div>
                        <ChevronDown className="h-3 w-3 hidden lg:inline" />
                    </Link>

                    {/* Help */}
                    <Link href="/help" className="flex items-center gap-2 hover:text-[#e31837] transition-colors hidden sm:flex">
                        <HelpCircle className="h-5 w-5" />
                        <span className="text-sm font-semibold hidden lg:inline">Aide</span>
                    </Link>

                    {/* Cart */}
                    <Link href="/cart" className="flex items-center gap-2 hover:text-[#e31837] transition-colors relative">
                        <div className="relative">
                            <ShoppingCart className="h-5 w-5" />
                            <span className="absolute -top-1.5 -right-1.5 bg-[#e31837] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
                        </div>
                        <span className="text-sm font-semibold hidden lg:inline">Panier</span>
                    </Link>
                </div>
                </div>
            </div>
        </div>
    );
}
