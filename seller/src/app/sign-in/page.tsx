import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Sign In',
    description: 'Sign in to your account to access your orders, wishlist, and more.',
};

export default async function SignInPage({ searchParams }: any) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    let returnUrl = redirectTo || process.env.NEXT_PUBLIC_SELLER_URL || 'https://seller.ahizan.com/dashboard';
    if (returnUrl.includes('localhost:3002')) {
        returnUrl = returnUrl.replace('http://localhost:3002', 'https://seller.ahizan.com');
    }

    const ssoUrl = process.env.NEXT_PUBLIC_SSO_URL || 'https://auth.ahizan.com/sign-in';

    redirect(`${ssoUrl}?redirectTo=${encodeURIComponent(returnUrl)}`);
}