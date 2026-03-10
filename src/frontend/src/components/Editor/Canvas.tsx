"use client";

import React, { useState } from 'react';
import { CanonicalLabelModel, LabelElement } from '@/types/canvas';
import { UnitConverter, ScreenPreviewProfile } from '@/lib/unit-converter';
import { BarcodeRenderer } from './BarcodeRenderer';

interface CanvasProps {
    model: CanonicalLabelModel;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onUpdateElement: (id: string, updates: Partial<LabelElement>) => void;
    zoom: number;
}

export const Canvas: React.FC<CanvasProps> = ({ model, selectedId, onSelect, onUpdateElement, zoom }) => {
    const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragElement, setDragElement] = useState<LabelElement | null>(null);

    const canvasWidthPx = UnitConverter.mmToProfile(model.dimensions.widthMm, ScreenPreviewProfile, zoom);
    const canvasHeightPx = UnitConverter.mmToProfile(model.dimensions.heightMm, ScreenPreviewProfile, zoom);

    const handleMouseDown = (e: React.MouseEvent, element: LabelElement, mode: 'move' | 'resize' = 'move') => {
        e.stopPropagation();
        onSelect(element.id);
        setDragMode(mode);
        setDragStart({ x: e.clientX, y: e.clientY });
        setDragElement(element);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragMode || !dragElement) return;

        const dx = (e.clientX - dragStart.x) / zoom;
        const dy = (e.clientY - dragStart.y) / zoom;
        const dxMm = UnitConverter.profileToMm(dx, ScreenPreviewProfile, 1);
        const dyMm = UnitConverter.profileToMm(dy, ScreenPreviewProfile, 1);

        if (dragMode === 'move') {
            onUpdateElement(dragElement.id, {
                xMm: UnitConverter.toPersisted(dragElement.xMm + dxMm),
                yMm: UnitConverter.toPersisted(dragElement.yMm + dyMm),
            });
        } else if (dragMode === 'resize') {
            onUpdateElement(dragElement.id, {
                widthMm: UnitConverter.toPersisted(Math.max(1, dragElement.widthMm + dxMm)),
                heightMm: UnitConverter.toPersisted(Math.max(1, dragElement.heightMm + dyMm)),
            });
        }

        setDragStart({ x: e.clientX, y: e.clientY });
        setDragElement((prev) => prev ? {
            ...prev,
            xMm: dragMode === 'move' ? prev.xMm + dxMm : prev.xMm,
            yMm: dragMode === 'move' ? prev.yMm + dyMm : prev.yMm,
            widthMm: dragMode === 'resize' ? prev.widthMm + dxMm : prev.widthMm,
            heightMm: dragMode === 'resize' ? prev.heightMm + dyMm : prev.heightMm,
        } : null);
    };

    const handleMouseUp = () => {
        setDragMode(null);
        setDragElement(null);
    };

    return (
        <div
            className="relative bg-white shadow-2xl border border-gray-400 overflow-hidden mx-auto"
            style={{
                width: canvasWidthPx,
                height: canvasHeightPx,
                backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)',
                backgroundSize: `${UnitConverter.mmToProfile(5, ScreenPreviewProfile, zoom)}px ${UnitConverter.mmToProfile(5, ScreenPreviewProfile, zoom)}px`
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => onSelect(null)}
        >
            {model.elements.map((el) => {
                const left = UnitConverter.mmToProfile(el.xMm, ScreenPreviewProfile, zoom);
                const top = UnitConverter.mmToProfile(el.yMm, ScreenPreviewProfile, zoom);
                const width = UnitConverter.mmToProfile(el.widthMm, ScreenPreviewProfile, zoom);
                const height = UnitConverter.mmToProfile(el.heightMm, ScreenPreviewProfile, zoom);
                const isSelected = selectedId === el.id;

                return (
                    <div
                        key={el.id}
                        className={`absolute cursor-move select-none border-2 transition-shadow ${isSelected ? 'border-blue-500 shadow-lg z-10' : 'border-transparent hover:border-blue-200'}`}
                        style={{ left, top, width, height }}
                        onMouseDown={(e) => handleMouseDown(e, el)}
                    >
                        {/* Content Rendering */}
                        <div className="w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
                            {el.type === 'text' && (
                                <div className="w-full text-center" style={{ fontSize: `${el.fontSizePt ? el.fontSizePt * zoom : 12 * zoom}pt`, fontFamily: el.font || 'Arial' }}>
                                    {el.content}
                                </div>
                            )}
                            {el.type === 'rect' && (
                                <div className="w-full h-full" style={{ backgroundColor: el.fill || '#eee', border: `${el.strokeWidthMm ? UnitConverter.mmToProfile(el.strokeWidthMm, ScreenPreviewProfile, zoom) : 1}px solid ${el.stroke || '#000'}` }}></div>
                            )}
                            {el.type === 'line' && (
                                <div className="w-full bg-black" style={{ height: `${(el.strokeWidthMm || 0.5) * zoom}mm` }}></div>
                            )}
                            {(el.type === 'barcode' || el.type === 'qr') && (
                                <BarcodeRenderer
                                    type={el.type}
                                    barcodeType={el.barcodeType}
                                    content={el.content}
                                    widthPx={width}
                                    heightPx={height}
                                />
                            )}
                            {el.type === 'image' && (
                                <div className="w-full h-full bg-blue-50 flex items-center justify-center border border-blue-100">
                                    <span className="text-[10px] text-blue-400 font-bold">IMAGE</span>
                                </div>
                            )}
                        </div>

                        {/* Resize Handle */}
                        {isSelected && (
                            <div
                                className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize border border-white translate-x-1/2 translate-y-1/2"
                                onMouseDown={(e) => handleMouseDown(e, el, 'resize')}
                            />
                        )}

                        {/* Label Tag */}
                        {isSelected && (
                            <div className="absolute -top-6 left-0 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                {el.type} | {el.widthMm}x{el.heightMm} mm
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
