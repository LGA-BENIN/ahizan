import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from "./login-form";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyVendorProfile } from "@/lib/vendure/actions";
import { unstable_noStore as noStore } from 'next/cache';

export const metadata: Metadata = {
    title: 'Sign In',
    description: 'Sign in to your account to access your orders, wishlist, and more.',
};

function LoginFormSkeleton() {
    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">

                <div className="flex flex-col items-center space-y-2">
                    <Skeleton className="h-4 w-40" />
                </div>
            </CardFooter>
        </Card>
    );
}

async function SignInContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    return <LoginForm redirectTo={redirectTo} />;
}

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
    noStore();

    // If user is already logged in, redirect them to the right page
    let redirectPath: string | null = null;
    try {
        const token = await getAuthToken();
        if (token) {
            const profile = await getMyVendorProfile();
            const status = profile?.status;
            if (status === 'PENDING') {
                redirectPath = '/pending';
            } else if (status === 'REJECTED') {
                redirectPath = '/rejected';
            } else {
                redirectPath = '/dashboard';
            }
        }
    } catch (e) {
        // Not logged in or error — just show the login page
    }

    if (redirectPath) {
        redirect(redirectPath);
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md space-y-6">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Sign In</h1>
                    <p className="text-muted-foreground">
                        Enter your credentials to access your account
                    </p>
                </div>
                <Suspense fallback={<LoginFormSkeleton />}>
                    <SignInContent searchParams={searchParams} />
                </Suspense>
            </div>
        </div>
    );
}