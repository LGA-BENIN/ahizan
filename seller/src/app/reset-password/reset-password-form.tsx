'use client';

import { use, useActionState } from 'react';
import { resetPasswordAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface ResetPasswordFormProps {
    searchParams: Promise<{ token?: string; email?: string }>;
}

export function ResetPasswordForm({ searchParams }: ResetPasswordFormProps) {
    const params = use(searchParams);
    const token = params.token || null;
    const email = params.email || null;

    const [state, formAction, isPending] = useActionState(resetPasswordAction, undefined);

    if (!token) {
        return (
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle>Lien invalide</CardTitle>
                    <CardDescription>
                        Le code de réinitialisation est manquant ou a expiré.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Link href="/forgot-password" title="Demander un nouveau code">
                        <Button variant="outline" className="w-full">
                            Demander un nouveau code
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle>Nouveau mot de passe</CardTitle>
                <CardDescription>
                    {email ? `Définissez un nouveau mot de passe pour ${email}` : 'Entrez votre nouveau mot de passe ci-dessous.'}
                </CardDescription>
            </CardHeader>
            <form action={formAction}>
                <input type="hidden" name="token" value={token} />
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Nouveau mot de passe</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
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
                        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                            {state.error}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                    </Button>
                    <Link
                        href="/sign-in"
                        className="text-sm text-center text-muted-foreground hover:text-primary transition-colors"
                    >
                        Retour à la connexion
                    </Link>
                </CardFooter>
            </form>
        </Card>
    );
}
