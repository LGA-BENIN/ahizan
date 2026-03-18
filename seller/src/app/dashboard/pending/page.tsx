import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import Link from "next/link";

export default function PendingPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="max-w-md w-full text-center">
                <CardHeader>
                    <div className="mx-auto bg-yellow-100 p-3 rounded-full w-fit mb-4">
                        <Clock className="w-8 h-8 text-yellow-600" />
                    </div>
                    <CardTitle className="text-2xl">Inscription en cours de traitement</CardTitle>
                    <CardDescription>
                        Votre demande d'inscription est actuellement en cours d'examen par nos administrateurs.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Vous recevrez une notification par email dès que votre compte sera validé.
                        Cette procédure prend généralement 24 à 48 heures.
                    </p>
                    <div className="pt-4">
                        <Link href="/">
                            <Button variant="outline" className="w-full">
                                Retour à l'accueil
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
