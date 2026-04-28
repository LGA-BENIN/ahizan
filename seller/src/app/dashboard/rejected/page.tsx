import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { getMyVendorProfile } from "@/lib/vendure/data";

export default async function RejectedPage() {
    const vendor = await getMyVendorProfile();

    if (!vendor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <CardTitle>Profil introuvable</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link href="/login">
                            <Button>Se connecter</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="max-w-md w-full text-center border-red-200">
                <CardHeader>
                    <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl text-red-700">Inscription Refusée</CardTitle>
                    <CardDescription>
                        Malheureusement, votre demande d'inscription n'a pas été approuvée.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-left">
                        <h4 className="font-semibold text-red-900 mb-1 text-sm">Motif du refus :</h4>
                        <p className="text-red-800 text-sm">
                            {vendor.rejectionReason || "Aucun motif spécifié. Veuillez contacter le support."}
                        </p>
                    </div>

                    <p className="text-sm text-gray-500">
                        Vous pouvez corriger les informations et soumettre une nouvelle demande.
                    </p>

                    <div className="pt-2 flex flex-col gap-3">
                        <Link href="/register?resubmit=true">
                            <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                                Corriger et renvoyer la demande
                            </Button>
                        </Link>
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
