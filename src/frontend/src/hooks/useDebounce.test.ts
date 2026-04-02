import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 300));
        expect(result.current).toBe('initial');
    });

    it('should delay value updates', async () => {
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
            initialProps: { value: 'initial' },
        });

        // Update value
        rerender({ value: 'updated' });

        // Value should not be updated yet
        expect(result.current).toBe('initial');

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(299);
        });

        // Still not updated (delay is 300ms)
        expect(result.current).toBe('initial');

        // Fast-forward to 300ms
        act(() => {
            vi.advanceTimersByTime(1);
        });

        // Now it should be updated
        expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid updates', async () => {
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
            initialProps: { value: 'initial' },
        });

        // Rapid updates
        rerender({ value: 'update1' });
        rerender({ value: 'update2' });
        rerender({ value: 'update3' });

        // Fast-forward 300ms from last update
        act(() => {
            vi.advanceTimersByTime(300);
        });

        // Should be last value
        expect(result.current).toBe('update3');
    });

    it('should use default delay of 300ms', () => {
        const { result } = renderHook(() => useDebounce('test'));
        expect(result.current).toBe('test');
    });

    it('should handle different data types', () => {
        const stringResult = renderHook(() => useDebounce('test'));
        const numberResult = renderHook(() => useDebounce(42));
        const objectResult = renderHook(() => useDebounce({ key: 'value' }));
        const arrayResult = renderHook(() => useDebounce([1, 2, 3]));

        expect(stringResult.result.current).toBe('test');
        expect(numberResult.result.current).toBe(42);
        expect(objectResult.result.current).toEqual({ key: 'value' });
        expect(arrayResult.result.current).toEqual([1, 2, 3]);
    });

    it('should cleanup timeout on unmount', () => {
        const { unmount } = renderHook(() => useDebounce('test', 300));

        // Should not throw when unmounting
        expect(() => unmount()).not.toThrow();
    });
});
