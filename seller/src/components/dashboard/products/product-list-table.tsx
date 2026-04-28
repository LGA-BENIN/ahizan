'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Search, 
    Filter, 
    MoreVertical, 
    Circle, 
    Package, 
    ArrowRight,
    ShoppingBag,
    Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import DeleteProductDialog from '@/components/dashboard/products/delete-dialog';

interface ProductListTableProps {
    initialProducts: any[];
    collectionTree: any[];
}

export default function ProductListTable({ initialProducts, collectionTree }: ProductListTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published'>('all');

    const filteredProducts = initialProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             p.slug.toLowerCase().includes(searchQuery.toLowerCase());
        
        const isPublished = p.enabled !== false;
        const matchesStatus = filterStatus === 'all' || 
                             (filterStatus === 'published' && isPublished) || 
                             (filterStatus === 'draft' && !isPublished);
        
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex items-center gap-2 flex-1 w-full max-w-xl">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                        <Input
                            placeholder="Rechercher par nom ou slug..."
                            className="pl-10 h-11 bg-card border-border rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border shrink-0 bg-card">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
                <Link href="/dashboard/products/new">
                    <Button className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap uppercase text-[10px] tracking-widest">
                        <Plus className="w-4 h-4" />
                        Ajouter un produit
                    </Button>
                </Link>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit border border-border/50">
                <Button 
                    variant={filterStatus === 'all' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className={cn(
                        "rounded-lg h-8 px-4 font-bold text-[10px] uppercase tracking-wider transition-all",
                        filterStatus === 'all' && "bg-card shadow-sm border border-border/50"
                    )}
                    onClick={() => setFilterStatus('all')}
                >
                     <Circle className={cn("w-2 h-2 fill-current mr-2", filterStatus === 'all' ? "opacity-100" : "opacity-30")} /> Tout
                </Button>
                <Button 
                    variant={filterStatus === 'draft' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className={cn(
                        "rounded-lg h-8 px-4 font-bold text-[10px] uppercase tracking-wider transition-all",
                        filterStatus === 'draft' && "bg-card shadow-sm border border-border/50 text-warning"
                    )}
                    onClick={() => setFilterStatus('draft')}
                >
                     <Circle className={cn("w-2 h-2 fill-warning text-warning mr-2", filterStatus === 'draft' ? "opacity-100" : "opacity-30")} /> Brouillon
                </Button>
                <Button 
                    variant={filterStatus === 'published' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className={cn(
                        "rounded-lg h-8 px-4 font-bold text-[10px] uppercase tracking-wider transition-all",
                        filterStatus === 'published' && "bg-card shadow-sm border border-border/50 text-primary"
                    )}
                    onClick={() => setFilterStatus('published')}
                >
                     <Circle className={cn("w-2 h-2 fill-primary text-primary mr-2", filterStatus === 'published' ? "opacity-100" : "opacity-30")} /> Publié
                </Button>
            </div>

            {/* Table Container */}
            <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm transition-colors duration-300">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead>
                            <tr className="bg-muted/30">
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Produit</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Prix</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Statut</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {filteredProducts.map((product: any) => {
                                const variant = product.variants?.[0];
                                const isPublished = product.enabled !== false;

                                return (
                                    <tr key={product.id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                {product.featuredAsset ? (
                                                    <img src={product.featuredAsset.preview} alt={product.name} className="h-12 w-12 rounded-xl object-cover border border-border shadow-sm group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center border border-border">
                                                        <Package className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{product.name}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter opacity-70 truncate max-w-[180px]">{product.slug}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                             <div className="text-sm font-bold text-primary">
                                                  {variant?.priceWithTax ? variant.priceWithTax.toLocaleString() : '0'} CFA
                                             </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant={isPublished ? "outline" : "secondary"} className={cn(
                                                "rounded-full px-3 py-1 text-[10px] font-bold gap-1.5 uppercase tracking-wider",
                                                isPublished 
                                                    ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30" 
                                                    : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30"
                                            )}>
                                                <Circle className={cn("w-1.5 h-1.5 fill-current", isPublished ? "text-primary" : "text-warning")} />
                                                {isPublished ? 'Publié' : 'Brouillon'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/dashboard/products/${product.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted font-bold">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <DeleteProductDialog productId={product.id} productName={product.name} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-lg text-foreground">Aucun produit trouvé</p>
                            <p className="text-sm text-muted-foreground">Essayez d'ajuster vos critères de recherche.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Mockup */}
            <div className="flex items-center justify-between px-6 py-2">
                <p className="text-xs text-muted-foreground">Affichage de <span className="font-bold text-foreground">{filteredProducts.length}</span> sur <span className="font-bold text-foreground">{initialProducts.length}</span> produits</p>
                <div className="flex items-center gap-2">
                     <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" disabled>
                          <ArrowRight className="h-4 w-4 rotate-180" />
                     </Button>
                     <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                          <ArrowRight className="h-4 w-4" />
                     </Button>
                </div>
            </div>
        </div>
    );
}
