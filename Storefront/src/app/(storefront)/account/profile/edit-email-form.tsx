'use client';

import { useActionState, useEffect } from 'react';
import { requestEmailUpdateAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EditEmailFormProps {
    currentEmail: string;
}

export function EditEmailForm({ currentEmail }: EditEmailFormProps) {
    const [state, formAction, isPending] = useActionState(requestEmailUpdateAction, undefined);

    useEffect(() => {
        if (state?.success) {
            const form = document.getElementById('edit-email-form') as HTMLFormElement;
            form?.reset();
        }
    }, [state?.success]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Adresse E-mail</CardTitle>
                <CardDescription>
                    Mettez à jour votre adresse e-mail. Vous devrez vérifier la nouvelle adresse.
                </CardDescription>
            </CardHeader>
            <form id="edit-email-form" action={formAction}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentEmail">Adresse e-mail actuelle</Label>
                        <Input
                            id="currentEmail"
                            type="email"
                            value={currentEmail}
                            disabled
                            className="bg-muted"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newEmailAddress">Nouvelle adresse e-mail</Label>
                        <Input
                            id="newEmailAddress"
                            name="newEmailAddress"
                            type="email"
                            placeholder="nouvelle.adresse@exemple.com"
                            required
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe actuel</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            disabled={isPending}
                        />
                        <p className="text-xs text-muted-foreground">
                            Saisissez votre mot de passe pour confirmer cette modification.
                        </p>
                    </div>
                    {state?.error && (
                        <div className="text-sm text-destructive">
                            {state.error}
                        </div>
                    )}
                    {state?.success && (
                        <div className="text-sm text-green-600">
                            E-mail de vérification envoyé ! Veuillez consulter votre boîte de réception et cliquer sur le lien pour confirmer votre nouvelle adresse e-mail.
                        </div>
                    )}
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Envoi...' : "Mettre à jour l'e-mail"}
                    </Button>
                </CardContent>
            </form>
        </Card>
    );
}
