"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Package, UserPlus, ArrowRight, Info } from "lucide-react";

export default function TrackOrderClient({
    initialCode,
    initialEmail,
}: {
    initialCode: string;
    initialEmail: string;
}) {
    const router = useRouter();
    const [redirectTimer, setRedirectTimer] = useState(4);

    const orderCode = initialCode || "";
    const email = initialEmail || "";

    const registerUrl = `/register?email=${encodeURIComponent(email)}&notice=track-order&redirectTo=${encodeURIComponent(
        orderCode ? `/account/orders/${orderCode}` : "/account/orders"
    )}`;

    useEffect(() => {
        const timer = setInterval(() => {
            setRedirectTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push(registerUrl);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [registerUrl, router]);

    return (
        <div className="max-w-xl mx-auto px-4 py-12 font-sans">
            <Card className="rounded-2xl border-2 shadow-lg overflow-hidden">
                <CardHeader className="bg-primary/5 pb-6 border-b">
                    <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mb-3 shadow-md">
                        <Package className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight text-foreground">
                        Suivi de commande {orderCode ? `#${orderCode}` : ""}
                    </CardTitle>
                    <CardDescription className="text-sm font-medium">
                        Consultation de l'état de votre commande sur Ahizan
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl p-4">
                        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div>
                            <AlertTitle className="font-black text-sm uppercase tracking-wide mb-1">
                                Action requise pour le suivi
                            </AlertTitle>
                            <AlertDescription className="text-xs font-semibold leading-relaxed">
                                Veuillez créer un compte ou vous connecter afin de pouvoir suivre vos commandes.
                            </AlertDescription>
                        </div>
                    </Alert>

                    <div className="bg-muted/20 p-4 rounded-xl border border-dashed space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-muted-foreground">Code de commande :</span>
                            <span className="text-foreground">{orderCode || "En cours"}</span>
                        </div>
                        {email && (
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-muted-foreground">Adresse e-mail :</span>
                                <span className="text-foreground">{email}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 pt-2">
                        <Button
                            asChild
                            className="w-full h-12 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                        >
                            <Link href={registerUrl} className="flex items-center justify-center gap-2">
                                <UserPlus className="w-4 h-4" />
                                <span>Créer un compte et voir ma commande</span>
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>

                        <p className="text-center text-xs font-medium text-muted-foreground">
                            Redirection automatique vers l'inscription dans <span className="font-bold text-primary">{redirectTimer}s</span>...
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
