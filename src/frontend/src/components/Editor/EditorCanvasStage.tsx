"use client";

import bwipjs from "bwip-js";
import Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ellipse as KonvaEllipse, Group, Image as KonvaImage, Layer, Rect, Stage, Text as KonvaText, Transformer } from "react-konva";
import { EditorRulers } from "@/components/Editor/EditorRulers";
import { computeElementSnap, GuideLine } from "@/components/Editor/editor-guides";
import { fitViewportToContainer } from "@/components/Editor/editor-actions";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { ScreenPreviewProfile, UnitConverter } from "@/lib/unit-converter";
import { EditorViewport, ImageElement, LabelElement } from "@/types/canvas";

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

    return {
        x: (frameWidth - width) / 2,
        y: (frameHeight - height) / 2,
        width,
        height,
    };
}

function ElementNode({
    element,
    x,
    y,
    width,
    height,
    selected,
    draggable,
    onSelect,
    onDragStart,
    onDragMove,
    onDragEnd,
    registerRef,
    viewport,
}: {
    element: LabelElement;
    x: number;
    y: number;
    width: number;
    height: number;
    selected: boolean;
    draggable: boolean;
    onSelect: () => void;
    onDragStart: () => void;
    onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => void;
    onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void;
    registerRef: (node: Konva.Group | null) => void;
    viewport: EditorViewport;
}) {
    const image = useElementImage(element);
    const rotation = element.rotation ?? 0;
    const strokeWidthPx = element.stroke && (element.strokeWidthMm ?? 0) > 0
        ? UnitConverter.mmToProfile(element.strokeWidthMm || 0.4, ScreenPreviewProfile, viewport.zoom)
        : 0;

    return (
        <Group
            ref={registerRef}
            x={x + width / 2}
            y={y + height / 2}
            width={width}
            height={height}
            offsetX={width / 2}
            offsetY={height / 2}
            rotation={rotation}
            draggable={draggable}
            onClick={(event) => { event.cancelBubble = true; onSelect(); }}
            onTap={(event) => { event.cancelBubble = true; onSelect(); }}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
        >
            {element.type === "text" ? (
                <KonvaText
                    width={width}
                    height={height}
                    text={element.content || "Text"}
                    fontFamily={element.font || "Arial"}
                    fontSize={UnitConverter.mmToProfile((element.fontSizePt || 12) * 0.352778, ScreenPreviewProfile, viewport.zoom)}
                    fontStyle={element.fontWeight === "bold" ? "bold" : "normal"}
                    fill={element.fill || "#0f172a"}
                    align={element.textAlign || "left"}
                    verticalAlign="middle"
                />
            ) : null}

            {element.type === "rect" ? (
                <Rect
                    width={width}
                    height={height}
                    fill={element.fill ?? undefined}
                    stroke={element.stroke ?? undefined}
                    strokeWidth={strokeWidthPx}
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
                />
            ) : null}

            {element.type === "line" ? (
                element.stroke && (element.strokeWidthMm ?? 0) > 0 ? (
                    element.lineDirection === "vertical" ? (
                        <Rect x={width / 2 - Math.max(2, width) / 2} width={Math.max(2, width)} height={height} fill={element.stroke} />
                    ) : (
                        <Rect y={height / 2 - Math.max(2, height) / 2} width={width} height={Math.max(2, height)} fill={element.stroke} />
                    )
                ) : (
                    <Rect width={width} height={height} fill="#00000000" strokeEnabled={false} />
                )
            ) : null}

            {(element.type === "barcode" || element.type === "qr") ? (
                image ? <KonvaImage image={image} width={width} height={height} /> : <Rect width={width} height={height} fill="#f8fafc" stroke="#94a3b8" dash={[4, 4]} />
            ) : null}

            {element.type === "image" ? (
                image ? (() => {
                    const placement = computeImagePlacement(element as ImageElement, width, height, image);
                    return <KonvaImage image={image} x={placement.x} y={placement.y} width={placement.width} height={placement.height} />;
                })() : <Rect width={width} height={height} fill="#dbeafe" stroke="#60a5fa" dash={[4, 4]} />
            ) : null}

            {selected ? <Rect width={width} height={height} stroke="#3b82f6" strokeWidth={1} dash={[6, 4]} listening={false} /> : null}
        </Group>
    );
}

