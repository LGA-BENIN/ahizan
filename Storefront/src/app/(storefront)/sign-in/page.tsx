import { redirect } from 'next/navigation';

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    const ssoUrl = process.env.NODE_ENV === 'production' 
        ? 'https://auth.ahizan.com/sign-in' 
        : 'http://localhost:3003/sign-in';

    const returnUrl = redirectTo || 'http://localhost:3001';
    
    redirect(`${ssoUrl}?redirectTo=${encodeURIComponent(returnUrl)}`);
}