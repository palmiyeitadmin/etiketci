import { renderHook, act } from '@testing-library/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { screen, fireEvent } from '@testing-library/react';

describe('useFocusTrap', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should focus first element when activated', () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <button>Button 1</button>
            <button>Button 2</button>
            <button>Button 3</button>
        `;
        document.body.appendChild(container);

        const { result } = renderHook(() => useFocusTrap(true));

        act(() => {
            (result.current as any) = container;
        });

        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBe(3);
        expect(document.activeElement).toBe(buttons[0] || null);
    });

    it('should cycle focus with Tab key', () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <button>Button 1</button>
            <button>Button 2</button>
            <button>Button 3</button>
        `;
        document.body.appendChild(container);

        const { result } = renderHook(() => useFocusTrap(true));

        act(() => {
            (result.current as any) = container;
        });

        const buttons = Array.from(container.querySelectorAll('button'));
        
        // Initial focus on first button
        buttons[0].focus();
        expect(document.activeElement).toBe(buttons[0]);

        // Press Tab to move to second button
        act(() => {
            fireEvent.keyDown(container, { key: 'Tab' });
        });

        expect(document.activeElement).toBe(buttons[1]);

        // Press Tab again to move to third button
        act(() => {
            fireEvent.keyDown(container, { key: 'Tab' });
        });

        expect(document.activeElement).toBe(buttons[2]);

        // Press Tab again to cycle back to first button
        act(() => {
            fireEvent.keyDown(container, { key: 'Tab' });
        });

        expect(document.activeElement).toBe(buttons[0]);
    });

    it('should cycle focus in reverse with Shift+Tab', () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <button>Button 1</button>
            <button>Button 2</button>
            <button>Button 3</button>
        `;
        document.body.appendChild(container);

        const { result } = renderHook(() => useFocusTrap(true));

        act(() => {
            (result.current as any) = container;
        });

        const buttons = Array.from(container.querySelectorAll('button'));
        
        // Focus on second button
        buttons[1].focus();
        expect(document.activeElement).toBe(buttons[1]);

        // Press Shift+Tab to move to first button
        act(() => {
            fireEvent.keyDown(container, { key: 'Tab', shiftKey: true });
        });

        expect(document.activeElement).toBe(buttons[0]);
    });

    it('should restore focus when deactivated', () => {
        const outsideButton = document.createElement('button');
        outsideButton.id = 'outside';
        outsideButton.textContent = 'Outside Button';
        document.body.appendChild(outsideButton);

        const container = document.createElement('div');
        container.innerHTML = `
            <button>Button 1</button>
            <button>Button 2</button>
        `;
        document.body.appendChild(container);

        outsideButton.focus();

        const { result, rerender } = renderHook(() => useFocusTrap(true, { returnFocus: true }));

        act(() => {
            (result.current as any) = container;
        });

        const buttons = Array.from(container.querySelectorAll('button'));
        buttons[0].focus();
        expect(document.activeElement).toBe(buttons[0]);

        // Deactivate trap
        rerender(false);

        // Focus should return to outside button
        expect(document.activeElement).toBe(outsideButton);
    });

    it('should call onDeactivate when Escape is pressed', () => {
        let onDeactivateCalled = false;
        const handleDeactivate = () => { onDeactivateCalled = true; };

        const container = document.createElement('div');
        container.innerHTML = `
            <button>Button 1</button>
        `;
        document.body.appendChild(container);

        const { result } = renderHook(() => useFocusTrap(true, { onDeactivate: handleDeactivate }));

        act(() => {
            (result.current as any) = container;
        });

        const buttons = container.querySelectorAll('button');
        buttons[0].focus();
        expect(document.activeElement).toBe(buttons[0]);
        expect(onDeactivateCalled).toBe(false);

        // Press Escape
        act(() => {
            fireEvent.keyDown(container, { key: 'Escape' });
        });

        expect(onDeactivateCalled).toBe(true);
    });

    it('should handle no focusable elements', () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <div>No focusable elements</div>
        `;
        document.body.appendChild(container);

        const { result } = renderHook(() => useFocusTrap(true));

        act(() => {
            (result.current as any) = container;
        });

        // Should not throw when no focusable elements
        expect(() => {
            fireEvent.keyDown(container, { key: 'Tab' });
        }).not.toThrow();
    });
});
