import {Badge} from '@/components/ui/badge';
import {
    ShoppingCart,
    CreditCard,
    Clock,
    CheckCircle,
    Truck,
    PackageCheck,
    Package,
    XCircle,
    type LucideIcon,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: LucideIcon }> = {
    AddingItems: {color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Panier en cours', icon: ShoppingCart},
    ArrangingPayment: {color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400', label: 'Paiement en attente', icon: CreditCard},
    PaymentAuthorized: {color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400', label: 'Paiement autorisé', icon: Clock},
    PaymentSettled: {color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', label: 'Paiement à la livraison', icon: CheckCircle},
    PartiallyShipped: {color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400', label: 'Partiellement expédiée', icon: Package},
    Shipped: {color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400', label: 'Expédiée', icon: Truck},
    PartiallyDelivered: {color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-400', label: 'Partiellement livrée', icon: PackageCheck},
    Delivered: {color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400', label: 'Livrée', icon: PackageCheck},
    Cancelled: {color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400', label: 'Annulée', icon: XCircle},
};

interface OrderStatusBadgeProps {
    state: string;
}

export function OrderStatusBadge({state}: OrderStatusBadgeProps) {
    const config = STATUS_CONFIG[state] || {color: 'bg-gray-100 text-gray-800', label: state, icon: Clock};
    const Icon = config.icon;

    return (
        <Badge className={config.color} variant="secondary">
            <Icon className="h-3 w-3 mr-1"/>
            {config.label}
        </Badge>
    );
}
