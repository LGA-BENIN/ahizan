'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import CreateProductForm from './create-form';

interface CreateProductModalProps {
    facets: any;
}

export default function CreateProductModal({ facets }: CreateProductModalProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleSuccess = () => {
        setOpen(false);
        router.refresh();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                    Ajouter un produit
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Ajouter un nouveau produit</DialogTitle>
                </DialogHeader>
                <CreateProductForm
                    facets={facets}
                    onSuccess={handleSuccess}
                    className="p-0 shadow-none border-0"
                />
            </DialogContent>
        </Dialog>
    );
}
