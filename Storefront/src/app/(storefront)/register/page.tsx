import type {Metadata} from 'next';
import {Suspense} from 'react';
import { RegistrationForm } from "./registration-form";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
    title: 'Créer un compte',
    description: 'Créez un nouveau compte pour commencer vos achats chez nous.',
};

function RegistrationFormSkeleton() {
    return (
        <Card className="border-2 rounded-3xl overflow-hidden shadow-xl shadow-muted/20">
            <CardContent className="space-y-6 p-8 pt-10">
                <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                </div>
                <div className="space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
                <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
                <Skeleton className="h-14 w-full rounded-2xl mt-4" />
            </CardContent>
            <CardFooter className="flex flex-col p-8 pt-0">
                <Skeleton className="h-4 w-48 mx-auto" />
            </CardFooter>
        </Card>
    );
}

async function RegisterContent({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    return <RegistrationForm redirectTo={redirectTo} />;
}

export default async function RegisterPage({searchParams}: PageProps<'/register'>) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
            <div className="w-full max-w-md space-y-6">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">Créer un compte</h1>
                    <p className="text-sm text-muted-foreground">
                        Inscrivez-vous pour profiter d'une expérience shopping personnalisée.
                    </p>
                </div>
                <Suspense fallback={<RegistrationFormSkeleton />}>
                    <RegisterContent searchParams={searchParams} />
                </Suspense>
            </div>
        </div>
    );
}