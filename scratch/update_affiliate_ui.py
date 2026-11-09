import re

path = 'seller/src/app/dashboard/products/affiliate/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the search input and results container with our enhanced UI
old_step1_block = '''                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Ex: iPhone 15 Pro, T-shirt Coton, Robe Africaine, Samsung Galaxy..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-12 h-13 rounded-2xl bg-muted/20 border-border focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-semibold"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSearching}
                            className="h-13 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechercher'}
                        </Button>
                    </form>

                    {/* Results List */}
                    {isSearching ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-xs font-bold uppercase tracking-widest">Recherche dans le catalogue Ahizan...</p>
                        </div>
                    ) : flattenedSearchResults.length > 0 ? (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span>{flattenedSearchResults.length} déclinaison(s) trouvée(s) dans le catalogue officiel :</span>
                                </span>
                                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                    Sélectionnez une déclinaison pour définir directement votre tarif et stock
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                                {(showAllAffiliateSearch ? flattenedSearchResults : flattenedSearchResults.slice(0, 12)).map(item => (
                                    <div
                                        key={item.key}
                                        onClick={() => handleSelectProduct(item.product, item.variantId)}
                                        className="p-3.5 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-md transition-all flex flex-col justify-between gap-3 group cursor-pointer"
                                        title={`Vendre la déclinaison "${item.title}"`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-14 h-14 rounded-xl bg-muted/60 border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                                                {item.preview ? (
                                                    <img src={item.preview} alt={item.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <Package className="w-6 h-6 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-foreground text-xs sm:text-sm line-clamp-2 group-hover:text-primary transition-colors" title={item.title}>
                                                    {item.title}
                                                </h4>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                                                    Réf: {item.sku || 'OFFICIEL'}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectProduct(item.product, item.variantId);
                                            }}
                                            className="w-full h-8 rounded-xl bg-primary/10 group-hover:bg-primary text-primary group-hover:text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <span>Vendre cette déclinaison</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {flattenedSearchResults.length > 12 && (
                                <div className="flex justify-center pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAllAffiliateSearch(!showAllAffiliateSearch)}
                                        className="rounded-xl text-xs font-bold cursor-pointer"
                                    >
                                        {showAllAffiliateSearch
                                            ? "Voir moins"
                                            : `Voir plus (+${flattenedSearchResults.length - 12} autre(s) déclinaison(s))`}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : null}'''

new_step1_block = '''                    {/* Interactive Search Bar with instant debounce */}
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Recherche automatique : tapez un nom (ex: Bic, iPhone, T-shirt, Robe...)"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-12 pr-10 h-13 rounded-2xl bg-muted/20 border-border focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-semibold"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSearchResults([]);
                                    }}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-xs transition-colors cursor-pointer"
                                    title="Effacer la recherche"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={isSearching}
                            className="h-13 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechercher'}
                        </Button>
                    </form>

                    {/* Results Container */}
                    {isSearching ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-xs font-bold uppercase tracking-widest">Recherche en direct dans le catalogue central Ahizan...</p>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div className="space-y-5 pt-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                                <div>
                                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        <span>{searchResults.length} produit(s) trouvé(s) dans le catalogue central</span>
                                    </span>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Cliquez sur une déclinaison existante pour la vendre directement, ou créez une nouvelle option si la vôtre n'est pas encore listée.
                                    </p>
                                </div>
                            </div>

                            {/* Products Cards with Available Options and New Option Creator */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {searchResults.map((prod: any) => {
                                    const variants = prod.variants || [];
                                    return (
                                        <div
                                            key={prod.id}
                                            className="p-4 sm:p-5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                                        >
                                            {/* Product Header */}
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-16 h-16 rounded-xl bg-muted/60 border border-border overflow-hidden shrink-0 flex items-center justify-center p-1">
                                                    {prod.preview ? (
                                                        <img src={prod.preview} alt={prod.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Package className="w-7 h-7 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                                                        Catalogue Central
                                                    </span>
                                                    <h3 className="font-bold text-foreground text-sm sm:text-base line-clamp-2 mt-1" title={prod.name}>
                                                        {prod.name}
                                                    </h3>
                                                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                                        {variants.length} déclinaison{variants.length > 1 ? 's' : ''} officielle{variants.length > 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Available Options & Variants List */}
                                            <div className="space-y-2 border-t border-border/50 pt-3">
                                                <div className="text-[11px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                    <span>🏷️</span>
                                                    <span>Déclinaisons disponibles :</span>
                                                </div>

                                                {variants.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
                                                        {variants.map((v: any) => {
                                                            const optPairs = (v.options || []).map((o: any) => `${o.group?.name ? o.group.name + ': ' : ''}${o.name || o.code}`);
                                                            const optLabel = optPairs.length > 0 ? optPairs.join(' • ') : (v.name || 'Déclinaison standard');
                                                            return (
                                                                <button
                                                                    key={v.id}
                                                                    type="button"
                                                                    onClick={() => handleSelectProduct(prod, v.id)}
                                                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/60 hover:bg-primary hover:text-white border border-border/80 hover:border-primary text-foreground transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group"
                                                                    title={`Vendre la déclinaison "${optLabel}"`}
                                                                >
                                                                    <span className="w-2 h-2 rounded-full bg-primary group-hover:bg-white" />
                                                                    <span>{optLabel}</span>
                                                                    <ChevronRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-muted-foreground italic">
                                                        Fiche produit standard (aucune déclinaison multiple).
                                                    </div>
                                                )}
                                            </div>

                                            {/* The "Create / Sell Missing Option" Box */}
                                            <div className="p-3 rounded-xl border border-dashed border-primary/40 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="p-1.5 rounded-lg bg-primary/10 text-primary text-sm">✨</span>
                                                    <div>
                                                        <div className="text-xs font-bold text-foreground">
                                                            Option non listée ? (ex: autre couleur, taille...)
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Proposez votre propre déclinaison sur ce produit
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => handleSelectProduct(prod, null)}
                                                    className="h-8 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer shadow-sm hover:bg-primary/90 flex items-center gap-1"
                                                    title="Créer une nouvelle option ou déclinaison sur ce modèle"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>Ajouter une option</span>
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : searchTerm.trim() ? (
                        <div className="py-12 px-6 rounded-2xl border border-dashed border-border bg-muted/20 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-xl">🔍</div>
                            <h3 className="text-sm font-black text-foreground">Aucun produit officiel trouvé pour « {searchTerm} »</h3>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                Vous pouvez ajuster vos mots-clés ou proposer directement un nouveau produit au catalogue officiel Ahizan.
                            </p>
                            <Link href="/dashboard/products/new">
                                <Button size="sm" className="mt-2 rounded-xl text-xs font-bold cursor-pointer">
                                    ➕ Créer un nouveau produit
                                </Button>
                            </Link>
                        </div>
                    ) : null}'''

assert old_step1_block in content, 'old_step1_block not found in file'
content = content.replace(old_step1_block, new_step1_block, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully upgraded Step 1 search UI in affiliate/page.tsx!')
