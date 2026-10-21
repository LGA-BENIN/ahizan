import React from 'react';

export default function CollectionLoading() {
    return (
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-[1720px] animate-pulse">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-2 mb-6 text-sm">
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <span className="text-slate-300">/</span>
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>

            {/* Banner Skeleton */}
            <div className="w-full h-44 sm:h-56 md:h-64 rounded-2xl md:rounded-3xl bg-slate-200 dark:bg-slate-800 mb-8 flex flex-col justify-center items-center gap-3 p-6">
                <div className="h-8 w-64 bg-slate-300 dark:bg-slate-700 rounded-xl" />
                <div className="h-4 w-80 max-w-full bg-slate-300/60 dark:bg-slate-700/60 rounded-md" />
            </div>

            {/* Filter Bar / Controls Skeleton */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="flex items-center gap-3">
                    <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                    <div className="h-9 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
            </div>

            {/* Products Grid Skeleton (8 items) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div 
                        key={i} 
                        className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden p-2.5 sm:p-3 space-y-3"
                    >
                        {/* Image */}
                        <div className="w-full aspect-square bg-slate-200 dark:bg-slate-800 rounded-xl" />
                        
                        {/* Vendor Tag */}
                        <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                        
                        {/* Title */}
                        <div className="space-y-1.5">
                            <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
                            <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>
                        
                        {/* Price */}
                        <div className="pt-2 flex items-center justify-between">
                            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
