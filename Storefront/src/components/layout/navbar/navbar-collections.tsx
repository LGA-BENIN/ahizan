import {cacheLife} from 'next/cache';
import {getTopCollections} from '@/lib/vendure/cached';
import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
} from '@/components/ui/navigation-menu';
import {NavbarLink} from '@/components/layout/navbar/navbar-link';
import Link from 'next/link';
import {ChevronDown} from 'lucide-react';

export async function NavbarCollections() {
    "use cache";
    cacheLife('days');

    const collections = await getTopCollections() as any[];

    return (
        <NavigationMenu>
            <NavigationMenuList>
                {collections.map((collection: any) => (
                    <NavigationMenuItem key={collection.slug} className="relative group/nav">
                        <div className="flex items-center gap-1">
                            <NavbarLink href={`/collection/${collection.slug}`}>
                                {collection.name}
                            </NavbarLink>
                            {collection.children?.length > 0 && (
                                <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-hover/nav:rotate-180" />
                            )}
                        </div>
                        {collection.children?.length > 0 && (
                            <div className="absolute top-full left-0 hidden group-hover/nav:block bg-white border border-border/60 rounded-xl shadow-lg py-2 min-w-[180px] z-50">
                                {collection.children.map((sub: any) => (
                                    <Link
                                        key={sub.slug}
                                        href={`/collection/${sub.slug}`}
                                        className="block px-4 py-2 text-[12px] font-medium text-foreground/70 hover:text-primary hover:bg-muted/30 transition-all whitespace-nowrap"
                                    >
                                        {sub.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </NavigationMenuItem>
                ))}
            </NavigationMenuList>
        </NavigationMenu>
    );
}
