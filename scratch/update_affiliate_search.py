import re

path = 'seller/src/app/dashboard/products/affiliate/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleSearch to debounce-friendly & add useEffect for live search
old_search_handler = '''    // Step 1 Search Handler
    const handleSearch = useCallback(async (e?: React.FormEvent, customTerm?: string) => {
        if (e) e.preventDefault();
        const q = (customTerm !== undefined ? customTerm : searchTerm).trim();
        if (!q) return;

        setIsSearching(true);
        try {
            const result = await query(SEARCH_OFFICIAL_PRODUCTS_QUERY, {
                term: q,
                take: 40
            });
            const items = result.data?.searchOfficialProducts?.items || [];
            setSearchResults(items.map((prod: any) => ({
                id: prod.id,
                name: prod.name,
                slug: prod.slug,
                preview: prod.featuredAsset?.preview || '',
                variants: prod.variants || []
            })));
            if (items.length === 0) {
                toast.info("Aucun produit officiel correspondant trouvé.");
            }
        } catch (err: any) {
            console.error('[AffiliatePage] Search failed:', err);
            toast.error('Erreur lors de la recherche: ' + err.message);
        } finally {
            setIsSearching(false);
        }
    }, [searchTerm]);'''

new_search_handler = '''    // Step 1 Search Handler
    const handleSearch = useCallback(async (e?: React.FormEvent, customTerm?: string) => {
        if (e) e.preventDefault();
        const q = (customTerm !== undefined ? customTerm : searchTerm).trim();
        if (!q) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const result = await query(SEARCH_OFFICIAL_PRODUCTS_QUERY, {
                term: q,
                take: 40
            });
            const items = result.data?.searchOfficialProducts?.items || [];
            setSearchResults(items.map((prod: any) => ({
                id: prod.id,
                name: prod.name,
                slug: prod.slug,
                preview: prod.featuredAsset?.preview || '',
                variants: prod.variants || []
            })));
            if (items.length === 0 && e) {
                toast.info("Aucun produit officiel correspondant trouvé.");
            }
        } catch (err: any) {
            console.error('[AffiliatePage] Search failed:', err);
            if (e) toast.error('Erreur lors de la recherche: ' + err.message);
        } finally {
            setIsSearching(false);
        }
    }, [searchTerm]);

    // Instant automatic search as seller types (e.g. typing "B")
    useEffect(() => {
        const q = searchTerm.trim();
        if (!q) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(() => {
            handleSearch(undefined, q);
        }, 220);
        return () => clearTimeout(timer);
    }, [searchTerm, handleSearch]);'''

assert old_search_handler in content, 'old_search_handler not found'
content = content.replace(old_search_handler, new_search_handler, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated search handler and added live search useEffect!')
