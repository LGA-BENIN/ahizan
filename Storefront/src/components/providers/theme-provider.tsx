"use client";

import {ThemeProvider as NextThemesProvider} from "next-themes";
import { createContext, useContext, ReactNode } from "react";

export interface ThemeSettings {
    defaultProductImage?: string;
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
