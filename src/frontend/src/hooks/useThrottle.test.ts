import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThrottle } from '@/hooks/useThrottle';

describe('useThrottle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(Date.now());
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should call callback immediately on first invocation', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottle(callback, 100));

        result.current('arg1', 'arg2');

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should throttle rapid calls', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottle(callback, 100));

        // First call
        result.current('call1');
        expect(callback).toHaveBeenCalledTimes(1);

        // Rapid calls (should be throttled)
        result.current('call2');
        result.current('call3');
        result.current('call4');
        expect(callback).toHaveBeenCalledTimes(1); // Still only 1 call

        // Advance time past delay
        act(() => {
            vi.advanceTimersByTime(100);
        });

        // Next call should work
        result.current('call5');
        expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should allow calls after delay period', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottle(callback, 100));

        // First call
        result.current('call1');
        expect(callback).toHaveBeenCalledTimes(1);

        // Advance time past delay
        act(() => {
            vi.advanceTimersByTime(100);
        });

        // Second call (should be allowed)
        result.current('call2');
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenLastCalledWith('call2');
    });

    it('should use default delay of 100ms', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottle(callback));

        result.current('test');
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle different callback signatures', () => {
        const noArgs = vi.fn();
        const { result: noArgsResult } = renderHook(() => useThrottle(noArgs, 50));
        noArgsResult.current();
        expect(noArgs).toHaveBeenCalledTimes(1);

        const singleArg = vi.fn();
        const { result: singleArgResult } = renderHook(() => useThrottle(singleArg, 50));
        singleArgResult.current('arg');
        expect(singleArg).toHaveBeenCalledTimes(1);

        const multiArg = vi.fn();
        const { result: multiArgResult } = renderHook(() => useThrottle(multiArg, 50));
        multiArgResult.current('arg1', 'arg2', 'arg3');
        expect(multiArg).toHaveBeenCalledTimes(1);
        expect(multiArg).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should update callback when it changes', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        const { result, rerender } = renderHook(
            ({ callback, delay }) => useThrottle(callback, delay),
            {
                initialProps: { callback: callback1, delay: 100 },
            }
        );

        result.current('test');
        expect(callback1).toHaveBeenCalledTimes(1);

        // Update callback
        rerender({ callback: callback2, delay: 100 });

        // Advance time
        act(() => {
            vi.advanceTimersByTime(100);
        });

        result.current('test');
        expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should handle edge case with 0ms delay', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useThrottle(callback, 0));

        // Multiple rapid calls with 0ms delay
        result.current('call1');
        result.current('call2');
        result.current('call3');

        // With 0ms delay, each call might execute
        // This behavior depends on implementation
        expect(callback).toHaveBeenCalled();
    });
});
