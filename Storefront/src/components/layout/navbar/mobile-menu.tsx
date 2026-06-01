import { getTopCollections } from '@/lib/vendure/cached';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export async function MobileMenu() {
    const collections = await getTopCollections() as any[];

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 active:scale-95" aria-label="Menu">
                    <Menu className="w-5 h-5 text-secondary" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-r-border/50">
                <SheetHeader className="p-4 border-b border-border/50 text-left">
                    <SheetTitle className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto py-4">
                    <div className="px-4 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Catégories</h3>
                        <div className="flex flex-col space-y-1">
                            {collections.map((collection) => (
                                <div key={collection.slug} className="flex flex-col">
                                    <Link 
                                        href={`/collection/${collection.slug}`}
                                        className="flex items-center justify-between py-2.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                                    >
                                        {collection.name}
                                        {collection.children?.length > 0 && (
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                                        )}
                                    </Link>
                                    {collection.children?.length > 0 && (
                                        <div className="flex flex-col ml-3 mt-1 space-y-1 border-l-2 border-muted/50 pl-3">
                                            {collection.children.map((sub: any) => (
                                                <Link
                                                    key={sub.slug}
                                                    href={`/collection/${sub.slug}`}
                                                    className="py-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    {sub.name}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
