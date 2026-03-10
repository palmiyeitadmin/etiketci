"use client";

import React, { useState } from 'react';
import { Canvas } from './Canvas';
import { CanonicalLabelModel, LabelElement, ElementType } from '@/types/canvas';
import { UnitConverter } from '@/lib/unit-converter';
import { v4 as uuidv4 } from 'uuid';

interface EditorWorkspaceProps {
    initialModel: CanonicalLabelModel;
    onSave: (model: CanonicalLabelModel) => void;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({ initialModel, onSave }) => {
    const [model, setModel] = useState<CanonicalLabelModel>(initialModel);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [hasChanges, setHasChanges] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(true);

    const handleUpdateElement = (id: string, updates: Partial<LabelElement>) => {
        setModel((prev) => ({
            ...prev,
            elements: prev.elements.map((el) => {
                if (el.id !== id) return el;
                const updated = { ...el, ...updates };

                if (snapToGrid) {
                    if (updates.xMm !== undefined) updated.xMm = UnitConverter.snapToGrid(updated.xMm, 1);
                    if (updates.yMm !== undefined) updated.yMm = UnitConverter.snapToGrid(updated.yMm, 1);
                    if (updates.widthMm !== undefined) updated.widthMm = UnitConverter.snapToGrid(updated.widthMm, 1);
                    if (updates.heightMm !== undefined) updated.heightMm = UnitConverter.snapToGrid(updated.heightMm, 1);
                }

                return updated;
            }),
        }));
        setHasChanges(true);
    };

    const handleAddElement = (type: ElementType) => {
        const newElement: LabelElement = {
            id: `elem-${uuidv4().slice(0, 8)}`,
            type,
            xMm: 10,
            yMm: 10,
            widthMm: type === 'text' || type === 'barcode' ? 40 : 20,
            heightMm: type === 'text' || type === 'barcode' ? 10 : 20,
            content: type === 'text' ? 'New Text' : (type === 'barcode' ? '12345678' : 'Content'),
            fontSizePt: type === 'text' ? 12 : undefined,
        };

        setModel((prev) => ({
            ...prev,
            elements: [...prev.elements, newElement],
        }));
        setSelectedId(newElement.id);
        setHasChanges(true);
    };

    const selectedElement = model.elements.find(el => el.id === selectedId);

    return (
        <div className="flex flex-col h-full bg-gray-100 font-sans text-gray-800">
            {/* Top Bar */}
            <div className="h-14 bg-white border-b flex items-center justify-between px-6 shadow-sm z-20">
                <div className="flex items-center space-x-6">
                    <div>
                        <h2 className="font-bold text-lg">{model.name}</h2>
                        <p className="text-[10px] text-gray-500 font-mono -mt-1">{model.dimensions.widthMm} x {model.dimensions.heightMm} mm</p>
                    </div>

                    <div className="h-8 border-l mx-2"></div>

                    <div className="flex items-center space-x-2 bg-gray-50 border rounded-lg px-2 py-1">
                        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded transition-colors">-</button>
                        <span className="text-xs w-12 text-center font-bold">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded transition-colors">+</button>
                    </div>

                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input type="checkbox" checked={snapToGrid} onChange={e => setSnapToGrid(e.target.checked)} className="rounded text-blue-600" />
                        <span className="text-xs font-medium text-gray-600">Snap to 1mm Grid</span>
                    </label>
                </div>

                <div className="flex items-center space-x-4">
                    {hasChanges && (
                        <div className="flex items-center space-x-1 text-amber-600">
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-bold uppercase tracking-wider">Unsaved</span>
                        </div>
                    )}
                    <button
                        onClick={() => { onSave(model); setHasChanges(false); }}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                        disabled={!hasChanges}
                    >
                        Save Template
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Tools */}
                <div className="w-16 bg-white border-r flex flex-col items-center py-6 space-y-6 shadow-sm z-10">
                    <ToolButton onClick={() => handleAddElement('text')} icon="T" label="Text" />
                    <ToolButton onClick={() => handleAddElement('rect')} icon="[]" label="Rect" />
                    <ToolButton onClick={() => handleAddElement('line')} icon="/" label="Line" />
                    <div className="w-8 border-b"></div>
                    <ToolButton onClick={() => handleAddElement('barcode')} icon="|||" label="Barcode" />
                    <ToolButton onClick={() => handleAddElement('qr')} icon="::" label="QR" />
                    <ToolButton onClick={() => handleAddElement('image')} icon="IMG" label="Image" />
                </div>

                {/* Work Area */}
                <div className="flex-1 overflow-auto p-16 bg-gray-200 transition-all">
                    <Canvas
                        model={model}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onUpdateElement={handleUpdateElement}
                        zoom={zoom}
                    />
                </div>

                {/* Right Panel: Properties */}
                <div className="w-72 bg-white border-l shadow-sm flex flex-col z-10">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Properties</h3>
                        {selectedId && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">SELECTED</span>}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {selectedElement ? (
                            <div className="space-y-6 text-sm">
                                <PropSection label="Identity">
                                    <PropField label="ID" value={selectedElement.id} readOnly mono />
                                    <PropField label="Type" value={selectedElement.type.toUpperCase()} readOnly />
                                </PropSection>

                                <PropSection label="Geometry (mm)">
                                    <div className="grid grid-cols-2 gap-4">
                                        <PropField label="X" type="number" value={selectedElement.xMm} onChange={v => handleUpdateElement(selectedElement.id, { xMm: v })} />
                                        <PropField label="Y" type="number" value={selectedElement.yMm} onChange={v => handleUpdateElement(selectedElement.id, { yMm: v })} />
                                        <PropField label="Width" type="number" value={selectedElement.widthMm} onChange={v => handleUpdateElement(selectedElement.id, { widthMm: v })} />
                                        <PropField label="Height" type="number" value={selectedElement.heightMm} onChange={v => handleUpdateElement(selectedElement.id, { heightMm: v })} />
                                    </div>
                                </PropSection>

                                <PropSection label="Content">
                                    <textarea
                                        value={selectedElement.content}
                                        onChange={(e) => handleUpdateElement(selectedElement.id, { content: e.target.value })}
                                        className="w-full border-2 border-gray-100 focus:border-blue-500 p-2 rounded-lg h-24 text-sm transition-all focus:outline-none"
                                    />
                                    {selectedElement.type === 'image' && (
                                        <div className="mt-2 text-[10px] text-gray-500 flex items-center space-x-1">
                                            <span>ℹ️</span>
                                            <span>Content should be a URL or Base64 string.</span>
                                        </div>
                                    )}
                                </PropSection>

                                {selectedElement.type === 'text' && (
                                    <PropSection label="Text Style">
                                        <PropField
                                            label="Font Size (pt)"
                                            type="number"
                                            value={selectedElement.fontSizePt || 12}
                                            onChange={v => handleUpdateElement(selectedElement.id, { fontSizePt: v })}
                                        />
                                        <div className="mt-2">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Font Family</label>
                                            <select
                                                value={selectedElement.font || 'Arial'}
                                                onChange={(e) => handleUpdateElement(selectedElement.id, { font: e.target.value })}
                                                className="w-full border-2 border-gray-100 p-2 rounded-lg text-xs"
                                            >
                                                <option value="Arial">Arial</option>
                                                <option value="Courier">Courier</option>
                                                <option value="Times New Roman">Times New Roman</option>
                                                <option value="Verdana">Verdana</option>
                                            </select>
                                        </div>
                                    </PropSection>
                                )}

                                <div className="pt-4">
                                    <button
                                        onClick={() => {
                                            if (confirm("Delete this element?")) {
                                                setModel(prev => ({ ...prev, elements: prev.elements.filter(el => el.id !== selectedId) }));
                                                setSelectedId(null);
                                                setHasChanges(true);
                                            }
                                        }}
                                        className="w-full bg-red-50 text-red-600 py-2 rounded-lg text-xs font-bold border-2 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                                    >
                                        Delete Element
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
                                <div className="w-12 h-12 rounded-full border-4 border-dashed border-gray-200"></div>
                                <p className="italic text-center text-xs">Select an element to edit properties.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ToolButton = ({ onClick, icon, label }: { onClick: () => void, icon: string, label: string }) => (
    <button
        onClick={onClick}
        title={label}
        className="group relative w-10 h-10 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-95"
    >
        <span className="text-sm font-bold text-gray-600 group-hover:text-blue-600">{icon}</span>
        <span className="absolute left-14 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            {label}
        </span>
    </button>
);

const PropSection = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="space-y-2">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</h4>
        <div className="space-y-2">{children}</div>
    </div>
);

const PropField = ({ label, value, readOnly, type = "text", mono, onChange }: { label: string, value: any, readOnly?: boolean, type?: string, mono?: boolean, onChange?: (v: any) => void }) => (
    <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">{label}</label>
        <input
            type={type}
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange?.(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
            className={`w-full border-2 ${readOnly ? 'bg-gray-50 border-gray-100' : 'border-gray-100 focus:border-blue-500'} p-2 rounded-lg text-xs transition-all focus:outline-none ${mono ? 'font-mono' : ''}`}
        />
    </div>
);
