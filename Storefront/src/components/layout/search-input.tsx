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
        <form onSubmit={handleSubmit} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input
                type="search"
                placeholder={placeholder || "Rechercher un produit..."}
                className="pl-9 w-full h-10 rounded-lg border-2 border-border focus:border-primary"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                disabled={isPending}
            />
        </form>
    );
}
