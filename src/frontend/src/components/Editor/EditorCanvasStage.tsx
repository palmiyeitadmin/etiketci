"use client";

import bwipjs from "bwip-js";
import Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ellipse as KonvaEllipse, Group, Image as KonvaImage, Layer, Rect, Stage, Text as KonvaText, Transformer, Label, Tag, Line } from "react-konva";
import { EditorRulers } from "@/components/Editor/EditorRulers";
import { computeSelectionBounds, getGroupMemberIds, selectionMatchesGroup, updateElementInModel } from "@/components/Editor/editor-actions";
import { fitViewportToContainer } from "@/components/Editor/editor-actions";
import { computeElementSnap, GuideLine } from "@/components/Editor/editor-guides";
import { SelectionToolbar } from "@/components/Editor/SelectionToolbar";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { cloneCanonicalModel } from "@/lib/editor-canonical";
import { EDITOR_SNAP_MM, ScreenPreviewProfile, UnitConverter } from "@/lib/unit-converter";
import { EditorViewport, ImageElement, LabelElement, EditorTool } from "@/types/canvas";
import { MeasurementLabel, computeResizeSnap } from "@/components/Editor/editor-guides";

const FIT_PADDING = 48;
const LABEL_SURFACE_NAME = "label-surface";

function getBwipBarcodeType(type?: string) {
    switch ((type || "CODE_128").toUpperCase()) {
        case "EAN_13":
            return "ean13";
        case "CODE_39":
            return "code39";
        default:
            return "code128";
    }
}

function useContainerSize<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [size, setSize] = useState({ width: 1200, height: 800 });
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const nextWidth = Math.round(entry.contentRect.width);
            const nextHeight = Math.round(entry.contentRect.height);

            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }

            frameRef.current = requestAnimationFrame(() => {
                setSize((current) => {
                    if (Math.abs(current.width - nextWidth) < 2 && Math.abs(current.height - nextHeight) < 2) {
                        return current;
                    }

                    return { width: nextWidth, height: nextHeight };
                });
            });
        });

        observer.observe(ref.current);
        return () => {
            observer.disconnect();
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    return { ref, size };
}

const imageCache = new Map<string, HTMLImageElement>();
const imagePromiseCache = new Map<string, Promise<HTMLImageElement>>();
const generatedCodeCache = new Map<string, string>();

function loadImageFromSource(source: string) {
    const cached = imageCache.get(source);
    if (cached) {
        return Promise.resolve(cached);
    }

    const pending = imagePromiseCache.get(source);
    if (pending) {
        return pending;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        const preview = new window.Image();
        preview.onload = () => {
            imageCache.set(source, preview);
            imagePromiseCache.delete(source);
            resolve(preview);
        };
        preview.onerror = () => {
            imagePromiseCache.delete(source);
            reject(new Error("Image load failed"));
        };
        preview.src = source;
    });

    imagePromiseCache.set(source, promise);
    return promise;
}

function useElementImage(element: LabelElement) {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const sourceKey = useMemo(() => {
        if (element.type === "image") {
            return element.content || "";
        }

        if ((element.type === "barcode" || element.type === "qr") && element.content) {
            return `${element.type}:${element.barcodeType || ""}:${element.content}`;
        }

        return "";
    }, [element.barcodeType, element.content, element.type]);

    useEffect(() => {
        let disposed = false;

        async function load() {
            if (typeof window === "undefined") return;

            if ((element.type === "barcode" || element.type === "qr") && element.content) {
                try {
                    let source = generatedCodeCache.get(sourceKey);
                    if (!source) {
                        const canvas = document.createElement("canvas");
                        await bwipjs.toCanvas(canvas, {
                            bcid: element.type === "qr" ? "qrcode" : getBwipBarcodeType(element.barcodeType),
                            text: element.content,
                            scale: 3,
                            includetext: element.type === "barcode",
                            backgroundcolor: "FFFFFF",
                        });
                        source = canvas.toDataURL("image/png");
                        generatedCodeCache.set(sourceKey, source);
                    }

                    const preview = await loadImageFromSource(source);
                    if (!disposed) setImage(preview);
                } catch {
                    if (!disposed) setImage(null);
                }
                return;
            }

            if (element.type === "image" && element.content) {
                try {
                    const preview = await loadImageFromSource(element.content);
                    if (!disposed) setImage(preview);
                } catch {
                    if (!disposed) setImage(null);
                }
                return;
            }

            if (!disposed) setImage(null);
        }

        void load();
        return () => {
            disposed = true;
        };
    }, [element.barcodeType, element.content, element.type, sourceKey]);

    return image;
}

function applyTextTransform(content: string, transform?: LabelElement["textTransform"]) {
    switch (transform) {
        case "uppercase":
            return content.toUpperCase();
        case "lowercase":
            return content.toLowerCase();
        default:
            return content;
    }
}

function computeImagePlacement(element: ImageElement, frameWidth: number, frameHeight: number, image: HTMLImageElement) {
    if (element.imageFit === "stretch") {
        return { x: 0, y: 0, width: frameWidth, height: frameHeight };
    }

    const imageRatio = image.width / image.height;
    const frameRatio = frameWidth / frameHeight;
    const cover = element.imageFit === "cover";

    let width = frameWidth;
    let height = frameHeight;

    if ((cover && imageRatio < frameRatio) || (!cover && imageRatio > frameRatio)) {
        height = frameWidth / imageRatio;
    } else {
        width = frameHeight * imageRatio;
    }

    const horizontalOffset = element.imageAlignX === "left"
        ? 0
        : element.imageAlignX === "right"
            ? frameWidth - width
            : (frameWidth - width) / 2;

    const verticalOffset = element.imageAlignY === "top"
        ? 0
        : element.imageAlignY === "bottom"
            ? frameHeight - height
            : (frameHeight - height) / 2;

    return { x: horizontalOffset, y: verticalOffset, width, height };
}

function getCommonValue<T>(values: T[]) {
    if (values.length === 0) {
        return undefined;
    }

    return values.every((value) => value === values[0]) ? values[0] : undefined;
}

