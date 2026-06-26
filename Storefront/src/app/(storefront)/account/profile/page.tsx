import type {Metadata} from 'next';
import { getActiveCustomer } from '@/lib/vendure/actions';

export const metadata: Metadata = {
    title: 'Mon Profil',
};
import { ChangePasswordForm } from './change-password-form';
import { EditProfileForm } from './edit-profile-form';
import { EditEmailForm } from './edit-email-form';

export default async function ProfilePage(_props: any) {
    const customer = await getActiveCustomer();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Mon Profil</h1>
                <p className="text-muted-foreground mt-2">
                    Gérez les informations de votre compte
                </p>
            </div>

            <EditProfileForm customer={customer} />

            <EditEmailForm currentEmail={customer?.emailAddress || ''} />

            <ChangePasswordForm />
        </div>
    );
}
