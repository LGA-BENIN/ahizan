export function ProductGridSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-lg overflow-hidden border border-border">
                        <div className="aspect-square bg-muted animate-pulse" />
                        <div className="p-2.5 space-y-2">
                            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                            <div className="h-5 bg-muted animate-pulse rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
