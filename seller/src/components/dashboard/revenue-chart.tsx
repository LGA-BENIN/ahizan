'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface RevenueChartProps {
    orders: any[];
    currencyCode: string;
}

export function RevenueChart({ orders, currencyCode }: RevenueChartProps) {
    const settledStates = ['PaymentAuthorized', 'PaymentSettled', 'Shipped', 'Delivered'];
    const settledOrders = orders.filter((o: any) => settledStates.includes(o.state));

    const last30Days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        last30Days[key] = 0;
    }

    for (const order of settledOrders) {
        const dateStr = order.createdAt || order.updatedAt;
        if (!dateStr) continue;
        const day = new Date(dateStr).toISOString().split('T')[0];
        if (last30Days[day] !== undefined) {
            last30Days[day] += order.totalWithTax;
        }
    }

    const chartData = Object.entries(last30Days).map(([date, total]) => ({
        date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        revenue: Math.round(total / 100),
    }));

    const formatTooltip = (value: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currencyCode || 'XOF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (settledOrders.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune commande payée sur les 30 derniers jours
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    interval={4}
                    className="text-muted-foreground"
                />
                <YAxis
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    tickFormatter={(v) => v > 0 ? `${v / 1000}k` : '0'}
                />
                <Tooltip
                    formatter={(value: number) => [formatTooltip(value), 'Revenu']}
                    labelStyle={{ fontWeight: 'bold' }}
                    contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
