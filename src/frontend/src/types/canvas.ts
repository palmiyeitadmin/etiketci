export type ElementType = "text" | "barcode" | "qr" | "image" | "rect" | "ellipse" | "line";
export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "middle" | "bottom";
export type FontWeight = "normal" | "bold";
export type TextTransform = "none" | "uppercase" | "lowercase";
export type ImageFit = "contain" | "cover" | "stretch";
export type ImageAlign = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type LineDirection = "horizontal" | "vertical";
export type DiscreteRotation = 0 | 90 | 180 | 270;
export type AssetSource = "upload" | "phosphor";
export type EditorAlignmentReference = "selection" | "canvas";

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
    verticalAlign?: VerticalAlign;
    fontWeight?: FontWeight;
    lineHeight?: number;
    letterSpacingPt?: number;
    textTransform?: TextTransform;
    fill?: string | null;
    stroke?: string | null;
    strokeWidthMm?: number;
    barcodeType?: string;
    imageFit?: ImageFit;
    cornerRadiusMm?: number;
    frameFill?: string | null;
    frameStroke?: string | null;
    frameStrokeWidthMm?: number;
    imageAlignX?: Extract<ImageAlign, "left" | "center" | "right">;
    imageAlignY?: Extract<ImageAlign, "top" | "middle" | "bottom">;
    lineDirection?: LineDirection;
}

export interface TextElement extends BaseLabelElement {
    type: "text";
    font?: string;
    fontSizePt?: number;
    textAlign?: TextAlign;
    verticalAlign?: VerticalAlign;
    fontWeight?: FontWeight;
    lineHeight?: number;
    letterSpacingPt?: number;
    textTransform?: TextTransform;
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
    cornerRadiusMm?: number;
    frameFill?: string | null;
    frameStroke?: string | null;
    frameStrokeWidthMm?: number;
    imageAlignX?: Extract<ImageAlign, "left" | "center" | "right">;
    imageAlignY?: Extract<ImageAlign, "top" | "middle" | "bottom">;
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
    selectedElementIds: string[];
    zoom: number;
}

export interface EditorSelectionState {
    selectedElementIds: string[];
    primarySelectedElementId: string | null;
    activeEditingGroupId?: string | null;
    alignmentReference: EditorAlignmentReference;
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

export interface SelectionBounds {
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
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
