import { render, screen } from '@testing-library/react';
import { EditorCanvasStage } from './EditorCanvasStage';
import { useEditorStore } from './useEditorStore';

// Mock Konva modules
jest.mock('react-konva', () => ({
    Stage: ({ children, ...props }: any) => <div data-testid="stage" {...props}>{children}</div>,
    Layer: ({ children }: any) => <div data-testid="layer">{children}</div>,
    Rect: (props: any) => <div data-testid="rect" {...props} />,
    Group: ({ children }: any) => <div data-testid="group">{children}</div>,
    Text: (props: any) => <div data-testid="text" {...props}>{props.text}</div>,
    Image: (props: any) => <div data-testid="image" {...props} />,
    Ellipse: (props: any) => <div data-testid="ellipse" {...props} />,
    Line: (props: any) => <div data-testid="line" {...props} />,
    Transformer: () => <div data-testid="transformer" />,
    Label: ({ children }: any) => <div data-testid="label">{children}</div>,
    Tag: ({ children }: any) => <div data-testid="tag">{children}</div>,
}));

// Mock bwipjs
jest.mock('bwip-js', () => ({
    toCanvas: jest.fn(),
}));

describe('EditorCanvasStage', () => {
    const initialModel = {
        name: 'Test Template',
        dimensions: { widthMm: 100, heightMm: 150 },
        elements: [],
        version: 1,
    };

    beforeEach(() => {
        // Reset store before each test
        const { result } = renderHook(() => useEditorStore());
        act(() => {
            result.current.initialize(initialModel);
        });
    });

    it('should render canvas stage', () => {
        render(<EditorCanvasStage />);
        
        expect(screen.getByTestId('stage')).toBeInTheDocument();
    });

    it('should render layer', () => {
        render(<EditorCanvasStage />);
        
        expect(screen.getByTestId('layer')).toBeInTheDocument();
    });

    it('should render canvas surface rect', () => {
        render(<EditorCanvasStage />);
        
        expect(screen.getByTestId('rect')).toBeInTheDocument();
    });

    it('should display no elements initially', () => {
        const { result } = renderHook(() => useEditorStore());
        
        render(<EditorCanvasStage />);
        
        expect(result.current.model.elements).toHaveLength(0);
    });

    it('should handle tool selection', () => {
        const { result } = renderHook(() => useEditorStore());
        
        act(() => {
            result.current.setTool('text');
        });

        expect(result.current.ui.activeTool).toBe('text');
    });

    it('should handle viewport changes', () => {
        const { result } = renderHook(() => useEditorStore());
        
        act(() => {
            result.current.setViewport({ zoom: 2 });
        });

        expect(result.current.viewport.zoom).toBe(2);
    });

    it('should handle grid visibility', () => {
        const { result } = renderHook(() => useEditorStore());
        
        act(() => {
            result.current.setShowGrid(true);
        });

        expect(result.current.ui.showGrid).toBe(true);
    });
});
