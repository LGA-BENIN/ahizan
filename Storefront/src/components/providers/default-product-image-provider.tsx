"use client";

import { createContext, useContext } from "react";

const DefaultProductImageContext = createContext<string>("");

export function DefaultProductImageProvider({
    url,
    children,
}: {
    url: string;
    children: React.ReactNode;
}) {
    return (
        <DefaultProductImageContext.Provider value={url}>
            {children}
        </DefaultProductImageContext.Provider>
    );
}

export function useDefaultProductImage(): string {
    return useContext(DefaultProductImageContext);
}
