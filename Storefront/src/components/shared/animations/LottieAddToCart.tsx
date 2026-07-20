"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";
import { LottiePlayer } from "./LottiePlayer";

export function LottieAddToCart({ active }: { active: boolean }) {
    return (
        <LottiePlayer
            src="/lottie/add-to-cart.json"
            loop={false}
            autoplay={active}
            className="w-6 h-6 mr-2 animate-bounce"
            ariaLabel="Ajouter au panier"
            fallbackIcon={<ShoppingBag className="w-5 h-5 mr-2" />}
        />
    );
}
