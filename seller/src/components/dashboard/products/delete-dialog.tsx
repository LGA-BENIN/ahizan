'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { deleteProductAction } from '@/app/dashboard/products/actions';
import { toast } from 'sonner';

interface DeleteProductDialogProps {
    productId: string;
    productName: string;
}

export default function DeleteProductDialog({ productId, productName }: DeleteProductDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            const result = await deleteProductAction(productId);
            if (result.success) {
                toast.success('Produit supprimé avec succès');
                setOpen(false);
                router.refresh();
            } else {
                toast.error('Erreur: ' + result.error);
            }
        } catch (err) {
            console.error('Error deleting product:', err);
            toast.error('Erreur inattendue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="text-red-600 hover:text-red-900 transition">
                    Supprimer
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Supprimer le produit</DialogTitle>
                    <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer "{productName}" ? Cette action est irréversible.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2 justify-end">
                    <button
                        onClick={() => setOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        disabled={loading}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Suppression...' : 'Confirmer'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
