"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { LottiePlayer } from "./LottiePlayer";

export function LottieOrderSuccess() {
    return (
        <div className="fixed inset-0 pointer-events-none z-[999] flex items-center justify-center">
            <LottiePlayer
                src="/lottie/confetti.json"
                loop={false}
                autoplay={true}
                className="w-full h-full max-w-4xl"
                ariaLabel="Félicitations pour votre commande !"
                fallbackIcon={<CheckCircle2 className="w-24 h-24 text-green-500 animate-bounce" />}
            />
        </div>
    );
}
