/**
 * Touch Event Handlers for Mobile Responsiveness
 * 
 * Provides touch-friendly event handling for canvas interactions.
 * Supports single-touch tap, double-tap, and drag gestures.
 * 
 * @module editor-touch-handlers
 */

import { TouchEvent, PointerEvent } from "react";

export interface TouchHandlers {
    onTouchStart?: (e: TouchEvent) => void;
    onTouchMove?: (e: TouchEvent) => void;
    onTouchEnd?: (e: TouchEvent) => void;
    onPointerDown?: (e: PointerEvent) => void;
    onPointerMove?: (e: PointerEvent) => void;
    onPointerUp?: (e: PointerEvent) => void;
}

/**
 * Detect if device supports touch
 */
export const isTouchDevice = (): boolean => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Get distance between two points
 */
export const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Detect tap gesture (short duration, small movement)
 */
export const detectTap = (e: React.TouchEvent): boolean => {
    const touch = e.touches[0];
    const duration = e.timeStamp - (touch as any).startTime;
    const startClientX = (touch as any).startClientX;
    const startClientY = (touch as any).startClientY;
    const distance = getDistance(
        { x: startClientX, y: startClientY },
        { x: touch.clientX, y: touch.clientY }
    );

    return duration < 300 && distance < 10;
};

/**
 * Detect double-tap gesture
 */
export const detectDoubleTap = (currentTapTime: number): boolean => {
    const now = Date.now();
    return now - currentTapTime < 300;
};

/**
 * Detect long press gesture
 */
export const detectLongPress = (e: React.TouchEvent, threshold: number = 500): boolean => {
    const touch = e.touches[0];
    const duration = e.timeStamp - (touch as any).startTime;

    return duration >= threshold;
};

/**
 * Prevent default browser behaviors for touch events
 */
export const preventDefaultTouch = (e: React.TouchEvent): void => {
    e.preventDefault();
    e.stopPropagation();
};

/**
 * Get pointer position from touch or pointer event
 */
export const getPointerPosition = (
    e: React.TouchEvent | React.PointerEvent
): { x: number; y: number } => {
    if ('touches' in e) {
        const touch = (e as React.TouchEvent).touches[0];
        return { x: touch.clientX, y: touch.clientY };
    }

    return { x: (e as React.PointerEvent).clientX, y: (e as React.PointerEvent).clientY };
};

/**
 * Detect if element should be considered for touch interaction
 */
export const isTouchTarget = (element: HTMLElement): boolean => {
    const tagName = element.tagName.toLowerCase();

    return ['canvas', 'div', 'svg', 'rect', 'circle', 'ellipse'].includes(tagName);
};

/**
 * Calculate scale for pinch-to-zoom gesture
 */
export const calculatePinchScale = (
    initialDistance: number,
    currentDistance: number,
    minScale: number = 0.2,
    maxScale: number = 4
): number => {
    const delta = currentDistance - initialDistance;
    const scale = 1 + delta / 300;

    return Math.max(minScale, Math.min(maxScale, scale));
};

/**
 * Create touch wrapper component props
 */
export const createTouchWrapperProps = (handlers: TouchHandlers) => {
    return {
        onTouchStart: (e: React.TouchEvent) => {
            const touch = e.touches[0];
            (touch as any).startTime = e.timeStamp;
            (touch as any).startClientX = touch.clientX;
            (touch as any).startClientY = touch.clientY;

            handlers.onTouchStart?.(e);
        },
        onTouchMove: (e: React.TouchEvent) => {
            handlers.onTouchMove?.(e);
        },
        onTouchEnd: (e: React.TouchEvent) => {
            handlers.onTouchEnd?.(e);
        },
        onPointerDown: (e: React.PointerEvent) => {
            handlers.onPointerDown?.(e);
        },
        onPointerMove: (e: React.PointerEvent) => {
            handlers.onPointerMove?.(e);
        },
        onPointerUp: (e: React.PointerEvent) => {
            handlers.onPointerUp?.(e);
        },
    };
};
