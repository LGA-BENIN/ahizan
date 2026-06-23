import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compte Ahizan',
  description: 'Portail d\'authentification unique Ahizan',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className="light" lang="fr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
