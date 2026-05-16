"use client";
import React, { useState, useEffect } from 'react';
import { getAssetUrl } from '@/lib/vendure/api-utils';

export function AhizanPreloader({ config }: { config: any }) {
    const [isVisible, setIsVisible] = useState(true);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        // If config is null, keep loader until it arrives
        if (config === null) return;

        if (config?.preloader?.type === 'none') {
            setIsVisible(false);
            return;
        }

        // Show for at least one animation cycle if default
        const duration = config?.preloader?.type === 'default' ? 2800 : 2000;

        const timer = setTimeout(() => {
            setIsFading(true);
            setTimeout(() => setIsVisible(false), 800);
        }, duration);

        return () => clearTimeout(timer);
    }, [config]);

    if (!isVisible) return null;

    const type = config?.preloader?.type || 'default';
    const mediaUrl = config?.preloader?.url ? getAssetUrl(config.preloader.url) : null;

    return (
        <div className={`fixed inset-0 z-[99999] flex items-center justify-center bg-background transition-opacity duration-700 ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {type === 'default' && (
                <div className="flex gap-4 items-center justify-center overflow-hidden w-full px-10">
                    {['A', 'H', 'I', 'Z', 'A', 'N'].map((char, i) => (
                        <span 
                            key={i} 
                            className="text-5xl md:text-8xl font-black text-[#002f6c] italic tracking-tighter animate-ahizan-rush drop-shadow-2xl"
                            style={{ animationDelay: `${i * 0.08}s` }}
                        >
                            {char}
                        </span>
                    ))}
                </div>
            )}
            
            {type === 'image' && mediaUrl && (
                <div className="flex flex-col items-center gap-6">
                    <img src={mediaUrl} className="max-w-[240px] h-auto object-contain animate-pulse" alt="Loading..." />
                    <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[#002f6c] w-full animate-ahizan-rush opacity-30"></div>
                    </div>
                </div>
            )}

            {type === 'video' && mediaUrl && (
                <div className="absolute inset-0">
                    <video 
                        src={mediaUrl} 
                        autoPlay 
                        muted 
                        loop
                        playsInline 
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
        </div>
    );
}
