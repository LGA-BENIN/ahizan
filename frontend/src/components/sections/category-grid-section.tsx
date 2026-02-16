import Image from 'next/image';
import Link from 'next/link';

interface CategoryGridSectionProps {
    title?: string;
}

export function CategoryGridSection({ title }: CategoryGridSectionProps) {
    return (
        <div className="bg-muted/50 py-16 sm:py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                {title && <h2 className="text-2xl font-bold tracking-tight text-foreground mb-8">{title}</h2>}

                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
                    {/* Placeholder Categories */}
                    {['Mode', 'Électronique', 'Maison', 'Beauté', 'Sport', 'Artisanat Local'].map((cat, i) => (
                        <Link key={i} href={`/collections/${cat.toLowerCase()}`} className="group relative flex h-64 w-full flex-col overflow-hidden rounded-lg bg-white hover:opacity-90">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                            <div className="absolute inset-0 flex items-end p-6 z-20">
                                <h3 className="text-xl font-bold text-white">{cat}</h3>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
