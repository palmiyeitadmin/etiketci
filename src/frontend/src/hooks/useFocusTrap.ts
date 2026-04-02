/**
 * useFocusTrap Hook
 * 
 * Traps focus within a container element.
 * When the trap is active, tab key cycles focus through focusable elements.
 * Shift+tab cycles focus in reverse order.
 * Escape key (optional) can deactivate the trap.
 * 
 * @param isActive - Whether focus trap is active
 * @param options - Optional configuration
 * @returns Container ref
 * 
 * @example
 * ```tsx
 * const modalRef = useFocusTrap(isModalOpen);
 * 
 * <div ref={modalRef} role="dialog" aria-modal="true">
 *   <button>Button 1</button>
 *   <button>Button 2</button>
 * </div>
 * ```
 */

import { useEffect, useRef } from 'react';

interface UseFocusTrapOptions {
    returnFocus?: boolean;
    onDeactivate?: () => void;
}

export function useFocusTrap(isActive: boolean, options: UseFocusTrapOptions = {}) {
    const containerRef = useRef<HTMLElement>(null);
    const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (focusableElements.length === 0) return;

        // Focus first element when trap activates
        if (firstElement) {
            previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
            firstElement.focus();
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            e.preventDefault();

            if (e.shiftKey) {
                // Shift+Tab: Move to previous element
                const activeElement = document.activeElement as HTMLElement;
                const currentIndex = Array.from(focusableElements).indexOf(activeElement);
                const previousIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
                (focusableElements[previousIndex] as HTMLElement)?.focus();
            } else {
                // Tab: Move to next element
                const activeElement = document.activeElement as HTMLElement;
                const currentIndex = Array.from(focusableElements).indexOf(activeElement);
                const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
                (focusableElements[nextIndex] as HTMLElement)?.focus();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && options.onDeactivate) {
                e.preventDefault();
                options.onDeactivate();
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        container.addEventListener('keydown', handleEscape);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            container.removeEventListener('keydown', handleEscape);
            
            // Restore focus when trap deactivates
            if (options.returnFocus && previouslyFocusedElementRef.current) {
                previouslyFocusedElementRef.current.focus();
            }
        };
    }, [isActive, options]);

    return containerRef;
}
