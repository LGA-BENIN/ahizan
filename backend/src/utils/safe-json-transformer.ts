import { ValueTransformer } from 'typeorm';

/**
 * A safe JSON transformer that handles corrupted JSON data gracefully.
 * Prevents "Unexpected end of JSON input" errors by catching parsing errors
 * and returning null instead of crashing.
 */
export class SafeJsonTransformer implements ValueTransformer {
    to(value: any): string | null {
        if (value === null || value === undefined) {
            return null;
        }
        try {
            return JSON.stringify(value);
        } catch (e) {
            console.warn('Failed to stringify JSON value:', e);
            return null;
        }
    }

    from(value: string | null): any {
        if (value === null || value === undefined) {
            return null;
        }
        if (value === '' || value === 'null') {
            return null;
        }
        try {
            return JSON.parse(value);
        } catch (e) {
            console.warn('Failed to parse JSON value, returning null:', value, e);
            return null;
        }
    }
}

export const safeJsonTransformer = new SafeJsonTransformer();