function ElementNode({
    element,
    x,
    y,
    width,
    height,
    selected,
    dimmed,
    draggable,
    onSelect,
    onDoubleSelect,
    onDragStart,
    onDragMove,
    onDragEnd,
    registerRef,
    viewport,
    activeTool,
}: {
    element: LabelElement;
    x: number;
    y: number;
    width: number;
    height: number;
    selected: boolean;
    dimmed: boolean;
    draggable: boolean;
    onSelect: (event: Konva.KonvaEventObject<MouseEvent>) => void;
    onDoubleSelect: () => void;
    onDragStart: () => void;
    onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => void;
    onDragEnd: () => void;
    registerRef: (node: Konva.Group | null) => void;
    viewport: EditorViewport;
    activeTool: EditorTool;
}) {
    const image = useElementImage(element);
    const rotation = element.rotation ?? 0;
    const strokeWidthPx = element.stroke && (element.strokeWidthMm ?? 0) > 0
        ? UnitConverter.mmToProfile(element.strokeWidthMm || 0.4, ScreenPreviewProfile, viewport.zoom)
        : 0;
    const frameStrokeWidthPx = element.type === "image" && (element.frameStrokeWidthMm ?? 0) > 0
        ? UnitConverter.mmToProfile(element.frameStrokeWidthMm || 0, ScreenPreviewProfile, viewport.zoom)
        : 0;
    const cornerRadiusPx = element.type === "image" && (element.cornerRadiusMm ?? 0) > 0
        ? UnitConverter.mmToProfile(element.cornerRadiusMm || 0, ScreenPreviewProfile, viewport.zoom)
        : 0;

    return (
        <Group
            id={element.id}
            name="element-node"
            ref={registerRef}
            x={x + width / 2}
            y={y + height / 2}
            width={width}
            height={height}
            offsetX={width / 2}
            offsetY={height / 2}
            opacity={element.visible === false ? 0 : (dimmed ? 0.3 : 1)}
            rotation={rotation}
            draggable={draggable}
            onClick={(event) => { if (activeTool === "select") { event.cancelBubble = true; onSelect(event); } }}
            onTap={(event) => { if (activeTool === "select") { event.cancelBubble = true; onSelect(event as unknown as Konva.KonvaEventObject<MouseEvent>); } }}
            onDblClick={(event) => { event.cancelBubble = true; onDoubleSelect(); }}
            onDblTap={(event) => { event.cancelBubble = true; onDoubleSelect(); }}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            listening={(!element.locked || selected) && element.visible !== false}
        >
            {element.type === "text" ? (
                <KonvaText
                    width={width}
                    height={height}
                    text={applyTextTransform(element.content || "", element.textTransform)}
                    fontFamily={element.font || "Arial"}
                    fontSize={UnitConverter.mmToProfile((element.fontSizePt || 12) * 0.352778, ScreenPreviewProfile, viewport.zoom)}
                    fontStyle={element.fontWeight === "bold" ? "bold" : "normal"}
                    fill={element.fill || "#0f172a"}
                    align={element.textAlign || "left"}
                    verticalAlign={element.verticalAlign || "middle"}
                    lineHeight={element.lineHeight || 1}
                    letterSpacing={UnitConverter.mmToProfile((element.letterSpacingPt || 0) * 0.352778, ScreenPreviewProfile, viewport.zoom)}
                    listening={false}
                />
            ) : null}

            {element.type === "rect" ? (
                <Rect 
                    width={width} 
                    height={height} 
                    fill={element.fill ?? undefined} 
                    stroke={element.stroke ?? undefined} 
                    strokeWidth={strokeWidthPx} 
                    cornerRadius={cornerRadiusPx || 4} 
                    listening={false}
                />
            ) : null}

            {element.type === "ellipse" ? (
                <KonvaEllipse
                    x={width / 2}
                    y={height / 2}
                    radiusX={width / 2}
                    radiusY={height / 2}
                    fill={element.fill ?? undefined}
                    stroke={element.stroke ?? undefined}
                    strokeWidth={strokeWidthPx}
                    listening={false}
                />
            ) : null}

            {element.type === "line" ? (
                element.stroke && (element.strokeWidthMm ?? 0) > 0 ? (
                    element.lineDirection === "vertical" ? (
                        <Rect x={width / 2 - Math.max(2, strokeWidthPx) / 2} width={Math.max(2, strokeWidthPx)} height={height} fill={element.stroke} listening={false} />
                    ) : (
                        <Rect y={height / 2 - Math.max(2, strokeWidthPx) / 2} width={width} height={Math.max(2, strokeWidthPx)} fill={element.stroke} listening={false} />
                    )
                ) : (
                    <Rect width={width} height={height} fill="transparent" strokeEnabled={false} listening={false} />
                )
            ) : null}

            {(element.type === "barcode" || element.type === "qr") ? (
                image ? (
                    <KonvaImage image={image} width={width} height={height} listening={false} />
                ) : (
                    <Rect width={width} height={height} fill="#f8fafc" stroke="#94a3b8" dash={[4, 4]} listening={false} />
                )
            ) : null}

            {element.type === "image" ? (
                <>
                    {(element.frameFill || element.frameStroke) ? (
                        <Rect
                            width={width}
                            height={height}
                            fill={element.frameFill ?? undefined}
                            stroke={element.frameStroke ?? undefined}
                            strokeWidth={frameStrokeWidthPx}
                            cornerRadius={cornerRadiusPx}
                            listening={false}
                        />
                    ) : null}
                    {image ? (() => {
                        const placement = computeImagePlacement(element as ImageElement, width, height, image);
                        return <KonvaImage image={image} x={placement.x} y={placement.y} width={placement.width} height={placement.height} cornerRadius={cornerRadiusPx} listening={false} />;
                    })() : (
                        <Rect width={width} height={height} fill="#dbeafe" stroke="#60a5fa" dash={[4, 4]} cornerRadius={cornerRadiusPx} listening={false} />
                    )}
                </>
            ) : null}

            {element.locked && (
                <Group x={width - 12} y={-12} listening={false}>
                    <Rect
                        width={20}
                        height={20}
                        fill="#f1f5f9"
                        stroke="#94a3b8"
                        strokeWidth={1}
                        cornerRadius={4}
                        shadowBlur={1}
                        shadowColor="rgba(0,0,0,0.1)"
                    />
                    <KonvaText
                        text="🔒"
                        fontSize={10}
                        x={4}
                        y={5}
                        width={12}
                        align="center"
                    />
                </Group>
            )}



            {selected ? (
                <Rect 
                    width={width} 
                    height={height} 
                    stroke="#3b82f6" 
                    strokeWidth={1} 
                    dash={[6, 4]} 
                    listening={false} 
                    cornerRadius={element.type === "image" ? cornerRadiusPx : (element.type === "rect" ? (cornerRadiusPx || 4) : 0)} 
                />
            ) : null}
        </Group>
    );
}

