"use client";

import React from "react";
import { LottiePlayer } from "./LottiePlayer";

export function LottiePreloader({ url, loop = true, speed = 1 }: { url: string; loop?: boolean; speed?: number }) {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <LottiePlayer
                src={url}
                loop={loop}
                autoplay={true}
                speed={speed}
                className="w-full h-full"
                ariaLabel="Chargement en cours..."
            />
        </div>
    );
}
