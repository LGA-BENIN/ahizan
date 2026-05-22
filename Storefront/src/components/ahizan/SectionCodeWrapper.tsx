"use client";

import React, { useEffect, useRef, useId } from 'react';

interface SectionCodeWrapperProps {
    config: any;
    sectionId?: string;
    children: React.ReactNode;
}

/**
 * Wraps any CMS section and handles code injection:
 * - If `_codeOverride` is true, renders `_overrideHTML` instead of children
 * - Injects `_customHTMLBefore` / `_customHTMLAfter` around children
 * - Injects `_customCSS` as a scoped <style> tag
 * - Executes `_customJS` when the section mounts
 */
export function SectionCodeWrapper({ config, sectionId, children }: SectionCodeWrapperProps) {
    const scopeId = useId().replace(/:/g, '');
    const jsRef = useRef<boolean>(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    const isOverride = config?._codeOverride === true;
    const overrideHTML = config?._overrideHTML || '';
    const customCSS = config?._customCSS || '';
    const customJS = config?._customJS || '';
    const htmlBefore = config?._customHTMLBefore || '';
    const htmlAfter = config?._customHTMLAfter || '';

    const hasCode = isOverride || customCSS || customJS || htmlBefore || htmlAfter;

    // Execute custom JS once on mount
    useEffect(() => {
        if (customJS && !jsRef.current) {
            jsRef.current = true;
            try {
                // Create a scoped execution context with useful references
                const sectionEl = sectionRef.current;
                const fn = new Function('section', 'document', 'window', customJS);
                fn(sectionEl, document, window);
            } catch (err) {
                console.error(`[SectionCodeWrapper] JS error in section ${sectionId}:`, err);
            }
        }
    }, [customJS, sectionId]);

    // No code fields at all — render children directly (zero overhead)
    if (!hasCode) {
        return <>{children}</>;
    }

    // Full override mode — replace React component entirely
    if (isOverride && overrideHTML) {
        return (
            <div
                ref={sectionRef}
                data-section-id={sectionId}
                data-code-override="true"
                className={`section-code-${scopeId}`}
                suppressHydrationWarning
            >
                {customCSS && (
                    <style suppressHydrationWarning dangerouslySetInnerHTML={{
                        __html: customCSS.replace(/:scope/g, `.section-code-${scopeId}`)
                    }} />
                )}
                <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: overrideHTML }} />
            </div>
        );
    }

    // Injection mode — add HTML before/after, CSS, JS around the section
    return (
        <div
            ref={sectionRef}
            data-section-id={sectionId}
            className={`section-code-${scopeId}`}
            suppressHydrationWarning
        >
            {customCSS && (
                <style suppressHydrationWarning dangerouslySetInnerHTML={{
                    __html: customCSS.replace(/:scope/g, `.section-code-${scopeId}`)
                }} />
            )}
            {htmlBefore && (
                <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: htmlBefore }} />
            )}
            {children}
            {htmlAfter && (
                <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: htmlAfter }} />
            )}
        </div>
    );
}
