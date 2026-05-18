import type {Metadata} from 'next';
import {Suspense} from 'react';
import {LoginForm} from "./login-form";
import {Card, CardContent, CardFooter} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";

export const metadata: Metadata = {
    title: 'Connexion',
    description: 'Connectez-vous à votre compte pour accéder à vos commandes, votre liste d\'envies et plus encore.',
};

function LoginFormSkeleton() {
    return (
        <Card className="rounded-xl border shadow-sm">
            <CardContent className="space-y-4 p-5 pt-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-20"/>
                    <Skeleton className="h-10 w-full rounded-lg"/>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24"/>
                    <Skeleton className="h-10 w-full rounded-lg"/>
                </div>
                <Skeleton className="h-11 w-full rounded-lg mt-4"/>
            </CardContent>
            <CardFooter className="flex flex-col p-5 pt-4">
                <div className="flex flex-col items-center space-y-2">
                    <Skeleton className="h-4 w-48"/>
                </div>
            </CardFooter>
        </Card>
    );
}

async function SignInContent({searchParams}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    return <LoginForm redirectTo={redirectTo}/>;
}

export default async function SignInPage({searchParams}: PageProps<'/sign-in'>) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm space-y-6">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">Connexion</h1>
                    <p className="text-sm text-muted-foreground">
                        Heureux de vous revoir ! Entrez vos accès pour continuer.
                    </p>
                </div>
                <Suspense fallback={<LoginFormSkeleton/>}>
                    <SignInContent searchParams={searchParams}/>
                </Suspense>
            </div>
        </div>
    );
}