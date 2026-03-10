export type ElementType = 'text' | 'barcode' | 'qr' | 'image' | 'rect' | 'line';

export interface LabelElement {
    id: string;
    type: ElementType;
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    content: string;
    // Common styles
    font?: string;
    fontSizePt?: number;
    fill?: string;
    stroke?: string;
    strokeWidthMm?: number;
    // Specific properties
    barcodeType?: string;
    imageUrl?: string;
    rotation?: number;
}

export interface LabelDimensions {
    widthMm: number;
    heightMm: number;
}

export interface CanonicalLabelModel {
    version: string;
    name: string;
    dimensions: LabelDimensions;
    elements: LabelElement[];
}

export interface EditorState {
    model: CanonicalLabelModel;
    selectedElementId: string | null;
    zoom: number;
}
