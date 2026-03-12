'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { creditWallet, debitWallet, toggleOverdraft } from './actions';
import { toast } from 'sonner';
import { PlusCircle, MinusCircle, Loader2 } from 'lucide-react';

interface WalletActionsProps {
    vendorId: string;
    vendorName: string;
    currentBalance: number;
    allowNegative: boolean;
}

export default function WalletActions({ vendorId, vendorName, currentBalance, allowNegative }: WalletActionsProps) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [overdraft, setOverdraft] = useState(allowNegative);
    const [loading, setLoading] = useState(false);

    const handleCredit = async () => {
        const n = parseInt(amount);
        if (!n || n <= 0) return toast.error('Montant invalide');
        setLoading(true);
        try {
            await creditWallet(vendorId, n, note || undefined);
            toast.success(`+${n} FCFA crédités sur le compte de ${vendorName}`);
            setAmount('');
            setNote('');
        } catch (e) {
            toast.error('Erreur lors du crédit');
        } finally {
            setLoading(false);
        }
    };

    const handleDebit = async () => {
        const n = parseInt(amount);
        if (!n || n <= 0) return toast.error('Montant invalide');
        setLoading(true);
        try {
            await debitWallet(vendorId, n, note || undefined);
            toast.success(`-${n} FCFA débités du compte de ${vendorName}`);
            setAmount('');
            setNote('');
        } catch (e) {
            toast.error('Erreur lors du débit');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (checked: boolean) => {
        setOverdraft(checked);
        try {
            await toggleOverdraft(vendorId, checked);
            toast.success(checked
                ? `Découvert autorisé pour ${vendorName}`
                : `Découvert désactivé pour ${vendorName}`);
        } catch (e) {
            setOverdraft(!checked);
            toast.error('Erreur');
        }
    };

    return (
        <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label htmlFor={`amount-${vendorId}`} className="text-xs">Montant (FCFA)</Label>
                    <Input
                        id={`amount-${vendorId}`}
                        type="number"
                        placeholder="5000"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="h-8 text-sm"
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor={`note-${vendorId}`} className="text-xs">Note (optionnel)</Label>
                    <Input
                        id={`note-${vendorId}`}
                        type="text"
                        placeholder="Wave 12/03"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="h-8 text-sm"
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <Button size="sm" onClick={handleCredit} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 gap-1">
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3 w-3" />}
                    Créditer
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDebit} disabled={loading} className="flex-1 gap-1">
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MinusCircle className="h-3 w-3" />}
                    Débiter
                </Button>
            </div>
            <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-xs text-muted-foreground">Autoriser le découvert</span>
                <Switch checked={overdraft} onCheckedChange={handleToggle} />
            </div>
        </div>
    );
}
