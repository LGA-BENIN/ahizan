import type {Metadata} from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = {
    title: 'Reset Password',
    description: 'Create a new password for your account.',
};

export default function ResetPasswordPage({searchParams}: PageProps<'/reset-password'>) {
    return (
        <div className="min-h-[75vh] flex items-center justify-center px-4 pb-20">
            <div className="w-full max-w-md">
                <Suspense fallback={
                    <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                }>
                    <ResetPasswordForm searchParams={searchParams} />
                </Suspense>
            </div>
        </div>
    );
}
