"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const DotLottieReact = dynamic(
    () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
    {
        ssr: false,
        loading: () => <div className="animate-pulse bg-muted rounded-full w-full h-full" />
    }
);

interface LottiePlayerProps {
    src: string;
    loop?: boolean;
    autoplay?: boolean;
    speed?: number;
    className?: string;
    ariaLabel?: string;
    fallbackIcon?: React.ReactNode;
}

export function LottiePlayer({
    src,
    loop = true,
    autoplay = true,
    speed = 1,
    className,
    ariaLabel = "Animation",
    fallbackIcon
}: LottiePlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dotLottie, setDotLottie] = useState<any>(null);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    // Track prefers-reduced-motion
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    // Intersection Observer to pause/play based on visibility
    useEffect(() => {
        if (!dotLottie || !containerRef.current || prefersReducedMotion) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (autoplay) dotLottie.play();
                    } else {
                        dotLottie.pause();
                    }
                });
            },
            { threshold: 0.1 }
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [dotLottie, autoplay, prefersReducedMotion]);

    // Apply speed and initial config when player instance loads
    useEffect(() => {
        if (dotLottie) {
            dotLottie.setSpeed(speed);
        }
    }, [dotLottie, speed]);

    // If user prefers reduced motion and a static fallback is provided, render it instead
    if (prefersReducedMotion && fallbackIcon) {
        return (
            <div className={className} role="img" aria-label={ariaLabel}>
                {fallbackIcon}
            </div>
        );
    }

    return (
        <div 
            ref={containerRef} 
            className={className} 
            role="img" 
            aria-label={ariaLabel}
        >
            <DotLottieReact
                src={src}
                loop={loop}
                autoplay={!prefersReducedMotion && autoplay}
                dotLottieRefCallback={setDotLottie}
            />
        </div>
    );
}
