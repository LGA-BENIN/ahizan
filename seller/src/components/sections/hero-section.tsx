import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

interface HeroSectionProps {
    title: string;
    subtitle?: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    backgroundImage?: string;
}

export function HeroSection({ title, subtitle, description, ctaText, ctaLink, backgroundImage }: HeroSectionProps) {
    return (
        <div className="relative overflow-hidden bg-background py-24 sm:py-32">
            {backgroundImage && (
                <div className="absolute inset-0 -z-10 h-full w-full object-cover">
                    <Image
                        src={backgroundImage}
                        alt={title}
                        fill
                        className="object-cover opacity-20"
                    />
                </div>
            )}
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    {subtitle && <h2 className="text-base font-semibold leading-7 text-primary">{subtitle}</h2>}
                    <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-6 text-lg leading-8 text-muted-foreground">
                            {description}
                        </p>
                    )}
                    {ctaText && ctaLink && (
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Button asChild size="lg">
                                <Link href={ctaLink}>{ctaText}</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
