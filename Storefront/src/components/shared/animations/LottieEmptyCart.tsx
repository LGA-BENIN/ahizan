"use client";

import React from "react";
import { ShoppingCart } from "lucide-react";
import { LottiePlayer } from "./LottiePlayer";

export function LottieEmptyCart() {
    return (
        <LottiePlayer
            src="/lottie/cart-empty.json"
            loop={true}
            autoplay={true}
            className="w-48 h-48"
            ariaLabel="Votre panier est vide"
            fallbackIcon={<ShoppingCart className="w-16 h-16 text-muted-foreground" />}
        />
    );
}
