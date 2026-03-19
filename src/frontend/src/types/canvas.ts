export type ElementType = "text" | "barcode" | "qr" | "image" | "rect" | "ellipse" | "line";
export type TextAlign = "left" | "center" | "right";
export type FontWeight = "normal" | "bold";
export type ImageFit = "contain" | "cover" | "stretch";
export type LineDirection = "horizontal" | "vertical";
export type DiscreteRotation = 0 | 90 | 180 | 270;
export type AssetSource = "upload" | "phosphor";

export interface BaseLabelElement {
    id: string;
    type: ElementType;
    name?: string;
    groupId?: string;
    groupName?: string;
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    visible?: boolean;
    locked?: boolean;
    content: string;
    rotation?: DiscreteRotation;
    font?: string;
    fontSizePt?: number;
    textAlign?: TextAlign;
    fontWeight?: FontWeight;
    fill?: string | null;
    stroke?: string | null;
    strokeWidthMm?: number;
    barcodeType?: string;
    imageFit?: ImageFit;
    lineDirection?: LineDirection;
}

export interface TextElement extends BaseLabelElement {
    type: "text";
    font?: string;
    fontSizePt?: number;
    textAlign?: TextAlign;
    fontWeight?: FontWeight;
    fill?: string | null;
}

export interface BarcodeElement extends BaseLabelElement {
    type: "barcode";
    barcodeType?: string;
}

export interface QrElement extends BaseLabelElement {
    type: "qr";
}

export interface ImageElement extends BaseLabelElement {
    type: "image";
    imageFit?: ImageFit;
    assetId?: string;
    assetSource?: AssetSource;
    assetKey?: string;
}

export interface RectElement extends BaseLabelElement {
    type: "rect";
    fill?: string | null;
    stroke?: string | null;
    strokeWidthMm?: number;
}

export interface EllipseElement extends BaseLabelElement {
    type: "ellipse";
    fill?: string | null;
    stroke?: string | null;
    strokeWidthMm?: number;
}

export interface LineElement extends BaseLabelElement {
    type: "line";
    stroke?: string | null;
    strokeWidthMm?: number;
    lineDirection?: LineDirection;
}

export type LabelElement = TextElement | BarcodeElement | QrElement | ImageElement | RectElement | EllipseElement | LineElement;

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

export interface EditorSelectionState {
    selectedElementId: string | null;
}

export interface EditorHistoryState {
    past: CanonicalLabelModel[];
    future: CanonicalLabelModel[];
}

export type EditorTool = "select" | "pan" | "text" | "rect" | "ellipse" | "line" | "barcode" | "qr" | "image";

export interface EditorViewport {
    zoom: number;
    offsetX: number;
    offsetY: number;
}

export interface VariableCatalogItem {
    key: string;
    label: string;
    description: string;
    sampleValue: string;
    supportedElementTypes: ElementType[];
}

export interface VariableCatalogResponse {
    items: VariableCatalogItem[];
}
