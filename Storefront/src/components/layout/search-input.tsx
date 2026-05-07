'use client';

import {useState, useEffect, useTransition} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Search} from 'lucide-react';
import {Input} from '@/components/ui/input';

export function SearchInput({ placeholder }: { placeholder?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');

    useEffect(() => {
        setSearchValue(searchParams.get('q') || '');
    }, [searchParams]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchValue.trim()) return;
        router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors"/>
            <Input
                type="search"
                placeholder={placeholder || "Rechercher des produits..."}
                className="pl-11 pr-24 w-full h-11 md:h-12 rounded-xl border-2 border-border/60 bg-white focus:border-primary focus:ring-0 transition-all duration-300 placeholder:text-muted-foreground/60 font-medium"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                disabled={isPending}
            />
            <button 
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-6 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-all active:scale-95 shadow-md flex items-center justify-center"
            >
                {isPending ? "..." : "Rechercher"}
            </button>
        </form>
    );
}