export function EditorCanvasStage() {
    const { ref, size } = useContainerSize<HTMLDivElement>();
    const stageRef = useRef<Konva.Stage | null>(null);
    const transformerRef = useRef<Konva.Transformer | null>(null);
    const elementRefs = useRef<Record<string, Konva.Group | null>>({});
    const panStateRef = useRef<{ dragging: boolean; x: number; y: number; offsetX: number; offsetY: number }>({
        dragging: false,
        x: 0,
        y: 0,
        offsetX: 0,
        offsetY: 0,
    });
    const dragSnapshotTakenRef = useRef(false);
    const lastAutoFitRef = useRef<{ width: number; height: number; labelWidthPx: number; labelHeightPx: number } | null>(null);

    const [guides, setGuides] = useState<GuideLine[]>([]);
    const [guideHint, setGuideHint] = useState<string | null>(null);

    const model = useEditorStore((state) => state.model);
    const selectedElementId = useEditorStore((state) => state.selection.selectedElementId);
    const activeTool = useEditorStore((state) => state.ui.activeTool);
    const isSpacePanning = useEditorStore((state) => state.ui.isSpacePanning);
    const viewport = useEditorStore((state) => state.viewport);
    const setViewport = useEditorStore((state) => state.setViewport);
    const setSelectedElementId = useEditorStore((state) => state.setSelectedElementId);
    const setCanvasSize = useEditorStore((state) => state.setCanvasSize);
    const addElement = useEditorStore((state) => state.addElement);
    const updateElement = useEditorStore((state) => state.updateElement);
    const captureHistory = useEditorStore((state) => state.captureHistory);

    const labelWidthPx = UnitConverter.mmToProfile(model.dimensions.widthMm, ScreenPreviewProfile, 1);
    const labelHeightPx = UnitConverter.mmToProfile(model.dimensions.heightMm, ScreenPreviewProfile, 1);
    const scaledLabelWidth = labelWidthPx * viewport.zoom;
    const scaledLabelHeight = labelHeightPx * viewport.zoom;
    const labelX = (size.width - scaledLabelWidth) / 2 + viewport.offsetX;
    const labelY = (size.height - scaledLabelHeight) / 2 + viewport.offsetY;

    const setFitViewport = useCallback(() => {
        const next = fitViewportToContainer(labelWidthPx, labelHeightPx, size.width, size.height, FIT_PADDING);
        setViewport(next);
    }, [labelHeightPx, labelWidthPx, setViewport, size.height, size.width]);

    useEffect(() => {
        setCanvasSize(size.width, size.height);
    }, [setCanvasSize, size.height, size.width]);

    useEffect(() => {
        if (!transformerRef.current) return;
        const node = selectedElementId ? elementRefs.current[selectedElementId] : null;
        if (node) {
            transformerRef.current.nodes([node]);
        } else {
            transformerRef.current.nodes([]);
        }
        transformerRef.current.getLayer()?.batchDraw();
    }, [selectedElementId, model.elements.length]);

    useEffect(() => {
        const previous = lastAutoFitRef.current;
        const dimensionsChanged = !previous || previous.labelWidthPx !== labelWidthPx || previous.labelHeightPx !== labelHeightPx;
        const widthDelta = previous ? Math.abs(previous.width - size.width) : Number.POSITIVE_INFINITY;
        const heightDelta = previous ? Math.abs(previous.height - size.height) : Number.POSITIVE_INFINITY;
        const significantResize = widthDelta >= 24 || heightDelta >= 24;

        if (dimensionsChanged || significantResize) {
            setFitViewport();
        }

        lastAutoFitRef.current = {
            width: size.width,
            height: size.height,
            labelWidthPx,
            labelHeightPx,
        };
    }, [labelHeightPx, labelWidthPx, setFitViewport, size.height, size.width]);

    const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
        if (!event.evt.ctrlKey && !event.evt.metaKey) return;
        event.evt.preventDefault();

        const pointer = stageRef.current?.getPointerPosition();
        if (!pointer) return;

        const scaleBy = 1.05;
        const nextZoom = event.evt.deltaY > 0 ? viewport.zoom / scaleBy : viewport.zoom * scaleBy;
        const clampedZoom = Math.max(0.2, Math.min(4, nextZoom));
        const mousePointTo = {
            x: (pointer.x - labelX) / viewport.zoom,
            y: (pointer.y - labelY) / viewport.zoom,
        };

        const nextOffsetX = pointer.x - (size.width - labelWidthPx * clampedZoom) / 2 - mousePointTo.x * clampedZoom;
        const nextOffsetY = pointer.y - (size.height - labelHeightPx * clampedZoom) / 2 - mousePointTo.y * clampedZoom;
        setViewport({ zoom: clampedZoom, offsetX: nextOffsetX, offsetY: nextOffsetY });
    };

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
        if (!clickedStage && !clickedLabelSurface) {
            return;
        }

        const pointer = stageRef.current?.getPointerPosition();
        if (!pointer) return;

        const withinLabel = pointer.x >= labelX && pointer.x <= labelX + scaledLabelWidth && pointer.y >= labelY && pointer.y <= labelY + scaledLabelHeight;
        if (activeTool === "select" || !withinLabel) {
            setSelectedElementId(null);
            return;
        }

        const xMm = UnitConverter.profileToMm((pointer.x - labelX) / viewport.zoom, ScreenPreviewProfile, 1);
        const yMm = UnitConverter.profileToMm((pointer.y - labelY) / viewport.zoom, ScreenPreviewProfile, 1);
        addElement(activeTool, {
            xMm: UnitConverter.toPersisted(UnitConverter.snapToGrid(xMm, 1)),
            yMm: UnitConverter.toPersisted(UnitConverter.snapToGrid(yMm, 1)),
        });
    };

    const handleStagePointerMove = (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (!panStateRef.current.dragging) return;
        const dx = event.evt.clientX - panStateRef.current.x;
        const dy = event.evt.clientY - panStateRef.current.y;
        setViewport({
            offsetX: panStateRef.current.offsetX + dx,
            offsetY: panStateRef.current.offsetY + dy,
        });
    };

    const stopPan = () => {
        panStateRef.current = { dragging: false, x: 0, y: 0, offsetX: 0, offsetY: 0 };
    };

    const renderableElements = useMemo(() => model.elements.filter((element) => element.visible !== false), [model.elements]);

    return (
        <div ref={ref} className="relative h-full w-full overflow-hidden bg-[#0b1220]">
            <EditorRulers labelWidthMm={model.dimensions.widthMm} labelHeightMm={model.dimensions.heightMm} labelX={labelX} labelY={labelY} zoom={viewport.zoom} />
            <Stage
                ref={stageRef}
                width={size.width}
                height={size.height}
                onMouseDown={handleStagePointerDown}
                onMouseMove={handleStagePointerMove}
                onMouseUp={stopPan}
                onMouseLeave={stopPan}
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
                        fill="#ffffff"
                        cornerRadius={6}
                        shadowBlur={24}
                        shadowColor="rgba(15, 23, 42, 0.35)"
                    />
                    <Rect x={labelX} y={labelY} width={scaledLabelWidth} height={scaledLabelHeight} stroke="#cbd5e1" strokeWidth={1} listening={false} />

                    {guides.map((guide, index) => (
                        guide.orientation === "vertical" ? (
                            <Rect
                                key={`guide-v-${index}`}
                                x={labelX + UnitConverter.mmToProfile(guide.positionMm, ScreenPreviewProfile, viewport.zoom)}
                                y={labelY}
                                width={1}
                                height={scaledLabelHeight}
                                fill="#38bdf8"
                                opacity={0.8}
                                listening={false}
                            />
                        ) : (
                            <Rect
                                key={`guide-h-${index}`}
                                x={labelX}
                                y={labelY + UnitConverter.mmToProfile(guide.positionMm, ScreenPreviewProfile, viewport.zoom)}
                                width={scaledLabelWidth}
                                height={1}
                                fill="#38bdf8"
                                opacity={0.8}
                                listening={false}
                            />
                        )
                    ))}

                    {renderableElements.map((element) => {
                        const x = labelX + UnitConverter.mmToProfile(element.xMm, ScreenPreviewProfile, viewport.zoom);
                        const y = labelY + UnitConverter.mmToProfile(element.yMm, ScreenPreviewProfile, viewport.zoom);
                        const width = Math.max(4, UnitConverter.mmToProfile(element.widthMm, ScreenPreviewProfile, viewport.zoom));
                        const height = Math.max(4, UnitConverter.mmToProfile(element.heightMm, ScreenPreviewProfile, viewport.zoom));
                        const draggable = activeTool === "select" && !isSpacePanning && !element.locked;

                        return (
                            <ElementNode
                                key={element.id}
                                element={element}
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                selected={selectedElementId === element.id}
                                draggable={draggable}
                                viewport={viewport}
                                registerRef={(node) => { elementRefs.current[element.id] = node; }}
                                onSelect={() => setSelectedElementId(element.id)}
                                onDragStart={() => {
                                    if (!dragSnapshotTakenRef.current) {
                                        captureHistory();
                                        dragSnapshotTakenRef.current = true;
                                    }
                                }}
                                onDragMove={(evt) => {
                                    const current = model.elements.find((item) => item.id === element.id);
                                    if (!current) return;
                                    const proposedXmm = UnitConverter.profileToMm((evt.target.x() - width / 2 - labelX) / viewport.zoom, ScreenPreviewProfile, 1);
                                    const proposedYmm = UnitConverter.profileToMm((evt.target.y() - height / 2 - labelY) / viewport.zoom, ScreenPreviewProfile, 1);
                                    const snapResult = computeElementSnap({
                                        model,
                                        element: current,
                                        proposedXmm,
                                        proposedYmm,
                                    });
                                    const snappedX = labelX + UnitConverter.mmToProfile(snapResult.xMm, ScreenPreviewProfile, viewport.zoom) + width / 2;
                                    const snappedY = labelY + UnitConverter.mmToProfile(snapResult.yMm, ScreenPreviewProfile, viewport.zoom) + height / 2;
                                    evt.target.position({ x: snappedX, y: snappedY });
                                    setGuides(snapResult.guides);
                                    setGuideHint(snapResult.hint ?? null);
                                    updateElement(element.id, { xMm: UnitConverter.toPersisted(snapResult.xMm), yMm: UnitConverter.toPersisted(snapResult.yMm) }, { recordHistory: false });
                                }}
                                onDragEnd={(evt) => {
                                    const posX = UnitConverter.profileToMm((evt.target.x() - width / 2 - labelX) / viewport.zoom, ScreenPreviewProfile, 1);
                                    const posY = UnitConverter.profileToMm((evt.target.y() - height / 2 - labelY) / viewport.zoom, ScreenPreviewProfile, 1);
                                    updateElement(element.id, {
                                        xMm: UnitConverter.toPersisted(UnitConverter.snapToGrid(posX, 1)),
                                        yMm: UnitConverter.toPersisted(UnitConverter.snapToGrid(posY, 1)),
                                    }, { recordHistory: false });
                                    dragSnapshotTakenRef.current = false;
                                    setGuides([]);
                                    setGuideHint(null);
                                }}
                            />
                        );
                    })}

                    <Transformer
                        ref={transformerRef}
                        rotateEnabled={false}
                        enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]}
                        boundBoxFunc={(oldBox, newBox) => ({
                            ...newBox,
                            width: Math.max(8, newBox.width),
                            height: Math.max(8, newBox.height),
                        })}
                        onTransformStart={() => captureHistory()}
                        onTransformEnd={() => {
                            if (!selectedElementId) return;
                            const node = elementRefs.current[selectedElementId];
                            if (!node) return;
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            const widthMm = UnitConverter.toPersisted(UnitConverter.snapToGrid(UnitConverter.profileToMm((node.width() * scaleX) / viewport.zoom, ScreenPreviewProfile, 1), 1));
                            const heightMm = UnitConverter.toPersisted(UnitConverter.snapToGrid(UnitConverter.profileToMm((node.height() * scaleY) / viewport.zoom, ScreenPreviewProfile, 1), 1));
                            const xMm = UnitConverter.toPersisted(UnitConverter.snapToGrid(UnitConverter.profileToMm((node.x() - (node.width() * scaleX) / 2 - labelX) / viewport.zoom, ScreenPreviewProfile, 1), 1));
                            const yMm = UnitConverter.toPersisted(UnitConverter.snapToGrid(UnitConverter.profileToMm((node.y() - (node.height() * scaleY) / 2 - labelY) / viewport.zoom, ScreenPreviewProfile, 1), 1));
                            node.scaleX(1);
                            node.scaleY(1);
                            updateElement(selectedElementId, {
                                xMm: Math.max(0, xMm),
                                yMm: Math.max(0, yMm),
                                widthMm: Math.max(1, widthMm),
                                heightMm: Math.max(1, heightMm),
                            }, { recordHistory: false });
                        }}
                    />
                </Layer>
            </Stage>
            {guideHint ? (
                <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-100">
                    {guideHint}
                </div>
            ) : null}
        </div>
    );
}
