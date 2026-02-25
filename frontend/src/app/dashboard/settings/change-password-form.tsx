'use client';

import { useActionState, useEffect } from 'react';
import { changePasswordAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';

export function ChangePasswordForm() {
    const [state, formAction, isPending] = useActionState(changePasswordAction, undefined);

    useEffect(() => {
        if (state?.success) {
            const form = document.getElementById('change-password-form') as HTMLFormElement;
            form?.reset();
        }
    }, [state?.success]);

    return (
        <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-100 p-2 rounded-full">
                    <Lock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Changer le mot de passe</h2>
                    <p className="text-sm text-gray-500">Mettez à jour votre mot de passe pour sécuriser votre compte.</p>
                </div>
            </div>

            <form id="change-password-form" action={formAction} className="space-y-5">
                <div className="space-y-1">
                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                    <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        placeholder="••••••••"
                        required
                        disabled={isPending}
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        placeholder="••••••••"
                        required
                        disabled={isPending}
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        required
                        disabled={isPending}
                    />
                </div>

                {state?.error && (
                    <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">
                        {state.error}
                    </div>
                )}
                {state?.success && (
                    <div className="text-green-600 text-sm font-medium bg-green-50 p-3 rounded-lg">
                        Mot de passe mis à jour avec succès !
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={isPending}
                >
                    {isPending ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                </Button>
            </form>
        </div>
    );
}
