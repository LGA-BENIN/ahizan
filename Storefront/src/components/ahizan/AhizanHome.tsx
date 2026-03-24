"use client";

import { AhizanNavbar } from "@/components/ahizan/AhizanNavbar";
import { 
    Smartphone, 
    Tv, 
    Laptop, 
    Home, 
    Microwave, 
    Shirt, 
    Sparkles, 
    Gamepad2, 
    ShoppingBasket, 
    Trophy, 
    Baby, 
    MoreHorizontal,
    Phone,
    Headset,
    Store,
    Flashlight,
    ChevronRight,
    Clock
} from "lucide-react";
import Link from "next/link";

const categories = [
    { name: "Téléphone & Tablette", icon: <Smartphone className="w-4 h-4" /> },
    { name: "TV & HIGH TECH", icon: <Tv className="w-4 h-4" /> },
    { name: "Informatique", icon: <Laptop className="w-4 h-4" /> },
    { name: "Maison, cuisine & bureau", icon: <Home className="w-4 h-4" /> },
    { name: "Électroménager", icon: <Microwave className="w-4 h-4" /> },
    { name: "Vêtements & Chaussures", icon: <Shirt className="w-4 h-4" /> },
    { name: "Beauté & Santé", icon: <Sparkles className="w-4 h-4" /> },
    { name: "Jeux vidéos & Consoles", icon: <Gamepad2 className="w-4 h-4" /> },
    { name: "Supermarché", icon: <ShoppingBasket className="w-4 h-4" /> },
    { name: "Sports & Loisirs", icon: <Trophy className="w-4 h-4" /> },
    { name: "Bébé & Jouets", icon: <Baby className="w-4 h-4" /> },
    { name: "Autres catégories", icon: <MoreHorizontal className="w-4 h-4" /> },
];

