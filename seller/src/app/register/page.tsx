import { redirect } from 'next/navigation';

export default async function RegisterPage({ searchParams }: PageProps<'/register'>) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    const ssoUrl = process.env.NODE_ENV === 'production' 
        ? 'https://auth.ahizan.com/register' 
        : 'http://localhost:3003/register';

    const returnUrl = redirectTo || 'http://localhost:3002/dashboard';
    
    redirect(`${ssoUrl}?redirectTo=${encodeURIComponent(returnUrl)}`);
}