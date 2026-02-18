import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "AHIZAN - Statut du compte",
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr">
            <body>{children}</body>
        </html>
    );
}
