import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from './useEditorStore';
import { createDefaultElement } from '@/lib/editor-canonical';

describe('useEditorStore', () => {
    // Reset store before each test
    beforeEach(() => {
        const { result } = renderHook(() => useEditorStore());
        act(() => {
            result.current.initialize({
                name: 'Test Template',
                dimensions: { widthMm: 100, heightMm: 150 },
                elements: [],
                version: 1,
            });
        });
    });

    describe('Initialization', () => {
        it('should initialize with default state', () => {
            const { result } = renderHook(() => useEditorStore());
            
            expect(result.current.model).toBeDefined();
            expect(result.current.selection.selectedElementIds).toEqual([]);
            expect(result.current.history.past).toEqual([]);
            expect(result.current.history.future).toEqual([]);
            expect(result.current.viewport.zoom).toBe(1);
            expect(result.current.ui.activeTool).toBe('select');
        });

        it('should initialize with custom model', () => {
            const customModel = {
                name: 'Test Template 2',
                dimensions: { widthMm: 200, heightMm: 300 },
                elements: [],
                version: 1,
            };

            const { result } = renderHook(() => useEditorStore());
            act(() => {
                result.current.initialize(customModel as any);
            });

            expect(result.current.model.name).toBe('Test Template 2');
        });
    });

    describe('Selection Operations', () => {
        it('should select single element', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
                const elementId = result.current.model.elements[0].id;
                result.current.selectOnly(elementId);
            });

            expect(result.current.selection.selectedElementIds).toHaveLength(1);
            expect(result.current.selection.selectedElementIds[0]).toBe(result.current.model.elements[0].id);
        });

        it('should toggle element selection', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
            });
            
            const id = result.current.model.elements[0].id;
            
            act(() => {
                result.current.toggleSelectedElement(id);
            });
            
            expect(result.current.selection.selectedElementIds).toContain(id);
            
            act(() => {
                result.current.toggleSelectedElement(id);
            });
            
            expect(result.current.selection.selectedElementIds).not.toContain(id);
        });

        it('should select elements in bounds', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('rect', { xMm: 10, yMm: 10, widthMm: 20, heightMm: 20 } as any);
                result.current.addElement('rect', { xMm: 50, yMm: 50, widthMm: 20, heightMm: 20 } as any);
                result.current.addElement('rect', { xMm: 100, yMm: 100, widthMm: 20, heightMm: 20 } as any);
                result.current.selectInBounds({
                    xMm: 0,
                    yMm: 0,
                    widthMm: 60,
                    heightMm: 60
                });
            });

            expect(result.current.selection.selectedElementIds.length).toBeGreaterThanOrEqual(2);
        });

        it('should clear selection', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
                const id = result.current.model.elements[0].id;
                result.current.selectOnly(id);
                result.current.clearSelection();
            });

            expect(result.current.selection.selectedElementIds).toHaveLength(0);
        });
    });

    describe('Element CRUD Operations', () => {
        it('should add new element', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                const id = result.current.addElement('text');
                expect(id).toBeTruthy();
            });

            expect(result.current.model.elements.length).toBeGreaterThan(0);
        });

        it('should update element', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
            });
            
            const element = result.current.model.elements[0];
            
            act(() => {
                result.current.updateElement(element.id, { 
                    content: 'Updated text',
                    fontSizePt: 24 
                });
            });

            expect(result.current.model.elements[0].content).toBe('Updated text');
            expect(result.current.model.elements[0].fontSizePt).toBe(24);
        });

        it('should update multiple elements', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
                result.current.addElement('text');
                const ids = result.current.model.elements.map(e => e.id);
                result.current.selectOnly(ids);
                result.current.updateSelectedElements({ fontSizePt: 18 });
            });

            // At least one element should have fontSizePt 18
            expect(result.current.model.elements.some(e => e.fontSizePt === 18)).toBe(true);
        });

        it('should remove element', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
            });
            
            const id = result.current.model.elements[0].id;
            const initialLength = result.current.model.elements.length;
            
            act(() => {
                result.current.removeElement(id);
            });

            expect(result.current.model.elements.length).toBeLessThan(initialLength);
        });

        it('should duplicate element', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
            });
            
            const id = result.current.model.elements[0].id;
            const initialLength = result.current.model.elements.length;
            
            act(() => {
                result.current.duplicateElement(id);
            });

            expect(result.current.model.elements.length).toBeGreaterThan(initialLength);
        });
    });

    describe('History Management', () => {
        it('should capture history before state change', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
                const id = result.current.model.elements[0].id;
                result.current.updateElement(id, { content: 'First' });
            });

            expect(result.current.history.past).toHaveLength(1);
        });

        it('should undo last operation', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
                const id = result.current.model.elements[0].id;
                result.current.updateElement(id, { content: 'First' });
                result.current.updateElement(id, { content: 'Second' });
            });

            expect(result.current.model.elements[0].content).toBe('Second');
            expect(result.current.history.past).toHaveLength(2);

            act(() => {
                result.current.undo();
            });

            expect(result.current.model.elements[0].content).toBe('First');
            expect(result.current.history.past).toHaveLength(1);
            expect(result.current.history.future).toHaveLength(1);
        });

        it('should redo after undo', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
                const id = result.current.model.elements[0].id;
                result.current.updateElement(id, { content: 'First' });
                result.current.updateElement(id, { content: 'Second' });
                result.current.undo();
            });

            expect(result.current.model.elements[0].content).toBe('First');

            act(() => {
                result.current.redo();
            });

            expect(result.current.model.elements[0].content).toBe('Second');
        });

        it('should limit history to 50 entries', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
                for (let i = 0; i < 60; i++) {
                    const id = result.current.model.elements[0].id;
                    result.current.updateElement(id, { content: `Update ${i}` });
                }
            });

            expect(result.current.history.past).toHaveLength(50);
        });

        it('should restore specific history state', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text');
                const id = result.current.model.elements[0].id;
                result.current.updateElement(id, { content: 'State 1' });
                result.current.updateElement(id, { content: 'State 2' });
                result.current.updateElement(id, { content: 'State 3' });
            });

            act(() => {
                result.current.restoreHistoryState('past', 1);
            });

            expect(result.current.model.elements[0].content).toBe('State 2');
        });
    });

    describe('Group Operations', () => {
        it('should group selected elements', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('rect');
                result.current.addElement('rect');
                const ids = result.current.model.elements.map(e => e.id);
                result.current.selectOnly(ids);
                result.current.groupSelected();
            });

            expect(result.current.model.elements[0].groupId).toBeTruthy();
            expect(result.current.model.elements[1].groupId).toBe(result.current.model.elements[0].groupId);
        });

        it('should ungroup selected group', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('rect');
                result.current.addElement('rect');
                const ids = result.current.model.elements.map(e => e.id);
                result.current.selectOnly(ids);
                result.current.groupSelected();
                result.current.ungroupSelectedGroup();
            });

            expect(result.current.model.elements[0].groupId).toBeNull();
            expect(result.current.model.elements[1].groupId).toBeNull();
        });

        it('should rename selected group', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('rect');
                result.current.addElement('rect');
                const ids = result.current.model.elements.map(e => e.id);
                result.current.selectOnly(ids);
                result.current.groupSelected();
                result.current.renameSelectedGroup('My Group');
            });

            expect(result.current.model.elements[0].groupName).toBe('My Group');
        });
    });

    describe('Alignment Operations', () => {
        it('should align elements left', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('rect', { xMm: 10, widthMm: 20 } as any);
                result.current.addElement('rect', { xMm: 50, widthMm: 20 } as any);
                const ids = result.current.model.elements.map(e => e.id);
                result.current.selectOnly(ids);
                result.current.alignSelected('left');
            });

            expect(result.current.model.elements[1].xMm).toBe(10);
        });

        it('should distribute elements horizontally', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('rect', { xMm: 10, widthMm: 10, heightMm: 10, yMm: 10 } as any);
                result.current.addElement('rect', { xMm: 30, widthMm: 10, heightMm: 10, yMm: 10 } as any);
                result.current.addElement('rect', { xMm: 50, widthMm: 10, heightMm: 10, yMm: 10 } as any);
                const ids = result.current.model.elements.map(e => e.id);
                result.current.selectOnly(ids);
                result.current.distributeSelected('horizontal');
            });

            // Elements should be equally spaced
            const spacing1 = result.current.model.elements[1].xMm - (result.current.model.elements[0].xMm + 10);
            const spacing2 = result.current.model.elements[2].xMm - (result.current.model.elements[1].xMm + 10);
            expect(spacing1).toBe(spacing2);
        });

        it('should match element widths', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('rect', { widthMm: 20 } as any);
                result.current.addElement('rect', { widthMm: 40 } as any);
                const ids = result.current.model.elements.map(e => e.id);
                result.current.selectOnly(ids);
                result.current.matchSelectedSize('width');
            });

            expect(result.current.model.elements[0].widthMm).toBe(40);
        });
    });

    describe('Clipboard Operations', () => {
        it('should copy selected elements to clipboard', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text', { content: 'Test' } as any);
                result.current.selectOnly(result.current.model.elements[0].id);
                result.current.copySelected();
            });

            expect(result.current.clipboard).toHaveLength(1);
            expect(result.current.clipboard[0].content).toBe('Test');
        });

        it('should paste elements from clipboard', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addElement('text', { content: 'Test' } as any);
                result.current.selectOnly(result.current.model.elements[0].id);
                result.current.copySelected();
                result.current.clearSelection();
                result.current.pasteClipboard();
            });

            expect(result.current.model.elements).toHaveLength(2);
            expect(result.current.selection.selectedElementIds).toHaveLength(1);
        });
    });

    describe('UI State Management', () => {
        it('should set active tool', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.setTool('text');
            });

            expect(result.current.ui.activeTool).toBe('text');
        });

        it('should set viewport', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.setViewport({ zoom: 2.5, offsetX: 100, offsetY: 200 });
            });

            expect(result.current.viewport.zoom).toBe(2.5);
            expect(result.current.viewport.offsetX).toBe(100);
            expect(result.current.viewport.offsetY).toBe(200);
        });

        it('should toggle help modal', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.setHelpOpen(true);
            });

            expect(result.current.ui.isHelpOpen).toBe(true);

            act(() => {
                result.current.setHelpOpen(false);
            });

            expect(result.current.ui.isHelpOpen).toBe(false);
        });
    });

    describe('Recent Colors', () => {
        it('should add recent color', () => {
            const { result } = renderHook(() => useEditorStore());
            const newColor = '#FF0000';
            
            act(() => {
                result.current.addRecentColor(newColor);
            });

            expect(result.current.recentColors[0]).toBe(newColor.toUpperCase());
        });

        it('should limit recent colors to 12', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                for (let i = 0; i < 15; i++) {
                    result.current.addRecentColor(`#${i.toString().padStart(6, '0')}`);
                }
            });

            expect(result.current.recentColors).toHaveLength(12);
        });

        it('should move color to front when re-added', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addRecentColor('#FF0000');
                result.current.addRecentColor('#00FF00');
                result.current.addRecentColor('#0000FF');
                result.current.addRecentColor('#FF0000');
            });

            expect(result.current.recentColors[0]).toBe('#FF0000');
        });
    });

    describe('Custom Guides', () => {
        it('should add custom guide', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addCustomGuide({ orientation: 'vertical', positionMm: 50 });
            });

            expect(result.current.customGuides).toHaveLength(1);
            expect(result.current.customGuides[0].orientation).toBe('vertical');
        });

        it('should update custom guide', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addCustomGuide({ orientation: 'vertical', positionMm: 50 });
            });
            
            const id = result.current.customGuides[0].id;
            
            act(() => {
                result.current.updateCustomGuide(id, 75);
            });

            expect(result.current.customGuides[0].positionMm).toBe(75);
        });

        it('should remove custom guide', () => {
            const { result } = renderHook(() => useEditorStore());
            
            act(() => {
                result.current.addCustomGuide({ orientation: 'vertical', positionMm: 50 });
            });
            
            const id = result.current.customGuides[0].id;
            
            act(() => {
                result.current.removeCustomGuide(id);
            });

            expect(result.current.customGuides).toHaveLength(0);
        });
    });
});
