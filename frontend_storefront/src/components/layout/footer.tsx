import { cacheLife } from 'next/cache';
import { getTopCollections } from '@/lib/vendure/cached';
import Image from "next/image";
import Link from "next/link";


async function Copyright() {
    'use cache'
    cacheLife('days');

    return (
        <div>
            © {new Date().getFullYear()} Vendure Store. All rights reserved.
        </div>
    )
}

import { FooterConfData } from "@/lib/vendure/cms-queries";

export async function Footer({ config }: { config?: FooterConfData }) {
    'use cache'
    cacheLife('days');

    const collections = await getTopCollections();
    const siteName = "AHIZAN";

    return (
        <footer className="border-t border-border mt-auto bg-slate-50/50">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="space-y-4">
                        <p className="text-xl font-black tracking-tighter text-primary">
                            {siteName}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            {config?.about || "Votre marketplace premium pour des produits d'exception. Qualité garantie et service client dédié."}
                        </p>
                        <div className="flex gap-4 pt-4">
                            {config?.facebook && (
                                <a href={config.facebook} className="text-muted-foreground hover:text-primary transition-colors">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
                                </a>
                            )}
                            {config?.whatsapp && (
                                <a href={`https://wa.me/${config.whatsapp}`} className="text-muted-foreground hover:text-green-600 transition-colors">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                </a>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-bold mb-6 text-foreground uppercase tracking-widest">Collections</p>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            {collections.map((collection) => (
                                <li key={collection.id}>
                                    <Link
                                        href={`/collection/${collection.slug}`}
                                        className="hover:text-primary transition-colors flex items-center gap-2 group"
                                    >
                                        <span className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-primary transition-colors" />
                                        {collection.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="text-sm font-bold mb-6 text-foreground uppercase tracking-widest">
                            {config?.links ? "Menu" : "Vendure"}
                        </p>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            {config?.links ? (
                                config.links.map((link, idx) => (
                                    <li key={idx}>
                                        <Link href={link.link} className="hover:text-primary transition-colors flex items-center gap-2 group">
                                            <span className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-primary transition-colors" />
                                            {link.label}
                                        </Link>
                                    </li>
                                ))
                            ) : (
                                <>
                                    <li><a href="https://github.com/vendure-ecommerce" target="_blank" rel="noopener" className="hover:text-primary transition-colors">GitHub</a></li>
                                    <li><a href="https://docs.vendure.io" target="_blank" rel="noopener" className="hover:text-primary transition-colors">Documentation</a></li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="bg-slate-100/50 p-6 rounded-2xl border border-slate-200/50">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Newsletter</p>
                        <p className="text-sm text-slate-600 mb-4">Restez informé de nos nouveautés.</p>
                        <div className="flex gap-2">
                            <input type="email" placeholder="Email" className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:ring-2 focus:ring-primary/20" />
                            <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-shadow">OK</button>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-slate-400 font-bold tracking-wider uppercase">
                    <Copyright />
                    <div className="flex items-center gap-4 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
                        <Image src="/vendure.svg" alt="Vendure" width={40} height={27} className="h-4 w-auto dark:invert" />
                        <span>&</span>
                        <Image src="/next.svg" alt="Next.js" width={16} height={16} className="h-5 w-auto dark:invert" />
                    </div>
                </div>
            </div>
        </footer>
    );
}
