import React from 'react';

export default function GlobalStorefrontLoading() {
    return (
        <div className="w-full min-h-[85vh] flex flex-col items-center justify-center py-16 px-4 animate-pulse">
            <div className="w-12 h-12 rounded-full border-3 border-red-600/30 border-t-red-600 animate-spin mb-4" />
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
    );
}
