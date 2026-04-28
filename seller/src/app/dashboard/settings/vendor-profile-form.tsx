'use client';

import { useActionState, useEffect } from 'react';
import { updateVendorProfileAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface VendorProfileFormProps {
    initialName: string;
    title: string;
    description: string;
}

export function VendorProfileForm({ initialName, title, description }: VendorProfileFormProps) {
    const [state, formAction, isPending] = useActionState<any, FormData>(updateVendorProfileAction, undefined);
    const router = useRouter();

    useEffect(() => {
        if (state?.success) {
            toast.success('Profil mis à jour avec succès');
            router.refresh();
        } else if (state?.error) {
            toast.error(state.error);
        }
    }, [state, router]);

    return (
        <div className="bg-card rounded-3xl border shadow-sm p-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1 mb-8">
                <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <form action={formAction} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input
                        id="name"
                        name="name"
                        defaultValue={initialName}
                        placeholder="Nom de votre boutique ou profil"
                        required
                        disabled={isPending}
                        className="bg-muted/50 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-brand-navy/20"
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                    disabled={isPending}
                >
                    {isPending ? 'Mise à jour...' : 'Enregistrer les modifications'}
                </Button>
            </form>
        </div>
    );
}
