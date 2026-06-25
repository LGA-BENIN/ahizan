import { redirect } from 'next/navigation';

export default async function SignInPage({ searchParams }: any) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    let returnUrl = redirectTo || process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://ahizan.com';
    if (returnUrl.includes('localhost:3001')) {
        returnUrl = returnUrl.replace('http://localhost:3001', 'https://ahizan.com');
    }

    const ssoUrl = process.env.NEXT_PUBLIC_SSO_URL || 'https://auth.ahizan.com/sign-in';

    redirect(`${ssoUrl}?redirectTo=${encodeURIComponent(returnUrl)}`);
}