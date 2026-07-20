"use client";

import React from "react";
import { Heart } from "lucide-react";
import { LottiePlayer } from "./LottiePlayer";

export function LottieWishlist({ active }: { active: boolean }) {
    return (
        <LottiePlayer
            src="/lottie/wishlist-heart.json"
            loop={false}
            autoplay={active}
            className="w-6 h-6"
            ariaLabel="Ajouter aux favoris"
            fallbackIcon={<Heart className={`w-5 h-5 ${active ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />}
        />
    );
}