export function AhizanHome() {
    return (
        <div className="bg-[#f8f9fa] min-h-screen pb-20 font-sans">
            <div className="max-w-[1600px] mx-auto w-full px-4 md:px-[2%] xl:px-[4%] pt-8">
                {/* Main section: Sidebar + Slider + Side Boxes */}
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Sidebar - Categories */}
                    <div className="hidden lg:block w-64 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0 transition-all hover:shadow-md animate-in fade-in slide-in-from-left duration-700">
                        <div className="flex flex-col py-4">
                            <div className="px-6 mb-2 text-[#002f6c] font-bold text-xs uppercase tracking-widest opacity-50">Catégories</div>
                            {categories.map((cat, i) => (
                                <Link 
                                    key={i} 
                                    href={`/category/${cat.name.toLowerCase()}`}
                                    className="flex items-center gap-4 px-6 py-2.5 text-[13px] font-medium text-gray-700 hover:text-[#e31837] hover:bg-red-50/50 transition-all group"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                >
                                    <div className="text-gray-400 group-hover:text-[#e31837] transition-colors group-hover:scale-110 transition-transform">
                                        {cat.icon}
                                    </div>
                                    <span>{cat.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Middle Slider */}
                    <div className="flex-grow bg-white rounded-2xl shadow-lg relative min-h-[400px] flex items-center justify-center overflow-hidden border border-gray-100 group animate-in zoom-in duration-700">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#002f6c]/5 to-[#e31837]/5"></div>
                        <div className="relative text-[#002f6c] opacity-20 transform group-hover:scale-110 transition-transform duration-1000">
                            <div className="w-48 h-48 border-[8px] border-current rounded-full flex items-center justify-center">
                                <span className="text-8xl font-black">A</span>
                            </div>
                        </div>
                        
                        {/* Interactive Overlay Content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                            <h1 className="text-4xl md:text-5xl font-black text-[#002f6c] mb-4 tracking-tighter animate-in fade-in slide-in-from-bottom duration-1000">
                                Bienvenue chez <span className="text-[#e31837]">Ahizan</span>
                            </h1>
                            <p className="text-gray-600 max-w-md text-lg font-medium animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
                                Le futur du commerce digital commence ici. Qualité premium, prix imbattables.
                            </p>
                            <button className="mt-8 bg-[#002f6c] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#e31837] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-200 animate-in fade-in slide-in-from-bottom duration-1000 delay-500">
                                Découvrir maintenant
                            </button>
                        </div>

                        {/* Dot indicators */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                            <div className="w-8 h-2 rounded-full bg-[#e31837] shadow-sm"></div>
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-2 h-2 rounded-full bg-gray-300 hover:bg-[#002f6c] transition-colors cursor-pointer"></div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side Boxes */}
                    <div className="hidden xl:flex flex-col gap-6 w-64 flex-shrink-0 animate-in fade-in slide-in-from-right duration-700">
                        {/* Utility Boxes */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-5 hover:shadow-md transition-shadow">
                            {[
                                { title: "Centre d'assistance", sub: "Guide du service client", icon: <Headset className="w-7 h-7" />, color: "text-[#e31837]", bg: "bg-red-50" },
                                { title: "WhatsApp", sub: "Discuter pour commander", icon: <Phone className="w-7 h-7" />, color: "text-[#28a745]", bg: "bg-green-50" },
                                { title: "Vendez sur Ahizan", sub: "Ouvrez votre shop ici", icon: <Store className="w-7 h-7" />, color: "text-[#002f6c]", bg: "bg-blue-50" }
                            ].map((box, i) => (
                                <div key={i} className="flex items-center gap-4 group cursor-pointer">
                                    <div className={`p-3 ${box.bg} ${box.color} rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                                        {box.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-[13px] font-bold text-gray-800">{box.title}</h3>
                                        <p className="text-[11px] text-gray-500 font-medium">{box.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Ad Small Box */}
                        <div className="flex-grow bg-[#002f6c] rounded-2xl shadow-lg flex items-center justify-center p-6 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                            <div className="relative text-white flex flex-col items-center text-center">
                                <div className="w-20 h-20 border-[4px] border-white/30 rounded-full flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-500">
                                    <span className="text-3xl font-black italic">A</span>
                                </div>
                                <span className="text-sm font-bold tracking-widest uppercase opacity-75">Offres Flash</span>
                                <span className="text-2xl font-black mt-1">-70%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Quick Links Grid */}
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-4 mt-12 animate-in fade-in duration-1000">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer">
                            <div className="aspect-square w-full bg-white rounded-[2rem] flex items-center justify-center shadow-sm border border-gray-100 group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-300 overflow-hidden relative">
                                 <div className="absolute inset-0 bg-gradient-to-tr from-[#002f6c]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                 <div className="w-12 h-12 bg-[#f8f9fa] rounded-full flex items-center justify-center text-[#002f6c] font-black group-hover:bg-[#e31837] group-hover:text-white transition-colors">
                                    <span className="text-xl">A</span>
                                 </div>
                            </div>
                            <span className="text-[11px] font-bold text-gray-600 group-hover:text-[#e31837] transition-colors text-center">Catégorie {i+1}</span>
                        </div>
                    ))}
                </div>

                {/* Middle Banner Ad */}
                <div className="mt-12 bg-white p-2 rounded-2xl shadow-xl shadow-gray-200 border border-gray-100 animate-in slide-in-from-bottom duration-1000">
                    <div className="bg-[#e31837] h-32 rounded-xl shadow-inner flex flex-col md:flex-row items-center justify-between px-12 overflow-hidden relative group cursor-pointer">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="relative text-white z-10">
                            <h2 className="text-2xl md:text-4xl font-black tracking-tighter">GRANDE BRADERIE AHIZAN</h2>
                            <p className="text-sm md:text-lg font-bold opacity-90">Jusqu'à épuisement des stocks !</p>
                        </div>
                        <div className="relative z-10 mt-4 md:mt-0">
                            <span className="bg-white text-[#e31837] px-8 py-3 rounded-full font-black text-lg shadow-lg hover:scale-110 transition-transform">VITE !</span>
                        </div>
                    </div>
                </div>

                {/* Ventes Flash Section */}
                <div className="mt-12 bg-white rounded-3xl shadow-xl shadow-gray-200 border border-gray-100 overflow-hidden animate-in fade-in duration-1000">
                    {/* Flash Header */}
                    <div className="bg-[#e31837] p-4 md:p-6 flex flex-col md:flex-row items-center justify-between text-white gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl animate-pulse">
                                <Clock className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="font-black text-2xl md:text-3xl tracking-tight uppercase">Ventes Flash</h2>
                                <p className="text-xs font-bold opacity-75">Offres exceptionnelles limitées dans le temps</p>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                            <div className="flex items-center gap-3 bg-black/20 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <span className="text-sm font-bold uppercase tracking-widest opacity-60 text-center">Fini dans:</span>
                                <div className="flex items-center gap-2 font-black text-xl">
                                    <span>05h</span><span className="opacity-30">:</span>
                                    <span>14m</span><span className="opacity-30">:</span>
                                    <span>16s</span>
                                </div>
                            </div>
                            <Link href="/sales" className="bg-white text-[#e31837] px-6 py-2.5 rounded-xl font-bold hover:bg-[#002f6c] hover:text-white transition-all transform hover:-translate-x-2 flex items-center gap-2 group">
                                Voir tout <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Flash Products Grid */}
                    <div className="p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex flex-col gap-4 group cursor-pointer">
                                <div className="relative aspect-square bg-[#f8f9fa] rounded-[2.5rem] overflow-hidden flex items-center justify-center p-6 border-2 border-gray-50 group-hover:border-[#e31837]/20 group-hover:shadow-2xl group-hover:-translate-y-3 transition-all duration-500">
                                    <div className="absolute top-4 right-4 bg-[#e31837] text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg z-10">
                                        -{20 + i * 5}%
                                    </div>
                                    <div className="text-6xl text-gray-200 group-hover:text-[#002f6c]/10 transition-colors transform group-hover:scale-125 duration-700 font-black">A</div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-100 group-hover:opacity-10 transition-opacity"></div>
                                </div>
                                
                                <div className="space-y-1 px-2">
                                    <h4 className="text-[14px] font-bold text-gray-800 line-clamp-1 group-hover:text-[#e31837] transition-colors">Produit Ahizan Premium #{i}</h4>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-black text-lg text-[#002f6c]">{199 + i * 50} Dhs</span>
                                        <span className="text-xs text-gray-400 line-through font-medium">{350 + i * 50} Dhs</span>
                                    </div>
                                    <div className="pt-2">
                                        <div className="flex justify-between text-[10px] font-bold mb-1.5">
                                            <span className="text-gray-500 uppercase tracking-tighter text-center">Stock Ahizan</span>
                                            <span className="text-[#e31837]">{15 + i} restants</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-50 shadow-inner">
                                            <div 
                                                className="h-full bg-gradient-to-r from-[#e31837] to-[#ff4b6b] rounded-full transition-all duration-1000 delay-500" 
                                                style={{ width: `${Math.max(20, 100 - i * 12)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                <button className="mt-2 w-full py-2.5 bg-gray-50 text-gray-800 rounded-xl text-xs font-bold hover:bg-[#e31837] hover:text-white transition-all transform opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 active:scale-95 shadow-lg shadow-gray-200">
                                    Ajouter au panier
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
