'use client';

import { useActionState, useEffect } from 'react';
import { updatePasswordAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ChangePasswordForm() {
    const [state, formAction, isPending] = useActionState(updatePasswordAction, undefined);

    useEffect(() => {
        if (state?.success) {
            const form = document.getElementById('change-password-form') as HTMLFormElement;
            form?.reset();
        }
    }, [state?.success]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Changer le mot de passe</CardTitle>
                <CardDescription>
                    Mettez à jour votre mot de passe pour sécuriser votre compte.
                </CardDescription>
            </CardHeader>
            <form id="change-password-form" action={formAction}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                        <div className="text-sm text-destructive">
                            {state.error}
                        </div>
                    )}
                    {state?.success && (
                        <div className="text-sm text-green-600">
                            Mot de passe mis à jour avec succès !
                        </div>
                    )}
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                    </Button>
                </CardContent>
            </form>
        </Card>
    );
}
