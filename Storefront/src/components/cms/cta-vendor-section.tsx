import React from 'react';
import Link from 'next/link';

interface CtaVendorProps {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    backgroundImage?: string;
    overlayColor?: string;
}

export function CtaVendorSection({
    title = "Vendez sur AHIZAN",
    subtitle = "Rejoignez des milliers de vendeurs et touchez des millions d'acheteurs au Bénin et en Afrique.",
    ctaText = "Devenir vendeur",
    ctaLink = "/register",
    backgroundImage,
    overlayColor = "rgba(15, 23, 42, 0.85)",
}: CtaVendorProps) {
    return (
        <section className="my-10 rounded-2xl overflow-hidden relative min-h-[250px] flex items-center"
            style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: '#0f172a' }}>
            {backgroundImage && <div className="absolute inset-0" style={{ backgroundColor: overlayColor }} />}
            <div className="container mx-auto px-4 py-12 relative z-10">
                <div className="max-w-2xl mx-auto text-center text-white space-y-6">
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-tight">{title}</h2>
                    <p className="text-gray-300 text-base md:text-lg leading-relaxed">{subtitle}</p>
                    <Link href={ctaLink}
                        className="inline-block bg-white text-black font-bold px-10 py-3.5 rounded-full hover:bg-primary hover:text-white transition-all text-sm uppercase tracking-wide shadow-lg">
                        {ctaText}
                    </Link>
                </div>
            </div>
        </section>
    );
}
