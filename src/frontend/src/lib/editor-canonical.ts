import { v4 as uuidv4 } from "uuid";
import {
  AssetSource,
  BarcodeElement,
  CanonicalLabelModel,
  DiscreteRotation,
  EllipseElement,
  EditorTool,
  ElementType,
  ImageElement,
  LabelElement,
  LineDirection,
  RectElement,
  TextElement,
} from "@/types/canvas";

const DEFAULT_DIMENSIONS = { widthMm: 100, heightMm: 150 };
const DEFAULT_FONT = "Arial";
const DISCRETE_ROTATIONS: DiscreteRotation[] = [0, 90, 180, 270];

const elementLabels: Record<ElementType, string> = {
  text: "Text",
  rect: "Rectangle",
  ellipse: "Oval",
  line: "Line",
  barcode: "Barcode",
  qr: "QR",
  image: "Image",
};

function clampNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeRotation(value: unknown): DiscreteRotation {
  const numeric = clampNumber(value, 0);
  return DISCRETE_ROTATIONS.includes(numeric as DiscreteRotation) ? (numeric as DiscreteRotation) : 0;
}

function asElementType(value: unknown): ElementType {
  switch (value) {
    case "text":
    case "rect":
    case "ellipse":
    case "line":
    case "barcode":
    case "qr":
    case "image":
      return value;
    default:
      return "text";
  }
}

export function cloneCanonicalModel<T>(model: T): T {
  return JSON.parse(JSON.stringify(model)) as T;
}

export function getElementDefaultName(type: ElementType, index: number): string {
  return `${elementLabels[type]} ${index}`;
}

export function createDefaultElement(type: ElementType, index: number, position?: { xMm: number; yMm: number }): LabelElement {
  const base = {
    id: `elem-${uuidv4().slice(0, 8)}`,
    type,
    name: getElementDefaultName(type, index),
    xMm: position?.xMm ?? 8,
    yMm: position?.yMm ?? 8,
    widthMm: type === "line" ? 40 : type === "text" || type === "barcode" ? 42 : 24,
    heightMm: type === "line" ? 1 : type === "text" ? 10 : type === "barcode" ? 14 : 24,
    visible: true,
    locked: false,
    content: "",
    rotation: 0 as DiscreteRotation,
  };

  switch (type) {
    case "text":
      return {
        ...base,
        type,
        content: "New Text",
        font: DEFAULT_FONT,
        fontSizePt: 12,
        textAlign: "left",
        fontWeight: "normal",
        fill: "#0f172a",
      } satisfies TextElement;
    case "barcode":
      return {
        ...base,
        type,
        content: "12345678",
        barcodeType: "CODE_128",
      } satisfies BarcodeElement;
    case "qr":
      return {
        ...base,
        type,
        content: "PLMS://QR",
      };
    case "image":
      return {
        ...base,
        type,
        content: "",
        imageFit: "contain",
        assetId: undefined,
        assetSource: undefined,
        assetKey: undefined,
      } satisfies ImageElement;
    case "rect":
      return {
        ...base,
        type,
        content: "",
        fill: "#e2e8f0",
        stroke: "#0f172a",
        strokeWidthMm: 0.4,
      } satisfies RectElement;
    case "ellipse":
      return {
        ...base,
        type,
        content: "",
        fill: "#e2e8f0",
        stroke: "#0f172a",
        strokeWidthMm: 0.4,
      } satisfies EllipseElement;
    case "line":
      return {
        ...base,
        type,
        content: "",
        stroke: "#0f172a",
        strokeWidthMm: 0.5,
        lineDirection: "horizontal" satisfies LineDirection,
      };
    default:
      return {
        ...base,
        type: "text",
        content: "New Text",
      } as LabelElement;
  }
}

