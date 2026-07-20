'use client';

import { use, useActionState } from 'react';
import { resetPasswordAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface ResetPasswordFormProps {
    searchParams: Promise<{ token?: string }>;
}

export function ResetPasswordForm({ searchParams }: ResetPasswordFormProps) {
    const params = use(searchParams);
    const token = params.token || null;

    const [state, formAction, isPending] = useActionState(resetPasswordAction, undefined);

    if (!token) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Lien de réinitialisation invalide</CardTitle>
                    <CardDescription>
                        Le lien de réinitialisation de mot de passe est invalide ou a expiré.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4">
                    <Link href="/forgot-password" title="Demander un nouveau lien">
                        <Button variant="outline" className="w-full">
                            Demander un nouveau lien
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Réinitialiser votre mot de passe</CardTitle>
                <CardDescription>
                    Entrez votre nouveau mot de passe ci-dessous.
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
                <CardFooter className="flex flex-col space-y-4 pt-6">
                    <Button type="submit" className="w-full bg-[#0d213d] hover:bg-[#0d213d]/90 text-white" disabled={isPending}>
                        {isPending ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                    </Button>
                    <Link
                        href="/sign-in"
                        className="text-sm text-center text-muted-foreground hover:text-primary"
                    >
                        Retour à la connexion
                    </Link>
                </CardFooter>
            </form>
        </Card>
    );
}
