import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Sign In',
    description: 'Sign in to your account to access your orders, wishlist, and more.',
};

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    const ssoUrl = process.env.NODE_ENV === 'production' 
        ? 'https://auth.ahizan.com/sign-in' 
        : 'http://localhost:3003/sign-in';

    const returnUrl = redirectTo || 'http://localhost:3002/dashboard';
    
    redirect(`${ssoUrl}?redirectTo=${encodeURIComponent(returnUrl)}`);
}