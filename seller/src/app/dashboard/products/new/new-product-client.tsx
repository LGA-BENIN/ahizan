'use client';

import React, { useState } from 'react';
import AffiliateProductPage from '@/app/dashboard/products/affiliate/page';
import CreateProductForm from '@/components/dashboard/products/create-form';
import { Search, PlusCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewProductClientProps {
    collectionTree: any[];
}

export default function NewProductClient({ collectionTree }: NewProductClientProps) {
    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <CreateProductForm collectionTree={collectionTree} />
        </div>
    );
}
