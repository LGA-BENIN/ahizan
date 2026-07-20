'use client';

import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletRechargeButton({ vendorName }: { vendorName?: string }) {
    const handleRequest = () => {
        // In a later version, this will send a notification to the admin.
        // For now, it simply prompts the vendor to contact support.
        toast.success('Demande envoyée !', {
            description: 'Votre demande de recharge a été envoyée à l\'équipe Ahizan. Nous crééditerons votre compte dès réception de votre paiement.',
        });
    };

    return (
        <Button onClick={handleRequest} className="gap-2">
            <Send className="h-4 w-4" />
            Notifier Ahizan après paiement
        </Button>
    );
}
