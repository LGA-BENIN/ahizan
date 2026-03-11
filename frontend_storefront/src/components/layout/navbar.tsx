import Image from "next/image";
import Link from "next/link";
import { NavbarCollections } from '@/components/layout/navbar/navbar-collections';
import { NavbarCart } from '@/components/layout/navbar/navbar-cart';
import { NavbarUser } from '@/components/layout/navbar/navbar-user';
import { ThemeSwitcher } from '@/components/layout/navbar/theme-switcher';
import { Suspense } from "react";
import { SearchInput } from '@/components/layout/search-input';
import { NavbarUserSkeleton } from '@/components/shared/skeletons/navbar-user-skeleton';
import { SearchInputSkeleton } from '@/components/shared/skeletons/search-input-skeleton';

import { HeaderConfData } from "@/lib/vendure/cms-queries";

export function Navbar({ config }: { config?: HeaderConfData }) {
    const logoUrl = config?.logoUrl || "/vendure.svg";
    const siteName = config?.siteName || "AHIZAN";
    const layoutType = config?.layoutType || 'standard';

    if (layoutType === 'columns') {
        return (
            <header className="border-b bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16">
                        <div
                            className="grid w-full gap-4 items-center"
                            style={{ gridTemplateColumns: `repeat(${config?.columnCount || 1}, 1fr)` }}
                        >
                            {(config?.columnsData || []).map((col, idx) => (
                                <div key={idx} className="flex justify-center items-center overflow-hidden">
                                    {col.type === 'text' ? (
                                        <div className="text-sm font-medium text-center line-clamp-2">{col.content}</div>
                                    ) : (
                                        col.imageUrl && (
                                            <div className="relative h-12 w-full max-w-[150px]">
                                                <Image
                                                    src={col.imageUrl}
                                                    alt={`Header col ${idx}`}
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                        {/* Always show actions on the right even in column mode if needed, 
                            but for now let's respect the "columns override" request */}
                        <div className="flex items-center gap-2 ml-4">
                            <ThemeSwitcher />
                            <Suspense><NavbarCart /></Suspense>
                        </div>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className="border-b bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2 group">
                            <Image
                                src={logoUrl}
                                alt={siteName}
                                width={40}
                                height={27}
                                className="h-8 w-auto transition-transform group-hover:scale-110"
                            />
                            <span className="text-xl font-black tracking-tighter text-primary">{siteName}</span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-6">
                            <Suspense>
                                <NavbarCollections />
                            </Suspense>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex">
                            <Suspense fallback={<SearchInputSkeleton />}>
                                <SearchInput />
                            </Suspense>
                        </div>
                        <ThemeSwitcher />
                        <Suspense>
                            <NavbarCart />
                        </Suspense>
                        <Suspense fallback={<NavbarUserSkeleton />}>
                            <NavbarUser />
                        </Suspense>
                    </div>
                </div>
            </div>
        </header>
    );
}
