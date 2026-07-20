'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useMemo } from 'react';

interface RevenueChartProps {
    orders: any[];
    currencyCode: string;
}

export function RevenueChart({ orders, currencyCode }: RevenueChartProps) {
    const settledStates = ['PaymentAuthorized', 'PaymentSettled', 'Shipped', 'Delivered'];
    const settledOrders = useMemo(() => {
        return orders.filter((o: any) => settledStates.includes(o.state));
    }, [orders]);

    // Generate last 30 days data
    const chartData = useMemo(() => {
        const last30Days: Record<string, number> = {};
        const now = new Date();
        
        // Initialize the last 30 days with 0
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            last30Days[key] = 0;
        }

        // Fill with real orders data if available
        if (settledOrders.length > 0) {
            for (const order of settledOrders) {
                const dateStr = order.createdAt || order.updatedAt;
                if (!dateStr) continue;
                const day = new Date(dateStr).toISOString().split('T')[0];
                if (last30Days[day] !== undefined) {
                    last30Days[day] += order.totalWithTax;
                }
            }
        } else {
            // Demo data for preview if no sales yet (smooth wave)
            // This ensures a premium aesthetic even on empty state
            const baseValues = [12000, 15000, 8000, 19000, 22000, 14000, 28000, 31000, 25000, 42000];
            const keys = Object.keys(last30Days);
            keys.forEach((key, index) => {
                const valIndex = Math.floor(index / 3) % baseValues.length;
                // Add minor random noise for realism
                const noise = Math.sin(index) * 2000;
                last30Days[key] = Math.max(0, baseValues[valIndex] + noise);
            });
        }

        return Object.entries(last30Days).map(([date, total]) => ({
            date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            rawDate: date,
            revenue: Math.round(total / 100), // convert centimes to main currency unit
        }));
    }, [settledOrders]);

    const formatTooltip = (value: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currencyCode || 'XOF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const isDemo = settledOrders.length === 0;

    return (
        <div className="relative w-full h-[240px]">
            {isDemo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/40 backdrop-blur-[1px] z-10 rounded-xl pointer-events-none">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm border border-primary/20">
                        Mode Aperçu
                    </span>
                    <p className="text-xs text-muted-foreground font-semibold">Vos ventes réelles s'afficheront ici</p>
                </div>
            )}
            
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                    data={chartData} 
                    margin={{ top: 15, right: 5, left: 5, bottom: 5 }}
                    className={isDemo ? "opacity-30 select-none" : ""}
                >
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ba0013" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#ba0013" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                        dy={8}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                        tickFormatter={(v) => v > 0 ? `${(v).toLocaleString('fr-FR')}` : '0'}
                        dx={-8}
                        width={45}
                    />
                    <Tooltip
                        cursor={{ stroke: 'rgba(186, 0, 19, 0.1)', strokeWidth: 1.5 }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 text-left scale-95 transition-all">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                                            {new Date(data.rawDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="font-black text-xs text-primary-fixed">
                                            {formatTooltip(payload[0].value as number)}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#ba0013" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#chartGradient)"
                        activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2, fill: '#ba0013' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
