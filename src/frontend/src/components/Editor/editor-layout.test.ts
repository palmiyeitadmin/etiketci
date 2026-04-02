import { describe, it, expect } from 'vitest';
import { computeLayout } from '@/components/Editor/editor-layout';
import type {
    ContainerElement,
    LabelElement,
} from '@/types/canvas';

describe('editor-layout', () => {
    function createMockElement(id: string, xMm: number, yMm: number, widthMm: number, heightMm: number): LabelElement {
        return {
            id,
            type: 'text',
            xMm,
            yMm,
            widthMm,
            heightMm,
            content: 'Test',
        };
    }

    function createMockContainer(widthMm: number = 100, heightMm: number = 100): ContainerElement {
        return {
            id: 'container-1',
            type: 'container',
            xMm: 0,
            yMm: 0,
            widthMm,
            heightMm,
            content: '',
            direction: 'row',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            gap: 2,
            wrap: 'nowrap',
        };
    }

    describe('computeLayout', () => {
        it('should position single element at origin with row layout', () => {
            const container = createMockContainer(100, 100);
            const children = [createMockElement('child-1', 0, 0, 20, 20)];

            const result = computeLayout(container, children, 100, 100);

            expect(result.children).toHaveLength(1);
            expect(result.children[0].xMm).toBe(0);
            expect(result.children[0].yMm).toBe(0);
            expect(result.containerWidthMm).toBe(100); // Math.max(100, 20) = 100
            expect(result.containerHeightMm).toBe(100); // Math.max(100, 20) = 100
        });

        it('should position two elements horizontally with gap in row layout', () => {
            const container = createMockContainer(100, 100);
            const children = [
                createMockElement('child-1', 0, 0, 20, 20),
                createMockElement('child-2', 0, 0, 20, 20),
            ];

            const result = computeLayout(container, children, 100, 100);

            expect(result.children).toHaveLength(2);
            expect(result.children[0].xMm).toBe(0);
            expect(result.children[1].xMm).toBe(22); // 20 + 2 gap
            expect(result.children[0].yMm).toBe(0);
            expect(result.children[1].yMm).toBe(0);
            expect(result.containerWidthMm).toBe(100); // Math.max(100, 42) = 100
        });

        it('should position two elements vertically with gap in column layout', () => {
            const container = {
                ...createMockContainer(100, 100),
                direction: 'column' as const,
            };
            const children = [
                createMockElement('child-1', 0, 0, 20, 20),
                createMockElement('child-2', 0, 0, 20, 20),
            ];

            const result = computeLayout(container, children, 100, 100);

            expect(result.children).toHaveLength(2);
            expect(result.children[0].xMm).toBe(0);
            expect(result.children[1].xMm).toBe(0);
            expect(result.children[0].yMm).toBe(0);
            expect(result.children[1].yMm).toBe(22); // 20 + 2 gap
            expect(result.containerHeightMm).toBe(100); // Math.max(100, 42) = 100
        });



        it('should center elements vertically with align-items: center', () => {
            const container = {
                ...createMockContainer(100, 100),
                alignItems: 'center' as const,
            };
            const children = [
                createMockElement('child-1', 0, 0, 20, 20),
                createMockElement('child-2', 0, 0, 20, 40),
            ];

            const result = computeLayout(container, children, 100, 100);

            expect(result.children[0].yMm).toBe(10); // (40 - 20) / 2
            expect(result.children[1].yMm).toBe(0); // (40 - 40) / 2
            expect(result.containerHeightMm).toBe(100); // Math.max(100, 40) = 100
        });

        it('should wrap elements when wrap: wrap', () => {
            const container = {
                ...createMockContainer(50, 100),
                wrap: 'wrap' as const,
            };
            const children = [
                createMockElement('child-1', 0, 0, 25, 20),
                createMockElement('child-2', 0, 0, 25, 20),
            ];

            const result = computeLayout(container, children, 50, 100);

            expect(result.children).toHaveLength(2);
            expect(result.children[0].xMm).toBe(0);
            expect(result.children[0].yMm).toBe(0);
            expect(result.children[1].xMm).toBe(0);
            expect(result.children[1].yMm).toBe(22); // 20 + 2 gap
            expect(result.containerHeightMm).toBe(100); // Math.max(100, 42) = 100
        });

        it('should handle empty children array', () => {
            const container = createMockContainer(100, 100);
            const children: LabelElement[] = [];

            const result = computeLayout(container, children, 100, 100);

            expect(result.children).toHaveLength(0);
            expect(result.containerWidthMm).toBe(100);
            expect(result.containerHeightMm).toBe(100);
        });

        it('should space elements evenly with justify-content: space-evenly', () => {
            const container = {
                ...createMockContainer(100, 100),
                justifyContent: 'space-evenly' as const,
            };
            const children = [
                createMockElement('child-1', 0, 0, 20, 20),
                createMockElement('child-2', 0, 0, 20, 20),
            ];

            const result = computeLayout(container, children, 100, 100);

            expect(result.children).toHaveLength(2);
            expect(result.children[0].xMm).toBeGreaterThan(0);
            expect(result.children[1].xMm).toBeGreaterThan(result.children[0].xMm);
        });

        it('should handle zero gap', () => {
            const container = {
                ...createMockContainer(100, 100),
                gap: 0,
            };
            const children = [
                createMockElement('child-1', 0, 0, 20, 20),
                createMockElement('child-2', 0, 0, 20, 20),
            ];

            const result = computeLayout(container, children, 100, 100);

            expect(result.children[0].xMm).toBe(0);
            expect(result.children[1].xMm).toBe(20); // 20 + 0 gap
            expect(result.containerWidthMm).toBe(100); // Container width is not limited by children
        });
    });
});
