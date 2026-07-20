"use client";

import Link from "next/link";
import { FooterConfData } from "@/lib/vendure/cms-queries";
import { JSX } from "react";

const SocialIcon = ({ type }: { type: string }) => {
    const icons: Record<string, JSX.Element> = {
        facebook: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>,
        instagram: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>,
        twitter: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
        youtube: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>,
        linkedin: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
        tiktok: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>,
    };
    return icons[type] || null;
};

const siteName = "AHIZAN";

export function PreviewFooter({ config }: { config?: FooterConfData }) {
    const showNewsletter = config?.showNewsletter !== false;

    const defaultLinkGroups = [
        { title: "BESOIN D'AIDE ?", links: [{ label: 'Discuter avec nous', link: '/contact' }, { label: 'Aide & FAQ', link: '/help' }, { label: 'Contactez-nous', link: '/contact' }] },
        { title: 'LIENS UTILES', links: [{ label: 'Suivre sa commande', link: '/account/orders' }, { label: 'Politique de retour', link: '/returns' }, { label: 'Comment commander ?', link: '/how-to' }] },
    ];
    const linkGroups = config?.linkGroups?.length ? config.linkGroups : defaultLinkGroups;

    const socials = [
        { type: 'facebook', url: config?.facebook },
        { type: 'instagram', url: config?.instagram },
        { type: 'twitter', url: config?.twitter },
        { type: 'youtube', url: config?.youtube },
        { type: 'linkedin', url: config?.linkedin },
        { type: 'tiktok', url: config?.tiktok },
    ].filter(s => s.url);

    return (
        <footer className="mt-auto bg-slate-900 text-slate-300">
            {showNewsletter && (
                <div className="border-b border-slate-700/50">
                    <div className="container mx-auto px-4 py-8">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-lg mb-1">{config?.newsletterTitle || `NOUVEAU SUR ${siteName} ?`}</h3>
                                <p className="text-slate-400 text-sm">{config?.newsletterSubtitle || "Inscrivez-vous pour recevoir nos offres exclusives et nouveautés."}</p>
                                <div className="flex gap-2 mt-4 max-w-md">
                                    <input type="email" placeholder="Entrez votre adresse email" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-primary" />
                                    <button className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex-shrink-0">S&apos;abonner</button>
                                </div>
                            </div>
                            {(config?.appStoreUrl || config?.playStoreUrl) && (
                                <div className="text-right">
                                    <p className="text-white font-bold text-sm mb-2">{siteName} DANS VOTRE POCHE !</p>
                                    <p className="text-slate-400 text-xs mb-3">Téléchargez notre application gratuite</p>
                                    <div className="flex gap-2 justify-end">
                                        {config?.appStoreUrl && <a href={config.appStoreUrl} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white hover:bg-slate-700">App Store</a>}
                                        {config?.playStoreUrl && <a href={config.playStoreUrl} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white hover:bg-slate-700">Google Play</a>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-10">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5 sm:gap-8">
                    {linkGroups.map((group, i) => (
                        <div key={i}>
                            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">{group.title}</h4>
                            <ul className="space-y-2.5">
                                {group.links.map((link, j) => (
                                    <li key={j}>
                                        <Link href={link.link} className="text-slate-400 text-sm hover:text-white transition-colors">{link.label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    <div>
                        <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">À PROPOS</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">{config?.about || `${siteName} est votre marketplace de confiance pour le shopping en ligne.`}</p>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-700/50">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                            {socials.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500 uppercase font-bold mr-1 sm:mr-3">Retrouvez-nous sur</span>
                                    <div className="inline-flex items-center gap-2 sm:gap-3">
                                        {socials.map((s) => (
                                            <a key={s.type} href={s.url!} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                                                <SocialIcon type={s.type} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {config?.paymentMethods && config.paymentMethods.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <span className="text-xs text-slate-500 uppercase font-bold">Paiement</span>
                                {config.paymentMethods.map((method, i) => (
                                    <span key={i} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300">{method}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {config?.brands && config.brands.length > 0 && (
                <div className="border-t border-slate-700/50">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                            {config.brands.map((brand, i) => (
                                <span key={i} className="hover:text-slate-300 cursor-pointer">{brand}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="border-t border-slate-700/50">
                <div className="container mx-auto px-4 py-4 text-center">
                    <p className="text-xs text-slate-500">{config?.copyrightText || `© ${new Date().getFullYear()} ${siteName}. Tous droits réservés.`}</p>
                </div>
            </div>
        </footer>
    );
}
