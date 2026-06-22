"use client";

import React from "react";
import { LottiePlayer } from "./LottiePlayer";

export function LottiePreloader({ url }: { url: string }) {
    return (
        <div className="max-w-[300px] w-full flex items-center justify-center">
            <LottiePlayer
                src={url}
                loop={true}
                autoplay={true}
                className="w-full h-full"
                ariaLabel="Chargement en cours..."
            />
        </div>
    );
}
