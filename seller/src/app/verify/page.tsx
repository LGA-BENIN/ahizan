import type {Metadata} from 'next';
import {Suspense} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Loader2} from 'lucide-react';
import {VerifyContent} from './verify-content';

export const metadata: Metadata = {
    title: "Vérification de l'adresse e-mail",
    description: "Vérifiez votre adresse e-mail pour finaliser votre inscription vendeur.",
};

function VerifyLoading() {
    return (
        <Card>
            <CardContent className="pt-6 space-y-4">
                <div className="flex justify-center">
                    <Loader2 className="h-16 w-16 text-primary animate-spin"/>
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

export default function VerifyPage({searchParams}: PageProps<'/verify'>) {
    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md space-y-6">
                <Suspense fallback={<VerifyLoading/>}>
                    <VerifyContent searchParams={searchParams}/>
                </Suspense>
            </div>
        </div>
    );
}
