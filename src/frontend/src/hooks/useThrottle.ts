/**
 * useThrottle Hook
 * 
 * Limits the rate at which a function can be called.
 * Useful for performance-intensive operations like drag, scroll, or resize events.
 * 
 * @param callback - The function to throttle
 * @param delay - The minimum time between function calls in milliseconds (default: 100ms)
 * @returns Throttled function
 * 
 * @example
 * ```tsx
 * const throttledHandleDrag = useThrottle(handleDrag, 100);
 * <div onMouseMove={throttledHandleDrag} />
 * ```
 */

import { useRef, useCallback } from 'react';

export function useThrottle<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 100
): (...args: Parameters<T>) => void {
    const lastRan = useRef(0); // Initialize to 0 to allow first call
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now();
            const timeSinceLastCall = now - lastRan.current;

            if (timeSinceLastCall >= delay) {
                // If enough time has passed, execute immediately
                callback(...args);
                lastRan.current = now;
            } else if (!timeoutRef.current) {
                // Otherwise, schedule for the next available slot
                timeoutRef.current = setTimeout(() => {
                    callback(...args);
                    lastRan.current = Date.now();
                    timeoutRef.current = null;
                }, delay - timeSinceLastCall);
            }
        },
        [callback, delay]
    );
}
