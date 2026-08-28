'use client';

import DOMPurify from 'dompurify';

interface ProductLongDescriptionProps {
    description?: string | null;
}

export function ProductLongDescription({ description }: ProductLongDescriptionProps) {
    if (!description || description.trim() === '') {
        return null;
    }

    const cleanHtml = typeof window !== 'undefined' ? DOMPurify.sanitize(description) : description;

    return (
        <section className="w-full bg-card/50 border-y border-border/60 py-10 md:py-16 my-8 md:my-12">
            <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-5xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    <h2 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-wide">
                        Description du produit
                    </h2>
                </div>
                <div
                    className="prose prose-slate dark:prose-invert max-w-none text-foreground/90 leading-relaxed space-y-4 font-normal text-sm md:text-base"
                    dangerouslySetInnerHTML={{ __html: cleanHtml }}
                />
            </div>
        </section>
    );
}
