import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

interface PromoBannerSectionProps {
    title: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: 'light' | 'dark';
    reverse?: boolean;
}

export function PromoBannerSection({
    title,
    description,
    ctaText,
    ctaLink,
    imageUrl,
    backgroundColor = 'bg-orange-600',
    textColor = 'light',
    reverse = false,
}: PromoBannerSectionProps) {
    const textClass = textColor === 'light' ? 'text-white' : 'text-gray-900';
    const mutedTextClass = textColor === 'light' ? 'text-orange-100' : 'text-gray-600';

    return (
        <section className={`py-12 px-6 lg:px-8`}>
            <div className={`mx-auto max-w-7xl overflow-hidden rounded-2xl ${backgroundColor} shadow-lg`}>
                <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center`}>
                    {imageUrl && (
                        <div className="relative h-64 w-full md:h-96 md:w-1/2">
                            <Image
                                src={imageUrl}
                                alt={title}
                                fill
                                className="object-cover"
                            />
                        </div>
                    )}
                    <div className={`p-8 md:p-12 lg:p-16 ${imageUrl ? 'md:w-1/2' : 'w-full'} text-center md:text-left`}>
                        <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${textClass}`}>
                            {title}
                        </h2>
                        {description && (
                            <p className={`mt-4 text-lg ${mutedTextClass}`}>
                                {description}
                            </p>
                        )}
                        {ctaText && ctaLink && (
                            <div className="mt-8">
                                <Button
                                    asChild
                                    size="lg"
                                    variant={textColor === 'light' ? 'secondary' : 'default'}
                                    className={textColor === 'light' ? 'bg-white text-orange-600 hover:bg-orange-50 border-none' : ''}
                                >
                                    <Link href={ctaLink}>{ctaText}</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
