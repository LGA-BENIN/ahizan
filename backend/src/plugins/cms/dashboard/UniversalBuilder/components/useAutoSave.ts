import { useEffect, useRef } from 'react';

/**
 * Hook that auto-saves a config object after it changes.
 * Debounces saves by 2 seconds to avoid excessive API calls.
 * Saves are silent (no notifications) to avoid disrupting user workflow.
 * 
 * Usage inside a visual editor:
 *   const [config, setConfig] = useState(data);
 *   useAutoSave(config, onSave);  // <-- add this one line
 * 
 * The editor's existing "Enregistrer" button still works for immediate save.
 */
export function useAutoSave(config: any, onSave: (data: any, silent?: boolean) => void) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedHashRef = useRef<string>('');

    // Wrap onSave to track what was last saved, preventing duplicate auto-saves
    // after a manual "Enregistrer" button click
    const onSaveTracked = useRef((data: any) => {
        lastSavedHashRef.current = JSON.stringify(data);
        onSave(data, true); // Silent save for auto-save
    });
    onSaveTracked.current = (data: any) => {
        lastSavedHashRef.current = JSON.stringify(data);
        onSave(data, true); // Silent save for auto-save
    };

    // On mount and when config changes, check if we should auto-save
    useEffect(() => {
        const currentHash = JSON.stringify(config);

        // First render: just record the initial state, don't save
        if (lastSavedHashRef.current === '') {
            lastSavedHashRef.current = currentHash;
            return;
        }

        // No change from last saved state → skip
        if (currentHash === lastSavedHashRef.current) return;

        // Debounced auto-save (2s)
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            // Re-check in case it reverted
            const hashNow = JSON.stringify(config);
            if (hashNow !== lastSavedHashRef.current) {
                lastSavedHashRef.current = hashNow;
                onSaveTracked.current(config);
            }
        }, 2000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [config]); // eslint-disable-line react-hooks/exhaustive-deps
}
