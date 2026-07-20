"use client";

import {ThemeProvider as NextThemesProvider} from "next-themes";
import { createContext, useContext, ReactNode } from "react";

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) return;
    orig.apply(console, args);
  };
}

export interface ThemeSettings {

    defaultProductImage?: string;
    applyFlashPromoToProducts?: boolean;
    applyFlashPromoToCollections?: boolean;
    activeFlashSale?: any;
}

const ThemeSettingsContext = createContext<ThemeSettings | undefined>(undefined);

export function useThemeSettings() {
    return useContext(ThemeSettingsContext);
}

export function ThemeProvider({children, themeSettings}: {children: React.ReactNode; themeSettings?: ThemeSettings}) {
    return (
        <ThemeSettingsContext.Provider value={themeSettings}>
            <NextThemesProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </NextThemesProvider>
        </ThemeSettingsContext.Provider>
    );
}
