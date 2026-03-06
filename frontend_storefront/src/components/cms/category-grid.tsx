import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CategoryGridData } from '@/lib/vendure/cms-queries';

export function CategoryGrid({
    title = 'Top Categories',
    categories = []
}: CategoryGridData) {
    if (!categories || categories.length === 0) {
        return null;
    }

    return (
        <section className="py-16">
            <div className="container mx-auto px-4">
                {title && (
                    <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">
                        {title}
                    </h2>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {categories.map((category, index) => (
                        <Link
                            key={`${category.slug}-${index}`}
                            href={`/search?category=${category.slug}`}
                            className="group flex flex-col items-center text-center space-y-3 cursor-pointer"
                        >
                            <div className="relative w-full aspect-square rounded-full overflow-hidden bg-muted flex items-center justify-center transition-transform duration-300 group-hover:scale-105 border border-border">
                                {category.imageUrl ? (
                                    <Image
                                        src={category.imageUrl}
                                        alt={category.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                        <span className="text-4xl font-light text-primary/30">
                                            {category.name.charAt(0)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <h3 className="font-medium text-lg group-hover:text-primary transition-colors">
                                {category.name}
                            </h3>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
