import { redirect } from 'next/navigation';

export default async function RegisterPage({ searchParams }: any) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    let returnUrl = redirectTo || process.env.NEXT_PUBLIC_SELLER_URL || 'https://seller.ahizan.com/dashboard';
    if (returnUrl.includes('localhost:3002')) {
        returnUrl = returnUrl.replace('http://localhost:3002', 'https://seller.ahizan.com');
    }

    const ssoUrl = process.env.NEXT_PUBLIC_SSO_REGISTER_URL || 'https://auth.ahizan.com/register';

    redirect(`${ssoUrl}?redirectTo=${encodeURIComponent(returnUrl)}`);
}