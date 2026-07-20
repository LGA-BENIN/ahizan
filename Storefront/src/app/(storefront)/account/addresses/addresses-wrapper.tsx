'use client';

import { useState, useEffect } from 'react';
import { AddressesClient } from './addresses-client';

export function AddressesWrapper() {
    const [isMounted, setIsMounted] = useState(false);

    // This only ever runs in the browser!
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // During the 'npm run build' step, this returns null, completely skipping the bug.
    if (!isMounted) {
        return null; 
    }

    // Once in the browser, it renders your full component safely.
    return <AddressesClient addresses={[]} countries={[]} />;
}