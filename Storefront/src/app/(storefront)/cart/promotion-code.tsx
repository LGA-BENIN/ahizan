import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Tag} from 'lucide-react';
import {applyPromotionCode, removePromotionCode} from './actions';

type ActiveOrder = {
    id: string;
    couponCodes?: string[] | null;
};

export async function PromotionCode({activeOrder}: { activeOrder: ActiveOrder }) {
    return (
        <Card className="mt-6 rounded-2xl border-dashed border-2 bg-muted/20">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 font-black tracking-tight">
                    <Tag className="h-5 w-5 text-primary"/>
                    Code Promo
                </CardTitle>
                <CardDescription className="font-medium">
                    Entrez votre code de réduction ci-dessous
                </CardDescription>
            </CardHeader>
            <CardContent>
                {activeOrder.couponCodes && activeOrder.couponCodes.length > 0 ? (
                    <div className="space-y-3">
                        {activeOrder.couponCodes.map((code) => (
                            <div key={code}
                                 className="flex items-center justify-between p-4 border-2 border-green-200 dark:border-green-900/30 rounded-xl bg-green-50 dark:bg-green-900/10">
                                <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-green-600"/>
                                    <span className="font-black text-sm uppercase">{code}</span>
                                </div>
                                <form action={removePromotionCode}>
                                    <input type="hidden" name="code" value={code}/>
                                    <Button
                                        type="submit"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        Supprimer
                                    </Button>
                                </form>
                            </div>
                        ))}
                    </div>
                ) : (
                    <form action={applyPromotionCode} className="flex gap-3">
                        <Input
                            type="text"
                            name="code"
                            placeholder="CODE10"
                            className="flex-1 h-11 rounded-xl border-2 font-bold uppercase tracking-widest placeholder:text-muted-foreground/30"
                            required
                        />
                        <Button type="submit" className="h-11 rounded-xl font-bold px-6">Appliquer</Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
