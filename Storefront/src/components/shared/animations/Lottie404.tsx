"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { LottiePlayer } from "./LottiePlayer";

export function Lottie404() {
    return (
        <LottiePlayer
            src="/lottie/404.json"
            loop={true}
            autoplay={true}
            className="w-64 h-64 mx-auto"
            ariaLabel="Page introuvable (Erreur 404)"
            fallbackIcon={<AlertCircle className="w-24 h-24 text-destructive" />}
        />
    );
}
