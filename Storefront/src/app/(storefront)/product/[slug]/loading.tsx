import React from 'react';

export default function ProductLoading() {
    return (
        <div className="container mx-auto px-4 py-6 md:py-10 max-w-[1720px] animate-pulse">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-2 mb-6 text-sm">
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <span className="text-slate-300">/</span>
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <span className="text-slate-300">/</span>
                <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>

            {/* Product Main Section Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                {/* Left Column: Gallery Skeleton */}
                <div className="lg:col-span-7 flex flex-col md:flex-row-reverse gap-4">
                    {/* Main Big Image */}
                    <div className="flex-1 aspect-square bg-slate-200 dark:bg-slate-800 rounded-2xl md:rounded-3xl shadow-xs" />
                    
                    {/* Thumbnails row/column */}
                    <div className="flex md:flex-col gap-3 overflow-hidden">
                        {[1, 2, 3, 4].map((i) => (
                            <div 
                                key={i} 
                                className="w-16 h-16 md:w-20 md:h-20 aspect-square bg-slate-200 dark:bg-slate-800 rounded-xl flex-shrink-0" 
                            />
                        ))}
                    </div>
                </div>

                {/* Right Column: Product Info Skeleton */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Vendor Badge */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </div>

                    {/* Product Title */}
                    <div className="space-y-2.5">
                        <div className="h-7 w-5/6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                        <div className="h-7 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    </div>

                    {/* Rating / Reviews */}
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
                        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </div>

                    {/* Price Block */}
                    <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 space-y-2 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="h-9 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </div>

                    {/* Variant options */}
                    <div className="space-y-3 pt-2">
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
                        <div className="flex gap-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-10 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                            ))}
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-3 pt-4">
                        <div className="h-13 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                        <div className="h-12 w-full bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl" />
                    </div>

                    {/* Reassurance pills */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                        <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
                        <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