export function EditorCanvasStage() {
    const { ref, size } = useContainerSize<HTMLDivElement>();
    const stageRef = useRef<Konva.Stage | null>(null);
    const transformerRef = useRef<Konva.Transformer | null>(null);
    const elementRefs = useRef<Record<string, Konva.Group | null>>({});
    const panStateRef = useRef({ dragging: false, x: 0, y: 0, offsetX: 0, offsetY: 0 });
    const dragSnapshotTakenRef = useRef(false);
    const lastAutoFitRef = useRef<{ width: number; height: number; labelWidthPx: number; labelHeightPx: number } | null>(null);
    const dragSessionRef = useRef<{
        elementId: string;
        selectedIds: string[];
        positions: Record<string, { xMm: number; yMm: number }>;
    } | null>(null);

    const [guides, setGuides] = useState<GuideLine[]>([]);
    const [measurements, setMeasurements] = useState<MeasurementLabel[]>([]);
    const [guideHint, setGuideHint] = useState<string | null>(null);
    const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number; additive: boolean } | null>(null);
    const tooltipRef = useRef<Konva.Label | null>(null);

    const model = useEditorStore((state) => state.model);
    const selection = useEditorStore((state) => state.selection);
    const customGuides = useEditorStore((state) => state.customGuides);
    const ui = useEditorStore((state) => state.ui);
    const previewMode = useEditorStore((state) => state.ui.previewMode);
    const activeTool = useEditorStore((state) => state.ui.activeTool);
    const isSpacePanning = useEditorStore((state) => state.ui.isSpacePanning);
    const showGrid = useEditorStore((state) => state.ui.showGrid);
    const viewport = useEditorStore((state) => state.viewport);
    const setViewport = useEditorStore((state) => state.setViewport);
    const setCanvasSize = useEditorStore((state) => state.setCanvasSize);
    const addElement = useEditorStore((state) => state.addElement);
    const applyModel = useEditorStore((state) => state.applyModel);
    const updateSelectedElements = useEditorStore((state) => state.updateSelectedElements);
    const updateElement = useEditorStore((state) => state.updateElement);
    const captureHistory = useEditorStore((state) => state.captureHistory);
    const selectOnly = useEditorStore((state) => state.selectOnly);
    const toggleSelectedElement = useEditorStore((state) => state.toggleSelectedElement);
    const storeClearSelection = useEditorStore((state) => state.clearSelection);
    const clearSelection = useCallback(() => {
        storeClearSelection();
        setGuides([]);
        setMeasurements([]);
        setGuideHint(null);
    }, [storeClearSelection]);
    const selectInBounds = useEditorStore((state) => state.selectInBounds);
    const setAlignmentReference = useEditorStore((state) => state.setAlignmentReference);
    const alignSelected = useEditorStore((state) => state.alignSelected);
    const distributeSelected = useEditorStore((state) => state.distributeSelected);
    const matchSelectedSize = useEditorStore((state) => state.matchSelectedSize);
    const reorderSelected = useEditorStore((state) => state.reorderSelected);
    const rotateSelected = useEditorStore((state) => state.rotateSelected);
    const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
    const removeSelected = useEditorStore((state) => state.removeSelected);
    const groupSelected = useEditorStore((state) => state.groupSelected);
    const ungroupSelectedGroup = useEditorStore((state) => state.ungroupSelectedGroup);
    
    const editingTextElementId = useEditorStore((state) => state.ui.editingTextElementId);
    const setEditingTextElementId = useEditorStore((state) => state.setEditingTextElementId);

    const labelWidthPx = UnitConverter.mmToProfile(model.dimensions.widthMm, ScreenPreviewProfile, 1);
    const labelHeightPx = UnitConverter.mmToProfile(model.dimensions.heightMm, ScreenPreviewProfile, 1);
    const scaledLabelWidth = labelWidthPx * viewport.zoom;
    const scaledLabelHeight = labelHeightPx * viewport.zoom;
    const labelX = (size.width - scaledLabelWidth) / 2 + viewport.offsetX;
    const labelY = (size.height - scaledLabelHeight) / 2 + viewport.offsetY;

    const selectedSet = useMemo(() => new Set(selection.selectedElementIds), [selection.selectedElementIds]);
    const selectedElements = useMemo(() => model.elements.filter((element) => selectedSet.has(element.id)), [model.elements, selectedSet]);
    const selectedGroup = useMemo(() => selectionMatchesGroup(model, selection.selectedElementIds), [model, selection.selectedElementIds]);
    const selectionBounds = useMemo(() => computeSelectionBounds(model, selection.selectedElementIds), [model, selection.selectedElementIds]);
    const primarySelectedElement = useMemo(() => {
        if (selection.selectedElementIds.length !== 1) {
            return null;
        }

        const targetId = selection.primarySelectedElementId ?? selection.selectedElementIds[0];
        return model.elements.find((element) => element.id === targetId) ?? null;
    }, [model.elements, selection.primarySelectedElementId, selection.selectedElementIds]);

    const selectionSummary = useMemo(() => {
        if (selectedGroup) {
            return `Group: ${selectedGroup.groupName}`;
        }
        if (selectedElements.length === 1) {
            return selectedElements[0].name || selectedElements[0].type;
        }
        return `${selectedElements.length} elements`;
    }, [selectedElements, selectedGroup]);

    const toolbarAnchor = useMemo(() => {
        if (selection.selectedElementIds.length === 0) {
            return null;
        }

        return {
            left: size.width / 2,
            top: size.height - 32,
            placement: "bottom",
        } as const;
    }, [selection.selectedElementIds.length, size]);

    const editingElement = useMemo(() => {
        if (!editingTextElementId) return null;
        return model.elements.find((e) => e.id === editingTextElementId) ?? null;
    }, [model.elements, editingTextElementId]);

    const textStyleState = useMemo(() => {
        if (selectedElements.length === 0 || !selectedElements.every((element) => element.type === "text")) {
            return null;
        }

        return {
            fontSizePt: getCommonValue(selectedElements.map((element) => element.fontSizePt)),
            fontWeight: getCommonValue(selectedElements.map((element) => element.fontWeight)),
            textAlign: getCommonValue(selectedElements.map((element) => element.textAlign)),
            lineHeight: getCommonValue(selectedElements.map((element) => element.lineHeight)),
            letterSpacingPt: getCommonValue(selectedElements.map((element) => element.letterSpacingPt)),
            textTransform: getCommonValue(selectedElements.map((element) => element.textTransform)),
        };
    }, [selectedElements]);

    const imageStyleState = useMemo(() => {
        if (selectedElements.length === 0 || !selectedElements.every((element) => element.type === "image")) {
            return null;
        }

        return {
            imageFit: getCommonValue(selectedElements.map((element) => element.imageFit)),
            imageAlignX: getCommonValue(selectedElements.map((element) => element.imageAlignX)),
            imageAlignY: getCommonValue(selectedElements.map((element) => element.imageAlignY)),
            cornerRadiusMm: getCommonValue(selectedElements.map((element) => element.cornerRadiusMm)),
        };
    }, [selectedElements]);

    const shapeStyleState = useMemo(() => {
        if (selectedElements.length === 0 || !selectedElements.every((element) => element.type === "rect" || element.type === "ellipse" || element.type === "line")) {
            return null;
        }

        return {
            fill: getCommonValue(selectedElements.map((element) => element.fill ?? null)),
            stroke: getCommonValue(selectedElements.map((element) => element.stroke ?? null)),
            strokeWidthMm: getCommonValue(selectedElements.map((element) => element.strokeWidthMm)),
        };
    }, [selectedElements]);

    const setFitViewport = useCallback(() => {
        const next = fitViewportToContainer(labelWidthPx, labelHeightPx, size.width, size.height, FIT_PADDING);
        setViewport(next);
    }, [labelHeightPx, labelWidthPx, setViewport, size.height, size.width]);

    useEffect(() => {
        setCanvasSize(size.width, size.height);
    }, [setCanvasSize, size.height, size.width]);

    useEffect(() => {
        if (!transformerRef.current) return;
        const node = primarySelectedElement ? elementRefs.current[primarySelectedElement.id] : null;
        if (node) {
            transformerRef.current.nodes([node]);
        } else {
            transformerRef.current.nodes([]);
        }
        transformerRef.current.getLayer()?.batchDraw();
    }, [primarySelectedElement, model.elements.length]);

    useEffect(() => {
        const previous = lastAutoFitRef.current;
        const dimensionsChanged = !previous || previous.labelWidthPx !== labelWidthPx || previous.labelHeightPx !== labelHeightPx;
        const widthDelta = previous ? Math.abs(previous.width - size.width) : Number.POSITIVE_INFINITY;
        const heightDelta = previous ? Math.abs(previous.height - size.height) : Number.POSITIVE_INFINITY;
        const significantResize = widthDelta >= 24 || heightDelta >= 24;

        if (dimensionsChanged || significantResize) {
            setFitViewport();
        }

        lastAutoFitRef.current = { width: size.width, height: size.height, labelWidthPx, labelHeightPx };
    }, [labelHeightPx, labelWidthPx, setFitViewport, size.height, size.width]);

    const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
        if (!event.evt.ctrlKey && !event.evt.metaKey) return;
        event.evt.preventDefault();

        const pointer = stageRef.current?.getPointerPosition();
        if (!pointer) return;

        const scaleBy = 1.05;
        const nextZoom = event.evt.deltaY > 0 ? viewport.zoom / scaleBy : viewport.zoom * scaleBy;
        const clampedZoom = Math.max(0.2, Math.min(4, nextZoom));
        const mousePointTo = { x: (pointer.x - labelX) / viewport.zoom, y: (pointer.y - labelY) / viewport.zoom };

        const nextOffsetX = pointer.x - (size.width - labelWidthPx * clampedZoom) / 2 - mousePointTo.x * clampedZoom;
        const nextOffsetY = pointer.y - (size.height - labelHeightPx * clampedZoom) / 2 - mousePointTo.y * clampedZoom;
        setViewport({ zoom: clampedZoom, offsetX: nextOffsetX, offsetY: nextOffsetY });
    };

    const stopPan = () => {
        panStateRef.current = { dragging: false, x: 0, y: 0, offsetX: 0, offsetY: 0 };
    };

    const finalizeMarquee = useCallback(() => {
        if (!marquee) return;

        const width = Math.abs(marquee.width);
        const height = Math.abs(marquee.height);
        const x = marquee.width >= 0 ? marquee.x : marquee.x + marquee.width;
        const y = marquee.height >= 0 ? marquee.y : marquee.y + marquee.height;
        setMarquee(null);

        if (width < 4 || height < 4) {
            clearSelection();
            return;
        }

        const minX = Math.max(labelX, x);
        const minY = Math.max(labelY, y);
        const maxX = Math.min(labelX + scaledLabelWidth, x + width);
        const maxY = Math.min(labelY + scaledLabelHeight, y + height);

        if (maxX <= minX || maxY <= minY) {
            clearSelection();
            return;
        }

        selectInBounds({
            xMm: UnitConverter.profileToMm((minX - labelX) / viewport.zoom, ScreenPreviewProfile, 1),
            yMm: UnitConverter.profileToMm((minY - labelY) / viewport.zoom, ScreenPreviewProfile, 1),
            widthMm: UnitConverter.profileToMm((maxX - minX) / viewport.zoom, ScreenPreviewProfile, 1),
            heightMm: UnitConverter.profileToMm((maxY - minY) / viewport.zoom, ScreenPreviewProfile, 1),
        }, { additive: marquee.additive });
    }, [clearSelection, labelX, labelY, marquee, scaledLabelHeight, scaledLabelWidth, selectInBounds, viewport.zoom]);

    const handleStagePointerDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
        const shouldPan = activeTool === "pan" || isSpacePanning || event.evt.button === 1;
        if (shouldPan) {
            panStateRef.current = {
                dragging: true,
                x: event.evt.clientX,
                y: event.evt.clientY,
                offsetX: viewport.offsetX,
                offsetY: viewport.offsetY,
            };
            return;
        }

        const clickedStage = event.target === event.target.getStage();
        const clickedLabelSurface = event.target.hasName(LABEL_SURFACE_NAME);
        if (activeTool === "select" && !clickedStage && !clickedLabelSurface) {
            return;
        }

        const pointer = stageRef.current?.getPointerPosition();
        if (!pointer) return;

        const withinLabel = pointer.x >= labelX && pointer.x <= labelX + scaledLabelWidth && pointer.y >= labelY && pointer.y <= labelY + scaledLabelHeight;
        if (!withinLabel) {
            clearSelection();
            return;
        }

        if (activeTool !== "select") {
            const xMm = UnitConverter.profileToMm((pointer.x - labelX) / viewport.zoom, ScreenPreviewProfile, 1);
            const yMm = UnitConverter.profileToMm((pointer.y - labelY) / viewport.zoom, ScreenPreviewProfile, 1);
            addElement(activeTool, {
                xMm: UnitConverter.toPersisted(UnitConverter.snapToGrid(xMm, EDITOR_SNAP_MM)),
                yMm: UnitConverter.toPersisted(UnitConverter.snapToGrid(yMm, EDITOR_SNAP_MM)),
            });
            return;
        }

        setMarquee({
            x: pointer.x,
            y: pointer.y,
            width: 0,
            height: 0,
            additive: event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey,
        });
    };

    const handleStagePointerMove = (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (panStateRef.current.dragging) {
            const dx = event.evt.clientX - panStateRef.current.x;
            const dy = event.evt.clientY - panStateRef.current.y;
            setViewport({ offsetX: panStateRef.current.offsetX + dx, offsetY: panStateRef.current.offsetY + dy });
            return;
        }

        if (!marquee) return;
        const pointer = stageRef.current?.getPointerPosition();
        if (!pointer) return;

        setMarquee((current) => current ? { ...current, width: pointer.x - current.x, height: pointer.y - current.y } : current);
    };

    const handleStagePointerUp = () => {
        stopPan();
        finalizeMarquee();
    };

    const handleElementSelect = (element: LabelElement, event: Konva.KonvaEventObject<MouseEvent>) => {
        const relatedIds = element.groupId && !selection.activeEditingGroupId ? getGroupMemberIds(model, element.groupId) : [element.id];
        const additive = event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey;

        if (selection.activeEditingGroupId && element.groupId !== selection.activeEditingGroupId) {
            return;
        }

        if (additive) {
            toggleSelectedElement(element.id, relatedIds);
            return;
        }

        selectOnly(relatedIds, { primaryId: element.id, activeEditingGroupId: selection.activeEditingGroupId ?? null });
    };

    const handleElementDoubleSelect = (element: LabelElement) => {
        if (element.type === "text") {
            setEditingTextElementId(element.id);
            return;
        }

        if (!element.groupId) {
            return;
        }

        selectOnly([element.id], { primaryId: element.id, activeEditingGroupId: element.groupId });
    };

    const handleContextMenu = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        e.evt.preventDefault();
        if (isSpacePanning || activeTool !== "select") return;

        const clickedStage = e.target === e.target.getStage();
        const clickedLabelSurface = e.target.hasName(LABEL_SURFACE_NAME);
        
        let targetId = null;
        if (!clickedStage && !clickedLabelSurface) {
            // Find the closest ancestor Group that has id
            let current = e.target as Konva.Node | null;
            while (current && current.getStage() !== current) {
                if (current.id()) {
                    targetId = current.id();
                    break;
                }
                current = current.parent;
            }
        }

        if (targetId && !selection.selectedElementIds.includes(targetId)) {
            selectOnly([targetId], { primaryId: targetId });
        } else if (clickedStage || clickedLabelSurface) {
            clearSelection();
        }

        // Schedule context menu right after state propagates, or just pull from getter
        setTimeout(() => {
            useEditorStore.getState().setContextMenu({
                x: e.evt.clientX,
                y: e.evt.clientY,
                elementIds: useEditorStore.getState().selection.selectedElementIds
            });
        }, 0);
    }, [isSpacePanning, activeTool, selection.selectedElementIds, selectOnly, clearSelection]);

    const renderableElements = useMemo(() => model.elements, [model.elements]);

    return (
        <div ref={ref} className="relative h-full w-full overflow-hidden bg-[#0b1220]">
            <EditorRulers labelWidthMm={model.dimensions.widthMm} labelHeightMm={model.dimensions.heightMm} labelX={labelX} labelY={labelY} zoom={viewport.zoom} />
            <Stage
                ref={stageRef}
                width={size.width}
                height={size.height}
                onContextMenu={handleContextMenu}
                onMouseDown={handleStagePointerDown}
                onMouseMove={handleStagePointerMove}
                onMouseUp={handleStagePointerUp}
                onMouseLeave={handleStagePointerUp}
                onWheel={handleWheel}
            >
                <Layer>
                    <Rect width={size.width} height={size.height} fill="#0b1220" />
                    <Rect
                        name={LABEL_SURFACE_NAME}
                        x={labelX}
                        y={labelY}
                        width={scaledLabelWidth}
                        height={scaledLabelHeight}
                        fill={
                            previewMode === "light" ? "#ffffff" : 
                            previewMode === "dark" ? "#1e293b" : 
                            "#ffffff"
                        }
                        cornerRadius={6}
                        shadowBlur={24}
                        shadowColor="rgba(15, 23, 42, 0.35)"
                    />
                    {previewMode === "checkerboard" && (
                        <Rect
                            x={labelX}
                            y={labelY}
                            width={scaledLabelWidth}
                            height={scaledLabelHeight}
                            fillPriority="pattern"
                            fillPatternImage={(() => {
                                const canvas = document.createElement("canvas");
                                canvas.width = 20;
                                canvas.height = 20;
                                const ctx = canvas.getContext("2d");
                                if (ctx) {
                                    ctx.fillStyle = "#eee";
                                    ctx.fillRect(0, 0, 10, 10);
                                    ctx.fillRect(10, 10, 10, 10);
                                    ctx.fillStyle = "#fff";
                                    ctx.fillRect(10, 0, 10, 10);
                                    ctx.fillRect(0, 10, 10, 10);
                                }
                                const img = new window.Image();
                                img.src = canvas.toDataURL();
                                return img;
                            })()}
                            fillPatternRepeat="repeat"
                            cornerRadius={6}
                            listening={false}
                        />
                    )}
                    <Rect x={labelX} y={labelY} width={scaledLabelWidth} height={scaledLabelHeight} stroke="#cbd5e1" strokeWidth={1} cornerRadius={6} listening={false} />
                    
                    {showGrid && (() => {
                        const gridStep = 5; // 5mm step
                        const lines = [];
                        
                        // Vertical lines
                        for (let x = gridStep; x < model.dimensions.widthMm; x += gridStep) {
                            const xPos = labelX + UnitConverter.mmToProfile(x, ScreenPreviewProfile, viewport.zoom);
                            lines.push(<Rect key={`grid-v-${x}`} x={xPos} y={labelY} width={1} height={scaledLabelHeight} fill="#cbd5e1" opacity={0.3} listening={false} />);
                        }
                        
                        // Horizontal lines
                        for (let y = gridStep; y < model.dimensions.heightMm; y += gridStep) {
                            const yPos = labelY + UnitConverter.mmToProfile(y, ScreenPreviewProfile, viewport.zoom);
                            lines.push(<Rect key={`grid-h-${y}`} x={labelX} y={yPos} width={scaledLabelWidth} height={1} fill="#cbd5e1" opacity={0.3} listening={false} />);
                        }
                        
                        return lines;
                    })()}

                    {guides.map((guide, index) => (
                        guide.orientation === "vertical" ? (
                            <Rect key={`guide-v-${index}`} x={labelX + UnitConverter.mmToProfile(guide.positionMm, ScreenPreviewProfile, viewport.zoom)} y={labelY} width={1} height={scaledLabelHeight} fill="#38bdf8" opacity={0.8} listening={false} />
                        ) : (
                            <Rect key={`guide-h-${index}`} x={labelX} y={labelY + UnitConverter.mmToProfile(guide.positionMm, ScreenPreviewProfile, viewport.zoom)} width={scaledLabelWidth} height={1} fill="#38bdf8" opacity={0.8} listening={false} />
                        )
                    ))}

                    {measurements.map((m: MeasurementLabel, index: number) => {
                        const px = labelX + UnitConverter.mmToProfile(m.xMm, ScreenPreviewProfile, viewport.zoom);
                        const py = labelY + UnitConverter.mmToProfile(m.yMm, ScreenPreviewProfile, viewport.zoom);
                        return (
                            <Group key={`meas-${index}`} x={px} y={py} listening={false}>
                                <Label>
                                    <Tag fill="#f97316" cornerRadius={4} padding={4} pointerDirection="none" />
                                    <KonvaText text={m.text} fill="#ffffff" padding={4} fontSize={10} fontFamily="Inter, sans-serif" fontStyle="bold" />
                                </Label>
                            </Group>
                        );
                    })}

                    {renderableElements.map((element) => {
                        const x = labelX + UnitConverter.mmToProfile(element.xMm, ScreenPreviewProfile, viewport.zoom);
                        const y = labelY + UnitConverter.mmToProfile(element.yMm, ScreenPreviewProfile, viewport.zoom);
                        const width = Math.max(4, UnitConverter.mmToProfile(element.widthMm, ScreenPreviewProfile, viewport.zoom));
                        const height = Math.max(4, UnitConverter.mmToProfile(element.heightMm, ScreenPreviewProfile, viewport.zoom));

                        return (
                            <ElementNode
                                key={element.id}
                                element={element}
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                selected={selectedSet.has(element.id)}
                                dimmed={Boolean(selection.activeEditingGroupId && element.groupId !== selection.activeEditingGroupId)}
                                draggable={activeTool === "select" && !isSpacePanning && element.locked !== true && selectedSet.has(element.id)}
                                activeTool={activeTool}
                                viewport={viewport}
                                registerRef={(node) => { elementRefs.current[element.id] = node; }}
                                onSelect={(evt) => handleElementSelect(element, evt)}
                                onDoubleSelect={() => handleElementDoubleSelect(element)}
                                onDragStart={() => {
                                    const movingIds = selectedSet.has(element.id) ? selection.selectedElementIds : [element.id];
                                    dragSessionRef.current = {
                                        elementId: element.id,
                                        selectedIds: movingIds,
                                        positions: Object.fromEntries(model.elements.filter((item) => movingIds.includes(item.id)).map((item) => [item.id, { xMm: item.xMm, yMm: item.yMm }])),
                                    };

                                    if (!dragSnapshotTakenRef.current) {
                                        captureHistory();
                                        dragSnapshotTakenRef.current = true;
                                    }
                                }}
                                onDragMove={(evt) => {
                                    const session = dragSessionRef.current;
                                    if (!session) return;

                                    const draggedOrigin = session.positions[element.id];
                                    if (!draggedOrigin) return;

                                    const proposedXmm = UnitConverter.profileToMm((evt.target.x() - width / 2 - labelX) / viewport.zoom, ScreenPreviewProfile, 1);
                                    const proposedYmm = UnitConverter.profileToMm((evt.target.y() - height / 2 - labelY) / viewport.zoom, ScreenPreviewProfile, 1);

                                    let deltaX = proposedXmm - draggedOrigin.xMm;
                                    let deltaY = proposedYmm - draggedOrigin.yMm;

                                    if (session.selectedIds.length === 1) {
                                        const current = model.elements.find((item) => item.id === element.id);
                                        if (!current) return;
                                        const snapResult = computeElementSnap({ model, element: current, proposedXmm, proposedYmm });
                                        deltaX = snapResult.xMm - draggedOrigin.xMm;
                                        deltaY = snapResult.yMm - draggedOrigin.yMm;
                                        evt.target.position({
                                            x: labelX + UnitConverter.mmToProfile(snapResult.xMm, ScreenPreviewProfile, viewport.zoom) + width / 2,
                                            y: labelY + UnitConverter.mmToProfile(snapResult.yMm, ScreenPreviewProfile, viewport.zoom) + height / 2,
                                        });
                                        setGuides(snapResult.guides);
                                        setMeasurements(snapResult.measurements || []);
                                        setGuideHint(snapResult.hint ?? null);
                                    } else {
                                        setGuides([]);
                                        setMeasurements([]);
                                        setGuideHint(null);
                                    }

                                    let nextModel = cloneCanonicalModel(model);
                                    let primaryElementActualX = 0;
                                    let primaryElementActualY = 0;

                                    session.selectedIds.forEach((id) => {
                                        const origin = session.positions[id];
                                        if (!origin) return;
                                        const newXMm = UnitConverter.toPersisted(origin.xMm + deltaX);
                                        const newYMm = UnitConverter.toPersisted(origin.yMm + deltaY);
                                        if (id === element.id) {
                                            primaryElementActualX = newXMm;
                                            primaryElementActualY = newYMm;
                                        }
                                        nextModel = updateElementInModel(nextModel, id, {
                                            xMm: newXMm,
                                            yMm: newYMm,
                                        });
                                    });

                                    if (tooltipRef.current) {
                                        const tooltip = tooltipRef.current;
                                        tooltip.position({
                                            x: (evt.target.x() || 0),
                                            y: (evt.target.y() || 0) - 30,
                                        });
                                        const textNode = tooltip.findOne("Text") as Konva.Text;
                                        if (textNode) {
                                            textNode.text(`X: ${primaryElementActualX.toFixed(1)} mm\nY: ${primaryElementActualY.toFixed(1)} mm`);
                                        }
                                        tooltip.visible(true);
                                    }

                                    applyModel(nextModel, { recordHistory: false });
                                }}
                                onDragEnd={() => {
                                    dragSnapshotTakenRef.current = false;
                                    dragSessionRef.current = null;
                                    setGuides([]);
                                    setMeasurements([]);
                                    setGuideHint(null);
                                    if (tooltipRef.current) {
                                        tooltipRef.current.visible(false);
                                    }
                                }}
                            />
                        );
                    })}

                    {/* Custom Guides from Rulers - show during interaction */}
                    {(guides.length > 0 || selection.selectedElementIds.length > 0) && customGuides.map((guide) => (
                        <Line
                            key={guide.id}
                            points={
                                guide.orientation === "horizontal"
                                    ? [0, labelY + UnitConverter.mmToProfile(guide.positionMm, ScreenPreviewProfile, viewport.zoom), ui.canvasSize.width, labelY + UnitConverter.mmToProfile(guide.positionMm, ScreenPreviewProfile, viewport.zoom)]
                                    : [labelX + UnitConverter.mmToProfile(guide.positionMm, ScreenPreviewProfile, viewport.zoom), 0, labelX + UnitConverter.mmToProfile(guide.positionMm, ScreenPreviewProfile, viewport.zoom), ui.canvasSize.height]
                            }
                            stroke="#38bdf8"
                            strokeWidth={1}
                            dash={[4, 4]}
                            opacity={0.5}
                            listening={false}
                        />
                    ))}

                    {selectionBounds && selection.selectedElementIds.length > 1 ? (
                        <Rect
                            x={labelX + UnitConverter.mmToProfile(selectionBounds.xMm, ScreenPreviewProfile, viewport.zoom)}
                            y={labelY + UnitConverter.mmToProfile(selectionBounds.yMm, ScreenPreviewProfile, viewport.zoom)}
                            width={UnitConverter.mmToProfile(selectionBounds.widthMm, ScreenPreviewProfile, viewport.zoom)}
                            height={UnitConverter.mmToProfile(selectionBounds.heightMm, ScreenPreviewProfile, viewport.zoom)}
                            stroke="#3b82f6"
                            strokeWidth={1}
                            dash={[8, 4]}
                            listening={false}
                        />
                    ) : null}

                    {marquee ? (
                        <Rect
                            x={marquee.width >= 0 ? marquee.x : marquee.x + marquee.width}
                            y={marquee.height >= 0 ? marquee.y : marquee.y + marquee.height}
                            width={Math.abs(marquee.width)}
                            height={Math.abs(marquee.height)}
                            fill="rgba(59,130,246,0.12)"
                            stroke="#60a5fa"
                            dash={[6, 4]}
                            listening={false}
                        />
                    ) : null}

                    <Transformer
                        ref={transformerRef}
                        rotateEnabled={false}
                        enabledAnchors={selection.selectedElementIds.length === 1 ? ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"] : []}
                        boundBoxFunc={(oldBox, newBox) => {
                            if (!primarySelectedElement || selection.selectedElementIds.length !== 1) {
                                return newBox;
                            }

                            // Determine which edge is moving based on box differences
                            const edges: ("left" | "right" | "top" | "bottom")[] = [];
                            if (Math.abs(newBox.x - oldBox.x) > 0.01) edges.push("left");
                            if (Math.abs(newBox.y - oldBox.y) > 0.01) edges.push("top");
                            if (Math.abs((newBox.x + newBox.width) - (oldBox.x + oldBox.width)) > 0.01) edges.push("right");
                            if (Math.abs((newBox.y + newBox.height) - (oldBox.y + oldBox.height)) > 0.01) edges.push("bottom");

                            if (edges.length === 0) return newBox;

                            const proposedXmm = UnitConverter.profileToMm((newBox.x - labelX) / viewport.zoom, ScreenPreviewProfile, 1);
                            const proposedYmm = UnitConverter.profileToMm((newBox.y - labelY) / viewport.zoom, ScreenPreviewProfile, 1);
                            const proposedWidthMm = UnitConverter.profileToMm(newBox.width / viewport.zoom, ScreenPreviewProfile, 1);
                            const proposedHeightMm = UnitConverter.profileToMm(newBox.height / viewport.zoom, ScreenPreviewProfile, 1);

                            const snap = computeResizeSnap({
                                model,
                                element: primarySelectedElement,
                                proposedXmm,
                                proposedYmm,
                                proposedWidthMm,
                                proposedHeightMm,
                                movingEdges: edges
                            });

                            setGuides(snap.guides);
                            setMeasurements(snap.measurements || []);
                            
                            return {
                                x: labelX + UnitConverter.mmToProfile(snap.xMm, ScreenPreviewProfile, viewport.zoom),
                                y: labelY + UnitConverter.mmToProfile(snap.yMm, ScreenPreviewProfile, viewport.zoom),
                                width: UnitConverter.mmToProfile(snap.widthMm, ScreenPreviewProfile, viewport.zoom),
                                height: UnitConverter.mmToProfile(snap.heightMm, ScreenPreviewProfile, viewport.zoom),
                                rotation: newBox.rotation
                            };
                        }}
                        onTransformStart={() => captureHistory()}
                        onTransform={() => {
                            if (!primarySelectedElement) return;
                            const node = elementRefs.current[primarySelectedElement.id];
                            if (!node) return;
                            
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            const widthMm = UnitConverter.profileToMm((node.width() * scaleX) / viewport.zoom, ScreenPreviewProfile, 1);
                            const heightMm = UnitConverter.profileToMm((node.height() * scaleY) / viewport.zoom, ScreenPreviewProfile, 1);
                            
                            if (tooltipRef.current) {
                                const tooltip = tooltipRef.current;
                                tooltip.position({
                                    x: node.x() + (node.width() * scaleX) / 2 + 10,
                                    y: node.y() - (node.height() * scaleY) / 2 - 10,
                                });
                                const textNode = tooltip.findOne("Text") as Konva.Text;
                                if (textNode) {
                                    textNode.text(`W: ${widthMm.toFixed(1)} mm\nH: ${heightMm.toFixed(1)} mm`);
                                }
                                tooltip.visible(true);
                            }
                        }}
                        onTransformEnd={() => {
                            if (!primarySelectedElement) return;
                            const node = elementRefs.current[primarySelectedElement.id];
                            if (!node) return;
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            const widthMm = UnitConverter.toPersisted(UnitConverter.snapToGrid(UnitConverter.profileToMm((node.width() * scaleX) / viewport.zoom, ScreenPreviewProfile, 1), EDITOR_SNAP_MM));
                            const heightMm = UnitConverter.toPersisted(UnitConverter.snapToGrid(UnitConverter.profileToMm((node.height() * scaleY) / viewport.zoom, ScreenPreviewProfile, 1), EDITOR_SNAP_MM));
                            const xMm = UnitConverter.toPersisted(UnitConverter.snapToGrid(UnitConverter.profileToMm((node.x() - (node.width() * scaleX) / 2 - labelX) / viewport.zoom, ScreenPreviewProfile, 1), EDITOR_SNAP_MM));
                            const yMm = UnitConverter.toPersisted(UnitConverter.snapToGrid(UnitConverter.profileToMm((node.y() - (node.height() * scaleY) / 2 - labelY) / viewport.zoom, ScreenPreviewProfile, 1), EDITOR_SNAP_MM));
                            node.scaleX(1);
                            node.scaleY(1);
                            updateElement(primarySelectedElement.id, { xMm: Math.max(0, xMm), yMm: Math.max(0, yMm), widthMm: Math.max(1, widthMm), heightMm: Math.max(1, heightMm) }, { recordHistory: false });
                            
                            setGuides([]);
                            setMeasurements([]);
                            if (tooltipRef.current) {
                                tooltipRef.current.visible(false);
                            }
                        }}
                    />

                    {/* Performance Optimized Tooltip (Ref-based) */}
                    <Label
                        ref={tooltipRef}
                        visible={false}
                        listening={false}
                        zIndex={1000}
                    >
                        <Tag 
                            fill="#1e293b" 
                            cornerRadius={4} 
                            padding={6} 
                            stroke="#475569" 
                            strokeWidth={1} 
                            shadowBlur={4} 
                            shadowColor="black" 
                            shadowOpacity={0.2} 
                        />
                        <KonvaText 
                            text="" 
                            fill="#f8fafc" 
                            padding={6} 
                            fontSize={11} 
                            fontFamily="monospace" 
                            lineHeight={1.4}
                        />
                    </Label>

                </Layer>
            </Stage>

            {toolbarAnchor && selectedElements.length > 0 ? (
                <SelectionToolbar
                    anchor={toolbarAnchor}
                    summary={selectionSummary}
                    canGroup={selection.selectedElementIds.length > 1 && !selectedGroup}
                    canUngroup={Boolean(selectedGroup)}
                    canDistribute={selectedElements.length >= 3}
                    canRotate={selectedElements.length === 1}
                    isHidden={selectedElements.every((element) => element.visible === false)}
                    isLocked={selectedElements.every((element) => element.locked === true)}
                    alignmentReference={selection.alignmentReference}
                    textStyle={textStyleState}
                    imageStyle={imageStyleState}
                    shapeStyle={shapeStyleState}
                    onSetAlignmentReference={setAlignmentReference}
                    onAlign={alignSelected}
                    onDistribute={distributeSelected}
                    onMatchSize={matchSelectedSize}
                    onReorder={reorderSelected}
                    onToggleVisibility={() => updateSelectedElements({ visible: selectedElements.every((element) => element.visible !== false) ? false : true })}
                    onToggleLock={() => updateSelectedElements({ locked: selectedElements.every((element) => element.locked === true) ? false : true })}
                    onRotateLeft={() => rotateSelected("left")}
                    onRotateRight={() => rotateSelected("right")}
                    onGroup={groupSelected}
                    onUngroup={ungroupSelectedGroup}
                    onDuplicate={duplicateSelected}
                    onDelete={removeSelected}
                    onUpdateTextStyle={(updates) => updateSelectedElements(updates)}
                    onUpdateImageStyle={(updates) => updateSelectedElements(updates)}
                    onUpdateShapeStyle={(updates) => updateSelectedElements(updates)}
                />
            ) : null}

            {guideHint ? (
                <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-100">
                    {guideHint}
                </div>
            ) : null}

            {editingElement && editingElement.type === "text" ? (() => {
                const x = labelX + UnitConverter.mmToProfile(editingElement.xMm, ScreenPreviewProfile, viewport.zoom);
                const y = labelY + UnitConverter.mmToProfile(editingElement.yMm, ScreenPreviewProfile, viewport.zoom);
                const width = UnitConverter.mmToProfile(editingElement.widthMm, ScreenPreviewProfile, viewport.zoom);
                const height = UnitConverter.mmToProfile(editingElement.heightMm, ScreenPreviewProfile, viewport.zoom);
                const fontSizePx = UnitConverter.mmToProfile((editingElement.fontSizePt || 12) * 0.352778, ScreenPreviewProfile, viewport.zoom);
                const rotation = editingElement.rotation || 0;

                return (
                    <textarea
                        autoFocus
                        defaultValue={editingElement.content || ""}
                        style={{
                            position: "absolute",
                            left: `${x + width / 2}px`,
                            top: `${y + height / 2}px`,
                            width: `${width}px`,
                            height: `${height}px`,
                            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                            fontSize: `${fontSizePx}px`,
                            fontFamily: editingElement.font || "Arial",
                            fontWeight: editingElement.fontWeight === "bold" ? "bold" : "normal",
                            color: editingElement.fill || "#0f172a",
                            textAlign: editingElement.textAlign as any || "left",
                            lineHeight: editingElement.lineHeight || 1,
                            letterSpacing: `${UnitConverter.mmToProfile((editingElement.letterSpacingPt || 0) * 0.352778, ScreenPreviewProfile, viewport.zoom)}px`,
                            background: "transparent",
                            outline: "none",
                            padding: 0,
                            margin: 0,
                            resize: "none",
                            overflow: "hidden",
                            wordWrap: "break-word",
                            border: "none",
                            boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.4)",
                            zIndex: 2000,
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                setEditingTextElementId(null);
                            } else if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                updateElement(editingElement.id, { content: e.currentTarget.value });
                                setEditingTextElementId(null);
                            }
                        }}
                        onBlur={(e) => {
                            updateElement(editingElement.id, { content: e.currentTarget.value });
                            setEditingTextElementId(null);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                    />
                );
            })() : null}
        </div>
    );
}
