import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ProductListSectionProps {
    title?: string;
    limit?: number;
    categoryId?: string;
    collectionSlug?: string;
}

export function ProductListSection({ title, limit = 8, categoryId, collectionSlug }: ProductListSectionProps) {
    return (
        <div className="bg-background py-16 sm:py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    {title && <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>}
                    {collectionSlug && (
                        <Button variant="link" asChild>
                            <Link href={`/collections/${collectionSlug}`}>Voir tout &rarr;</Link>
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                    {/* Placeholder for Product Cards - real data fetching will happen in a wrapper or via server component */}
                    {Array.from({ length: limit }).map((_, i) => (
                        <div key={i} className="group relative">
                            <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-muted lg:aspect-none group-hover:opacity-75 lg:h-80">
                                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                    Product {i + 1}
                                </div>
                            </div>
                            <div className="mt-4 flex justify-between">
                                <div>
                                    <h3 className="text-sm text-foreground">
                                        <a href="#">
                                            <span aria-hidden="true" className="absolute inset-0" />
                                            Produit Exemple {i + 1}
                                        </a>
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">Couleur</p>
                                </div>
                                <p className="text-sm font-medium text-foreground">10,000 FCFA</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
