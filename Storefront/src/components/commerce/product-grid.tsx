import {ResultOf} from '@/graphql';
import {ProductCard} from './product-card';
import {Pagination} from '@/components/shared/pagination';
import {SortDropdown} from './sort-dropdown';
import {SearchProductsQuery} from "@/lib/vendure/queries";
import {getActiveChannel} from '@/lib/vendure/actions';

interface ProductGridProps {
    productData?: {
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    };
    productDataPromise?: Promise<{
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    }>;
    currentPage: number;
    take: number;
    columns?: number;
}

export async function ProductGrid({productData, productDataPromise, currentPage, take, columns = 3}: ProductGridProps) {
    const channel = await getActiveChannel();

    const resolvedData = productData || (productDataPromise ? await productDataPromise : null);
    if (!resolvedData) return null;

    const searchResult = resolvedData.data.search;
    const totalPages = Math.ceil(searchResult.totalItems / take);

    if (!searchResult.items.length) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No products found</p>
            </div>
        );
    }

    const gridCols = {
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
        5: 'lg:grid-cols-5',
    }[columns as 2 | 3 | 4 | 5] || 'lg:grid-cols-3';

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {searchResult.totalItems} {searchResult.totalItems === 1 ? 'product' : 'products'}
                </p>
                <SortDropdown/>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-6`}>
                {searchResult.items.map((product, i) => (
                    <ProductCard key={'product-grid-item' + i} product={product}/>
                ))}
            </div>

            {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages}/>
            )}
        </div>
    );
}
