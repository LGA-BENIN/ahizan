'use client';

import {useSelectedLayoutSegment} from 'next/navigation';
import {ComponentProps} from 'react';
import Link from 'next/link';
import {
    NavigationMenuLink,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {cn} from '@/lib/utils';

export function NavbarLink({href, ...rest}: ComponentProps<typeof Link>) {
    const selectedLayoutSegment = useSelectedLayoutSegment();
    const pathname = selectedLayoutSegment ? `/${selectedLayoutSegment}` : '/';
    const isActive = pathname === href;

    return (
        <NavigationMenuLink asChild active={isActive}>
            <Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                    navigationMenuTriggerStyle(),
                    "text-[12px] font-bold uppercase tracking-tight h-8 px-3 rounded-lg transition-all hover:bg-primary/5 hover:text-primary active:scale-95",
                    isActive && "bg-primary/10 text-primary shadow-inner"
                )}
                href={href}
                {...rest}
            />
        </NavigationMenuLink>
    );
}