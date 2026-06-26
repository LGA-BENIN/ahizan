"use client";

import { User, HelpCircle, ChevronDown, LogOut, Package, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveCustomer } from "@/lib/vendure/actions";
import { logoutAction } from "@/app/(storefront)/sign-in/actions";

export function NavbarUser() {
    const [customer, setCustomer] = useState<any>(null);

    useEffect(() => {
        getActiveCustomer().then(setCustomer).catch(console.error);
    }, []);

    return (
        <div className="flex items-center gap-1 md:gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        className="flex items-center gap-2 h-11 px-3 md:px-4 rounded-xl hover:bg-muted/50 transition-all font-bold text-secondary group shadow-sm bg-muted/30"
                    >
                        <User className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                        <div className="hidden lg:flex flex-col items-start gap-0.5">
                            <span className="text-[10px] text-muted-foreground font-medium leading-none uppercase tracking-tight">
                                {customer ? `Bonjour, ${customer.firstName}` : "Se connecter"}
                            </span>
                            <span className="text-[13px] leading-none flex items-center gap-1">
                                Mon Compte <ChevronDown className="w-3 h-3 opacity-50" />
                            </span>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mt-2 p-2 rounded-2xl shadow-2xl border-border/40 animate-in fade-in slide-in-from-top-4 duration-300" align="end">
                    {customer ? (
                        <>
                            <DropdownMenuLabel className="px-3 py-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                Mon Compte
                            </DropdownMenuLabel>
                            <DropdownMenuItem asChild className="rounded-lg py-2.5 cursor-pointer">
                                <Link href="/account/profile" className="flex items-center gap-3">
                                    <UserCircle className="w-4 h-4 text-primary" />
                                    <span className="font-bold">Profil</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-lg py-2.5 cursor-pointer">
                                <Link href="/account/orders" className="flex items-center gap-3">
                                    <Package className="w-4 h-4 text-primary" />
                                    <span className="font-bold">Mes Commandes</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-2" />
                            <DropdownMenuItem 
                                onClick={async () => {
                                    await logoutAction();
                                    setCustomer(null);
                                }}
                                className="rounded-lg py-2.5 cursor-pointer text-destructive focus:text-destructive flex items-center gap-3"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="font-bold">Déconnexion</span>
                            </DropdownMenuItem>
                        </>
                    ) : (
                        <div className="p-2 space-y-3">
                            <Button asChild className="w-full bg-primary font-black rounded-xl h-10 shadow-lg shadow-primary/20">
                                <Link href="/sign-in">SE CONNECTER</Link>
                            </Button>
                            <div className="border-t border-border/50 pt-2">
                                <Link href="/register" className="text-[12px] font-bold text-primary hover:underline transition-all block text-center">
                                    Créer un compte
                                </Link>
                            </div>
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Aide Dropdown (Marketplace style) */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        className="hidden sm:flex items-center gap-2 h-11 px-3 md:px-4 rounded-xl hover:bg-muted/50 transition-all font-bold text-secondary group shadow-sm bg-muted/30"
                    >
                        <HelpCircle className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                        <span className="hidden lg:inline text-[13px]">Aide</span>
                        <ChevronDown className="w-3 h-3 opacity-50 hidden lg:inline" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 mt-2 p-2 rounded-2xl shadow-2xl border-border/40" align="end">
                    <DropdownMenuItem asChild className="rounded-lg py-2.5">
                        <Link href="/help" className="font-bold">Centre d'Assistance</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg py-2.5">
                        <Link href="/track-order" className="font-bold">Suivre ma commande</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg py-2.5">
                        <Link href="/returns" className="font-bold">Retours & Remboursements</Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
