import { ChangePasswordForm } from './change-password-form';

export default function SettingsPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
            <p className="text-muted-foreground">
                Gérez les paramètres de votre compte.
            </p>

            <ChangePasswordForm />
        </div>
    );
}
