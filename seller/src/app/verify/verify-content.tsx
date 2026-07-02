'use client';

import { use, useState, useEffect } from 'react';
import { verifyAccountAction } from './actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { XCircle, CheckCircle, Loader2 } from 'lucide-react';

interface VerifyContentProps {
    searchParams: Promise<{ token?: string }>;
}

export function VerifyContent({searchParams}: VerifyContentProps) {
    const params = use(searchParams);
    const token = params.token;

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
    const [errorMsg, setErrorMsg] = useState<string | null>(token ? null : "Le lien de vérification est invalide ou ne contient pas de jeton.");

    useEffect(() => {
        if (!token) return;

        let active = true;
        const doVerify = async () => {
            try {
                const res = await verifyAccountAction(token);
                if (!active) return;
                if (res.success) {
                    setStatus('success');
                } else {
                    setStatus('error');
                    setErrorMsg(res.error || "Impossible de vérifier votre compte. Le lien a peut-être expiré.");
                }
            } catch (err) {
                if (!active) return;
                setStatus('error');
                setErrorMsg("Une erreur inattendue est survenue. Veuillez réessayer.");
            }
        };

        doVerify();
        return () => {
            active = false;
        };
    }, [token]);

    if (status === 'loading') {
        return (
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-center">
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    </div>
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-bold">Vérification de votre compte</h1>
                        <p className="text-muted-foreground">
                            Veuillez patienter pendant que nous vérifions votre adresse e-mail...
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (status === 'success') {
        return (
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-center">
                        <CheckCircle className="h-16 w-16 text-green-600" />
                    </div>
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-bold">Compte vérifié !</h1>
                        <p className="text-muted-foreground">
                            Votre adresse e-mail a été vérifiée avec succès. Vous pouvez maintenant créer votre boutique.
                        </p>
                    </div>
                    <Link href="/onboarding" className="block">
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold">
                            Créer ma boutique
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    // Error status
    return (
        <Card>
            <CardContent className="pt-6 space-y-4">
                <div className="flex justify-center">
                    <XCircle className="h-16 w-16 text-destructive" />
                </div>
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold">Échec de la vérification</h1>
                    <p className="text-muted-foreground">
                        {errorMsg}
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <Link href="/register" className="block">
                        <Button variant="outline" className="w-full">
                            Créer un nouveau compte
                        </Button>
                    </Link>
                    <Link href="/sign-in" className="block">
                        <Button variant="ghost" className="w-full">
                            Retour à la connexion
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
