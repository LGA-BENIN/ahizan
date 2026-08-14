import { redirect } from 'next/navigation';

export default async function RegisterPage({ searchParams }: any) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;
    const email = resolvedParams?.email as string | undefined;
    const notice = resolvedParams?.notice as string | undefined;

    let returnUrl = redirectTo || process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://ahizan.com';
    if (returnUrl.includes('localhost:3001')) {
        returnUrl = returnUrl.replace('http://localhost:3001', 'https://ahizan.com');
    }

    const ssoUrl = process.env.NEXT_PUBLIC_SSO_REGISTER_URL || 'https://auth.ahizan.com/register';
    const finalUrl = `${ssoUrl}?redirectTo=${encodeURIComponent(returnUrl)}${email ? `&email=${encodeURIComponent(email)}` : ''}${notice ? `&notice=${encodeURIComponent(notice)}` : ''}`;

    redirect(finalUrl);
}