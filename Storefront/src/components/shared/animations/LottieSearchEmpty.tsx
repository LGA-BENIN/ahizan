"use client";

import React from "react";
import { Search } from "lucide-react";
import { LottiePlayer } from "./LottiePlayer";

export function LottieSearchEmpty() {
    return (
        <LottiePlayer
            src="/lottie/search-empty.json"
            loop={true}
            autoplay={true}
            className="w-48 h-48"
            ariaLabel="Aucun produit trouvé"
            fallbackIcon={<Search className="w-16 h-16 text-muted-foreground" />}
        />
    );
}
