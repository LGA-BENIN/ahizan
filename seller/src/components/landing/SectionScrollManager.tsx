'use client';

import { useEffect, useRef } from 'react';

export function SectionScrollManager() {
    const isLockedRef = useRef(false);
    const howItWorksStepRef = useRef(0);

    useEffect(() => {
        const getSections = () => {
            return Array.from(document.querySelectorAll<HTMLElement>('[data-snap-section="true"]'));
        };

        const getCurrentSectionIndex = (sections: HTMLElement[]): number => {
            const scrollPos = window.scrollY;
            const viewportHeight = window.innerHeight;
            const targetLine = scrollPos + viewportHeight * 0.35;

            for (let i = sections.length - 1; i >= 0; i--) {
                const sec = sections[i];
                if (!sec) continue;
                const rect = sec.getBoundingClientRect();
                const absoluteTop = scrollPos + rect.top;
                if (targetLine >= absoluteTop - 80) {
                    return i;
                }
            }
            return 0;
        };

        const scrollToTargetSection = (targetSection: HTMLElement | undefined, isTop = false) => {
            if (!targetSection) return;
            if (isTop) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            const headerOffset = 76;
            const rect = targetSection.getBoundingClientRect();
            const targetScrollY = window.scrollY + rect.top - headerOffset;
            window.scrollTo({
                top: Math.max(0, targetScrollY),
                behavior: 'smooth'
            });
        };

        const handleWheel = (e: WheelEvent) => {
            // Keep native scrolling on mobile / tablet screens
            if (window.innerWidth < 1024) return;

            // Ignore subtle gestures or jitter
            if (Math.abs(e.deltaY) < 16) return;

            if (isLockedRef.current) {
                e.preventDefault();
                return;
            }

            const sections = getSections();
            if (sections.length <= 1) return;

            const currentIndex = getCurrentSectionIndex(sections);
            const currentSection = sections[currentIndex];
            if (!currentSection) return;

            const isHowItWorks = currentSection.id === 'how-it-works';

            if (e.deltaY > 0) {
                // ------------------------------------
                // SCROLLING DOWN
                // ------------------------------------
                if (isHowItWorks) {
                    if (howItWorksStepRef.current === 0) {
                        e.preventDefault();
                        howItWorksStepRef.current = 1;
                        isLockedRef.current = true;
                        window.dispatchEvent(
                            new CustomEvent('ahizan:step-change', {
                                detail: { nextStep: 1 }
                            })
                        );
                        setTimeout(() => {
                            isLockedRef.current = false;
                        }, 700);
                        return;
                    }

                    if (howItWorksStepRef.current === 1) {
                        e.preventDefault();
                        howItWorksStepRef.current = 2;
                        isLockedRef.current = true;
                        window.dispatchEvent(
                            new CustomEvent('ahizan:step-change', {
                                detail: { nextStep: 2 }
                            })
                        );
                        setTimeout(() => {
                            isLockedRef.current = false;
                        }, 700);
                        return;
                    }

                    // If howItWorksStepRef.current === 2, fall through to advance to next section
                }

                if (currentIndex < sections.length - 1) {
                    e.preventDefault();
                    isLockedRef.current = true;

                    // If moving into how-it-works from above, reset step to 0
                    if (sections[currentIndex + 1]?.id === 'how-it-works') {
                        howItWorksStepRef.current = 0;
                        window.dispatchEvent(
                            new CustomEvent('ahizan:step-change', {
                                detail: { nextStep: 0 }
                            })
                        );
                    }

                    scrollToTargetSection(sections[currentIndex + 1]);

                    setTimeout(() => {
                        isLockedRef.current = false;
                    }, 850);
                }
            } else {
                // ------------------------------------
                // SCROLLING UP
                // ------------------------------------
                if (isHowItWorks) {
                    if (howItWorksStepRef.current === 2) {
                        e.preventDefault();
                        howItWorksStepRef.current = 1;
                        isLockedRef.current = true;
                        window.dispatchEvent(
                            new CustomEvent('ahizan:step-change', {
                                detail: { nextStep: 1 }
                            })
                        );
                        setTimeout(() => {
                            isLockedRef.current = false;
                        }, 700);
                        return;
                    }

                    if (howItWorksStepRef.current === 1) {
                        e.preventDefault();
                        howItWorksStepRef.current = 0;
                        isLockedRef.current = true;
                        window.dispatchEvent(
                            new CustomEvent('ahizan:step-change', {
                                detail: { nextStep: 0 }
                            })
                        );
                        setTimeout(() => {
                            isLockedRef.current = false;
                        }, 700);
                        return;
                    }

                    // If howItWorksStepRef.current === 0, fall through to scroll to previous section
                }

                if (currentIndex > 0) {
                    e.preventDefault();
                    isLockedRef.current = true;
                    const prevIndex = currentIndex - 1;
                    const prevSection = sections[prevIndex];

                    // If moving back into how-it-works from below, set step to 2
                    if (prevSection?.id === 'how-it-works') {
                        howItWorksStepRef.current = 2;
                        window.dispatchEvent(
                            new CustomEvent('ahizan:step-change', {
                                detail: { nextStep: 2 }
                            })
                        );
                    }

                    scrollToTargetSection(prevSection, prevIndex === 0);

                    setTimeout(() => {
                        isLockedRef.current = false;
                    }, 850);
                }
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    return null;
}
