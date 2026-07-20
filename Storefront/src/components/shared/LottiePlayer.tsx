"use client";

import React from "react";
import dynamic from "next/dynamic";

const DotLottieReact = dynamic(
    () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
    {
        ssr: false,
        loading: () => <div className="animate-pulse bg-muted rounded w-full h-full min-h-[150px]" />
    }
);

interface LottiePlayerProps {
    src: string;
    loop?: boolean;
    autoplay?: boolean;
    className?: string;
    width?: string | number;
    height?: string | number;
}

export function LottiePlayer({
    src,
    loop = true,
    autoplay = true,
    className,
    width,
    height
}: LottiePlayerProps) {
    return (
        <div className={className} style={{ width, height }}>
            <DotLottieReact
                src={src}
                loop={loop}
                autoplay={autoplay}
            />
        </div>
    );
}
