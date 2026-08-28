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
                toast.success('Vos offres pour ce produit ont été retirées avec succès.');
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
                <button 
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-900/40 transition-all cursor-pointer font-medium text-xs flex items-center gap-1.5"
                    title="Supprimer mes offres"
                >
                    Supprimer
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="font-serif font-black text-lg">Retirer mes offres pour ce produit</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                        Êtes-vous sûr de vouloir retirer toutes vos offres et déclinaisons pour <strong className="text-foreground">« {productName} »</strong> ?
                        <br /><br />
                        <span className="text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 p-2 rounded-lg block border border-amber-500/20">
                            ℹ️ Cette action supprime uniquement vos tarifs et stocks greffés. La fiche produit de base Ahizan reste préservée dans le catalogue central.
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2 justify-end pt-2">
                    <button
                        onClick={() => setOpen(false)}
                        className="px-4 py-2 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 transition-all"
                        disabled={loading}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-600/20 disabled:opacity-50 transition-all cursor-pointer"
                        disabled={loading}
                    >
                        {loading ? 'Retrait en cours...' : 'Confirmer le retrait'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