export function normalizeElement(rawElement: Partial<LabelElement>, index: number): LabelElement {
  const type = asElementType(rawElement.type);
  const base = createDefaultElement(type, index + 1, {
    xMm: clampNumber(rawElement.xMm, 8),
    yMm: clampNumber(rawElement.yMm, 8),
  });

  const merged = {
    ...base,
    ...rawElement,
    type,
    name: rawElement.name || getElementDefaultName(type, index + 1),
    xMm: clampNumber(rawElement.xMm, base.xMm),
    yMm: clampNumber(rawElement.yMm, base.yMm),
    widthMm: Math.max(1, clampNumber(rawElement.widthMm, base.widthMm)),
    heightMm: Math.max(1, clampNumber(rawElement.heightMm, base.heightMm)),
    visible: rawElement.visible ?? true,
    locked: rawElement.locked ?? false,
    rotation: normalizeRotation(rawElement.rotation),
    content: typeof rawElement.content === "string" ? rawElement.content : base.content,
  } as LabelElement;

  if (merged.type === "line") {
    merged.lineDirection = merged.lineDirection ?? "horizontal";
  }

  if (merged.type === "image") {
    merged.imageFit = merged.imageFit ?? "contain";
    merged.assetId = typeof merged.assetId === "string" && merged.assetId ? merged.assetId : undefined;
    merged.assetSource = merged.assetSource === "upload" || merged.assetSource === "phosphor" ? merged.assetSource as AssetSource : undefined;
    merged.assetKey = typeof merged.assetKey === "string" && merged.assetKey ? merged.assetKey : undefined;
  }

  if (merged.type === "text") {
    merged.font = merged.font || DEFAULT_FONT;
    merged.fontSizePt = clampNumber(merged.fontSizePt, 12);
    merged.textAlign = merged.textAlign ?? "left";
    merged.fontWeight = merged.fontWeight ?? "normal";
    merged.fill = merged.fill || "#0f172a";
  }

  if (merged.type === "barcode") {
    merged.barcodeType = merged.barcodeType || "CODE_128";
  }

  if (merged.type === "rect") {
    merged.fill = merged.fill === undefined ? "#e2e8f0" : merged.fill;
    merged.stroke = merged.stroke === undefined ? "#0f172a" : merged.stroke;
    merged.strokeWidthMm = clampNumber(merged.strokeWidthMm, 0.4);
  }

  if (merged.type === "ellipse") {
    merged.fill = merged.fill === undefined ? "#e2e8f0" : merged.fill;
    merged.stroke = merged.stroke === undefined ? "#0f172a" : merged.stroke;
    merged.strokeWidthMm = clampNumber(merged.strokeWidthMm, 0.4);
  }

  if (merged.type === "line") {
    merged.stroke = merged.stroke === undefined ? "#0f172a" : merged.stroke;
    merged.strokeWidthMm = clampNumber(merged.strokeWidthMm, 0.5);
  }

  return merged;
}

export function normalizeCanonicalLabelModel(rawModel: Partial<CanonicalLabelModel> | null | undefined, fallbackName = "Untitled Template"): CanonicalLabelModel {
  const model = rawModel || {};
  const elements = Array.isArray(model.elements) ? model.elements.map((element, index) => normalizeElement(element, index)) : [];

  return {
    version: typeof model.version === "string" && model.version ? model.version : "1.0",
    name: typeof model.name === "string" && model.name ? model.name : fallbackName,
    dimensions: {
      widthMm: clampNumber(model.dimensions?.widthMm, DEFAULT_DIMENSIONS.widthMm),
      heightMm: clampNumber(model.dimensions?.heightMm, DEFAULT_DIMENSIONS.heightMm),
    },
    elements,
  };
}

export function getVisibleElements(model: CanonicalLabelModel): LabelElement[] {
  return model.elements.filter((element) => element.visible !== false);
}

export function nextElementName(model: CanonicalLabelModel, type: ElementType): string {
  const count = model.elements.filter((element) => element.type === type).length + 1;
  return getElementDefaultName(type, count);
}

export function inferToolFromElement(type: ElementType): EditorTool {
  return type;
}
