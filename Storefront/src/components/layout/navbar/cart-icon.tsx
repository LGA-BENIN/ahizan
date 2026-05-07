'use client';

import {ShoppingCart} from "lucide-react";
import {Button} from "@/components/ui/button";
import Link from "next/link";


interface CartIconProps {
    cartItemCount: number;
}

export function CartIcon({cartItemCount}: CartIconProps) {
    return (
        <Button 
            variant="ghost" 
            asChild 
            className="relative flex items-center gap-2 h-11 px-3 md:px-4 rounded-xl hover:bg-muted/50 transition-all font-bold text-secondary group shadow-sm bg-white/50"
        >
            <Link href="/cart">
                <div className="relative">
                    <ShoppingCart className="h-5 w-5 text-primary group-hover:scale-110 transition-transform"/>
                    {cartItemCount > 0 && (
                        <span
                            className="absolute -top-2.5 -right-2.5 bg-primary text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in duration-300">
                            {cartItemCount}
                        </span>
                    )}
                </div>
                <span className="hidden lg:inline text-[13px]">Panier</span>
                <span className="sr-only">Shopping Cart</span>
            </Link>
        </Button>
    );
}
