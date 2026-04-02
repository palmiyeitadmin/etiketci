import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, fireEvent } from '@testing-library/react';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';
import type { Toast as ToastType } from '@/components/ui/Toast';

describe('useToast', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useToast());
        act(() => {
            result.current.clearToasts();
        });
    });

    it('should add toast to state', () => {
        const { result } = renderHook(() => useToast());
        
        act(() => {
            result.current.addToast({
                type: 'success',
                message: 'Test message',
            });
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].message).toBe('Test message');
    });

    it('should remove toast from state', () => {
        const { result } = renderHook(() => useToast());
        
        act(() => {
            result.current.addToast({
                id: 'test-toast-1',
                type: 'success',
                message: 'Toast 1',
            });
        });

        expect(result.current.toasts).toHaveLength(1);

        act(() => {
            result.current.removeToast('test-toast-1');
        });

        expect(result.current.toasts).toHaveLength(0);
    });

    it('should clear all toasts', () => {
        const { result } = renderHook(() => useToast());
        
        act(() => {
            result.current.addToast({ type: 'error', message: 'Error 1' });
            result.current.addToast({ type: 'warning', message: 'Warning 1' });
            result.current.addToast({ type: 'info', message: 'Info 1' });
            expect(result.current.toasts).toHaveLength(3);
        });

        act(() => {
            result.current.clearToasts();
        });

        expect(result.current.toasts).toHaveLength(0);
    });

    it('should auto-dismiss toast after duration', () => {
        const { result } = renderHook(() => useToast());
        
        vi.useFakeTimers();

        act(() => {
            result.current.addToast({
                type: 'success',
                message: 'Auto dismiss test',
                duration: 100,
            });
        });

        expect(result.current.toasts).toHaveLength(1);

        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(result.current.toasts).toHaveLength(0);
    });

    it('should maintain toast limit', () => {
        const { result } = renderHook(() => useToast());
        
        act(() => {
            for (let i = 0; i < 20; i++) {
                result.current.addToast({
                    id: `test-${i}`,
                    type: 'info',
                    message: `Message ${i}`,
                });
            }
        });

        expect(result.current.toasts).toHaveLength(20);

        const limit = result.current.toasts.length;
        expect(limit).toBeLessThanOrEqual(12);
    });
});

describe('Toast Component', () => {
    it('should render toast', () => {
        const toast: ToastType = {
            id: 'test-toast',
            type: 'success',
            message: 'Success message',
        };
        const onDismiss = jest.fn();

        const { container } = render(<Toast toast={toast} onDismiss={onDismiss} />);

        expect(container).toHaveTextContent('Success message');
    });

    it('should render success toast with correct colors', () => {
        const toast: ToastType = {
            id: 'test-toast',
            type: 'success',
            message: 'Success message',
        };
        const onDismiss = jest.fn();

        const { container } = render(<Toast toast={toast} onDismiss={onDismiss} />);

        const icon = container.querySelector('[class*="shrink-0"]');
        expect(icon).toHaveClass('bg-emerald-600');
        expect(icon).toHaveClass('border-emerald-500');
    });

    it('should render error toast with correct colors', () => {
        const toast: ToastType = {
            id: 'test-toast',
            type: 'error',
            message: 'Error message',
        };
        const onDismiss = jest.fn();

        const { container } = render(<Toast toast={toast} onDismiss={onDismiss} />);

        const icon = container.querySelector('[class*="shrink-0"]');
        expect(icon).toHaveClass('bg-red-600');
        expect(icon).toHaveClass('border-red-500');
    });

    it('should render warning toast with correct colors', () => {
        const toast: ToastType = {
            id: 'test-toast',
            type: 'warning',
            message: 'Warning message',
        };
        const onDismiss = jest.fn();

        const { container } = render(<Toast toast={toast} onDismiss={onDismiss} />);

        const icon = container.querySelector('[class*="shrink-0"]');
        expect(icon).toHaveClass('bg-amber-600');
        expect(icon).toHaveClass('border-amber-500');
    });

    it('should render info toast with correct colors', () => {
        const toast: ToastType = {
            id: 'test-toast',
            type: 'info',
            message: 'Info message',
        };
        const onDismiss = jest.fn();

        const { container } = render(<Toast toast={toast} onDismiss={onDismiss} />);

        const icon = container.querySelector('[class*="shrink-0"]');
        expect(icon).toHaveClass('bg-blue-600');
        expect(icon).toHaveClass('border-blue-500');
    });

    it('should call onDismiss when close button clicked', () => {
        const onDismiss = jest.fn();
        const toast: ToastType = {
            id: 'test-toast',
            type: 'success',
            message: 'Dismiss test',
        };

        const { container } = render(<Toast toast={toast} onDismiss={onDismiss} />);

        const closeButton = container.querySelectorAll('button')[1];
        fireEvent.click(closeButton);

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss when toast auto-dismisses', () => {
        vi.useFakeTimers();

        const onDismiss = jest.fn();
        const toast: ToastType = {
            id: 'test-toast',
            type: 'success',
            message: 'Auto dismiss test',
            duration: 50,
        };

        render(<Toast toast={toast} onDismiss={onDismiss} />);

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
