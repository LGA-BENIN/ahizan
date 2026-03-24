"use client";

import Link from "next/link";
import { Search, User, HelpCircle, ShoppingCart, ChevronDown } from "lucide-react";
import { useState } from "react";

export function AhizanNavbar() {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="w-full flex flex-col font-sans">
            {/* Top Bar - Second Row */}
            <div className="bg-[#f8f9fa] h-8 flex items-center justify-between px-4 md:px-[2%] xl:px-[4%] max-w-[1600px] mx-auto w-full text-[11px] text-[#333] border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <Link href="/register" className="flex items-center gap-1.5 hover:text-[#e31837] font-semibold transition-all hover:scale-105 active:scale-95 group">
                        <span className="text-[#e31837] text-[14px] group-hover:rotate-12 transition-transform">★</span>
                        <span>Vendez sur Ahizan</span>
                    </Link>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#002f6c] transition-colors group">
                        <span className="w-4 h-3 bg-red-600 inline-block border border-gray-200 group-hover:shadow-sm"></span>
                        <span className="font-medium">Français</span>
                    </div>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#002f6c] transition-colors group">
                        <span className="w-4 h-3 bg-blue-800 inline-block border border-gray-200 group-hover:shadow-sm"></span>
                        <span className="font-medium">العربية</span>
                    </div>
                </div>
            </div>

            {/* Main Header - White */}
            <div className="bg-white py-4 px-4 md:px-[2%] xl:px-[4%] max-w-[1600px] mx-auto w-full flex items-center gap-6 md:gap-10">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-1 flex-shrink-0 group">
                    <div className="flex flex-col -space-y-2">
                        <span className="text-3xl font-black tracking-tighter text-[#002f6c] group-hover:text-[#e31837] transition-colors duration-300">AHIZAN</span>
                        <div className="h-1.5 w-full bg-[#e31837] rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                     </div>
                    <span className="text-3xl text-[#e31837] font-bold animate-pulse">★</span>
                </Link>

                {/* Search Bar */}
                <div className="flex-grow max-w-4xl mx-auto flex items-center">
                    <div className="relative flex-grow group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none group-focus-within:scale-110 transition-transform">
                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#002f6c]" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-l-xl focus:outline-none focus:border-[#002f6c] transition-all bg-gray-50/50 focus:bg-white text-sm placeholder:text-gray-400"
                            placeholder="Produits, marques, catégories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="bg-[#e31837] hover:bg-[#c4152f] text-white px-8 py-[14px] rounded-r-xl text-sm font-bold uppercase tracking-widest shadow-lg shadow-red-200 transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none hover:shadow-xl">
                        Rechercher
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 xl:gap-8">
                    {/* User */}
                    <div className="relative group">
                        <Link href="/account" className="flex items-center gap-2 px-3 py-2.5 hover:text-[#e31837] transition-all relative">
                            <User className="h-6 w-6" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[10px] text-gray-500 font-medium">Bonjour,</span>
                                <span className="text-sm font-bold hidden lg:inline">Se connecter</span>
                            </div>
                            <ChevronDown className="h-4 w-4 hidden lg:inline group-hover:rotate-180 transition-transform duration-300" />
                        </Link>
                    </div>

                    {/* Help */}
                    <Link href="/help" className="flex items-center gap-2 px-3 py-2.5 hover:text-[#002f6c] transition-all group">
                        <HelpCircle className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                        <span className="text-sm font-bold hidden lg:inline">Aide</span>
                    </Link>

                    {/* Cart */}
                    <Link href="/cart" className="flex items-center gap-2 px-4 py-2.5 bg-[#002f6c] text-white rounded-xl hover:bg-[#003d8a] transition-all hover:scale-105 active:scale-95 shadow-md shadow-blue-200">
                        <div className="relative">
                            <ShoppingCart className="h-6 w-6" />
                            <span className="absolute -top-2 -right-2 bg-[#e31837] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">0</span>
                        </div>
                        <span className="text-sm font-bold hidden lg:inline">Panier</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
