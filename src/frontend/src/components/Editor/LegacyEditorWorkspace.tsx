"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { Canvas } from "./Canvas";
import { EditorSaveResult } from "@/components/Editor/editor-save";
import { CanonicalLabelModel, EditorHistoryState, EditorSelectionState, ElementType, LabelElement } from "@/types/canvas";
import { UnitConverter } from "@/lib/unit-converter";

interface EditorWorkspaceProps {
    initialModel: CanonicalLabelModel;
    onSave: (model: CanonicalLabelModel) => Promise<EditorSaveResult>;
    previewHref?: string;
}

const TOOL_DEFS: Array<{ type: ElementType; label: string; icon: string }> = [
    { type: "text", label: "Text", icon: "T" },
    { type: "rect", label: "Rectangle", icon: "[]" },
    { type: "ellipse", label: "Oval", icon: "OV" },
    { type: "line", label: "Line", icon: "/" },
    { type: "barcode", label: "Barcode", icon: "|||" },
    { type: "qr", label: "QR", icon: "QR" },
    { type: "image", label: "Image", icon: "IMG" },
];

function normalizeDiscreteRotation(value: number): 0 | 90 | 180 | 270 {
    const rounded = Math.round(value / 90) * 90;
    const normalized = ((rounded % 360) + 360) % 360;
    return ([0, 90, 180, 270] as const).includes(normalized as 0 | 90 | 180 | 270) ? normalized as 0 | 90 | 180 | 270 : 0;
}

function cloneModel(model: CanonicalLabelModel): CanonicalLabelModel {
    return JSON.parse(JSON.stringify(model));
}

function createElement(type: ElementType): LabelElement {
    const base: LabelElement = {
        id: `elem-${uuidv4().slice(0, 8)}`,
        type,
        xMm: 8,
        yMm: 8,
        widthMm: type === "line" ? 40 : type === "text" || type === "barcode" ? 42 : 22,
        heightMm: type === "line" ? 1 : type === "text" ? 10 : type === "barcode" ? 14 : 22,
        content: type === "text" ? "New Text" : type === "barcode" ? "12345678" : type === "qr" ? "PLMS://QR" : type === "image" ? "https://" : "",
        font: "Arial",
        fontSizePt: type === "text" ? 12 : undefined,
        fill: type === "rect" || type === "ellipse" ? "#e2e8f0" : undefined,
        stroke: type === "rect" || type === "ellipse" || type === "line" ? "#0f172a" : undefined,
        strokeWidthMm: type === "line" ? 0.5 : type === "rect" || type === "ellipse" ? 0.4 : undefined,
        barcodeType: type === "barcode" ? "CODE_128" : undefined,
        rotation: 0,
    };

    return base;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({ initialModel, onSave, previewHref }) => {
    const [model, setModel] = useState<CanonicalLabelModel>(cloneModel(initialModel));
    const [selection, setSelection] = useState<EditorSelectionState>({ selectedElementId: initialModel.elements[0]?.id ?? null });
    const [history, setHistory] = useState<EditorHistoryState>({ past: [], future: [] });
    const [zoom, setZoom] = useState(1);
    const [hasChanges, setHasChanges] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [historyOpen, setHistoryOpen] = useState(true);
    const historyCaptureRef = useRef(0);

    const selectedElement = useMemo(
        () => model.elements.find((element) => element.id === selection.selectedElementId) || null,
        [model.elements, selection.selectedElementId]
    );

    const pushHistory = (previous: CanonicalLabelModel) => {
        setHistory((current) => ({
            past: [...current.past.slice(-39), cloneModel(previous)],
            future: [],
        }));
    };

    const applyModel = (nextModel: CanonicalLabelModel, options?: { recordHistory?: boolean }) => {
        setModel((current) => {
            if (options?.recordHistory !== false) {
                pushHistory(current);
            }
            return nextModel;
        });
        setHasChanges(true);
    };

    const updateElement = (id: string, updates: Partial<LabelElement>) => {
        setModel((current) => {
            const now = Date.now();
            if (now - historyCaptureRef.current > 180) {
                setHistory((existing) => ({ past: [...existing.past.slice(-39), cloneModel(current)], future: [] }));
                historyCaptureRef.current = now;
            }

            const next = cloneModel(current);
            next.elements = next.elements.map((element) => {
                if (element.id !== id) return element;
                const updated = { ...element, ...updates };
                if (snapToGrid) {
                    if (updates.xMm !== undefined) updated.xMm = UnitConverter.snapToGrid(updated.xMm, 1);
                    if (updates.yMm !== undefined) updated.yMm = UnitConverter.snapToGrid(updated.yMm, 1);
                    if (updates.widthMm !== undefined) updated.widthMm = UnitConverter.snapToGrid(updated.widthMm, 1);
                    if (updates.heightMm !== undefined) updated.heightMm = UnitConverter.snapToGrid(updated.heightMm, 1);
                }
                return updated;
            });
            return next;
        });
        setHasChanges(true);
    };

    const addElement = (type: ElementType) => {
        const element = createElement(type);
        const next = cloneModel(model);
        next.elements.push(element);
        applyModel(next);
        setSelection({ selectedElementId: element.id });
    };

    const deleteSelected = () => {
        if (!selection.selectedElementId) return;
        const next = cloneModel(model);
        next.elements = next.elements.filter((element) => element.id !== selection.selectedElementId);
        applyModel(next);
        setSelection({ selectedElementId: next.elements[0]?.id ?? null });
    };

    const duplicateSelected = () => {
        if (!selectedElement) return;
        const duplicate = {
            ...cloneModel({ ...model, elements: [selectedElement] }).elements[0],
            id: `elem-${uuidv4().slice(0, 8)}`,
            xMm: selectedElement.xMm + 3,
            yMm: selectedElement.yMm + 3,
        } as LabelElement;
        const next = cloneModel(model);
        next.elements.push(duplicate);
        applyModel(next);
        setSelection({ selectedElementId: duplicate.id });
    };

    const undo = () => {
        setHistory((current) => {
            if (current.past.length === 0) return current;
            const previous = current.past[current.past.length - 1];
            setModel(cloneModel(previous));
            setHasChanges(true);
            return {
                past: current.past.slice(0, -1),
                future: [cloneModel(model), ...current.future],
            };
        });
    };

    const redo = () => {
        setHistory((current) => {
            if (current.future.length === 0) return current;
            const [next, ...rest] = current.future;
            setModel(cloneModel(next));
            setHasChanges(true);
            return {
                past: [...current.past, cloneModel(model)],
                future: rest,
            };
        });
    };

    const save = React.useCallback(async () => {
        const result = await onSave(model);
        if (result.ok) {
            setHasChanges(false);
        }
    }, [model, onSave]);

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const meta = event.ctrlKey || event.metaKey;
            if (meta && event.key.toLowerCase() === "z" && !event.shiftKey) {
                event.preventDefault();
                undo();
                return;
            }
            if (meta && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
                event.preventDefault();
                redo();
                return;
            }
            if (meta && event.key.toLowerCase() === "d") {
                event.preventDefault();
                duplicateSelected();
                return;
            }
            if (meta && event.key.toLowerCase() === "s") {
                event.preventDefault();
                void save();
                return;
            }
            if (event.key === "Delete" || event.key === "Backspace") {
                const target = event.target as HTMLElement | null;
                if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
                event.preventDefault();
                deleteSelected();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [deleteSelected, duplicateSelected, redo, save, selectedElement, undo]);

    return (
        <div className="flex h-full flex-col bg-[#08111f] text-white">
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-6">
                <div className="flex items-center gap-5">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Unified editor</div>
                        <h2 className="text-lg font-black tracking-[-0.04em] text-white">{model.name}</h2>
                    </div>
                    <div className="hidden h-8 w-px bg-[color:var(--plms-border)] md:block" />
                    <div className="hidden md:flex md:items-center md:gap-2">
                        <ToolbarButton label="Undo" onClick={undo} disabled={history.past.length === 0} />
                        <ToolbarButton label="Redo" onClick={redo} disabled={history.future.length === 0} />
                        <ToolbarButton label="Duplicate" onClick={duplicateSelected} disabled={!selectedElement} />
                        <ToolbarButton label="Delete" onClick={deleteSelected} disabled={!selectedElement} />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)] md:block">
                        {model.dimensions.widthMm} x {model.dimensions.heightMm} mm
                    </div>
                    {previewHref ? <Link href={previewHref} className="plms-button-secondary">Preview</Link> : null}
                    <button className="plms-button-primary" onClick={() => void save()} disabled={!hasChanges}>{hasChanges ? "Save Draft" : "Saved"}</button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="hidden w-72 shrink-0 border-r border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] lg:flex lg:flex-col">
                    <div className="border-b border-[color:var(--plms-border)] p-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Components</div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {TOOL_DEFS.map((tool) => (
                                <button key={tool.type} onClick={() => addElement(tool.type)} className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-3 py-4 text-center transition-colors hover:border-blue-400/30 hover:bg-white/5">
                                    <div className="text-sm font-black text-white">{tool.icon}</div>
                                    <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{tool.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="flex items-center justify-between border-b border-[color:var(--plms-border)] px-5 py-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Layers</div>
                            <button className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300" onClick={() => setHistoryOpen((value) => !value)}>
                                {historyOpen ? "History" : "Layers"}
                            </button>
                        </div>
                        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
                            {historyOpen ? (
                                <div className="space-y-2">
                                    {model.elements.map((element) => (
                                        <button
                                            key={element.id}
                                            onClick={() => setSelection({ selectedElementId: element.id })}
                                            className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selection.selectedElementId === element.id ? "border-blue-400/30 bg-blue-500/10" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] hover:bg-white/5"}`}
                                        >
                                            <div className="text-xs font-black uppercase tracking-[0.18em] text-white">{element.type}</div>
                                            <div className="mt-1 text-[10px] font-mono text-[color:var(--plms-text-subtle)]">{element.id}</div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {history.past.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-8 text-center text-xs font-medium text-[color:var(--plms-text-subtle)]">No history yet.</div>
                                    ) : (
                                        history.past.slice().reverse().map((snapshot, index) => (
                                            <div key={`${snapshot.version}-${index}`} className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-3">
                                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white">Checkpoint {history.past.length - index}</div>
                                                <div className="mt-1 text-[10px] text-[color:var(--plms-text-subtle)]">{snapshot.elements.length} elements</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                <section className="flex min-w-0 flex-1 flex-col bg-[#0b1220]">
                    <div className="flex items-center justify-between border-b border-[color:var(--plms-border)] px-6 py-3">
                        <div className="flex items-center gap-3">
                            <ToolbarButton label="-" onClick={() => setZoom((value) => Math.max(0.2, value - 0.1))} />
                            <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">{Math.round(zoom * 100)}%</div>
                            <ToolbarButton label="+" onClick={() => setZoom((value) => Math.min(5, value + 0.1))} />
                            <label className="ml-2 flex items-center gap-2 text-xs font-medium text-[color:var(--plms-text-subtle)]">
                                <input type="checkbox" checked={snapToGrid} onChange={(event) => setSnapToGrid(event.target.checked)} />
                                Snap to 1mm grid
                            </label>
                        </div>
                        {selectedElement ? (
                            <div className="hidden rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)] md:block">
                                {selectedElement.type} | {selectedElement.xMm}mm / {selectedElement.yMm}mm
                            </div>
                        ) : null}
                    </div>
                    <div className="custom-scrollbar flex-1 overflow-auto p-8">
                        <Canvas model={model} selectedId={selection.selectedElementId} onSelect={(id) => setSelection({ selectedElementId: id })} onUpdateElement={updateElement} zoom={zoom} />
                    </div>
                </section>

                <aside className="custom-scrollbar w-80 shrink-0 overflow-y-auto border-l border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Properties</div>
                            <div className="mt-1 text-lg font-black tracking-[-0.04em] text-white">{selectedElement ? selectedElement.type.toUpperCase() : "Canvas"}</div>
                        </div>
                        {hasChanges ? <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Unsaved</span> : null}
                    </div>

                    <div className="mt-6 space-y-6">
                        {selectedElement ? (
                            <>
                                <PropertySection label="Identity">
                                    <PropertyField label="Element ID" value={selectedElement.id} readOnly mono />
                                    <PropertyField label="Type" value={selectedElement.type.toUpperCase()} readOnly />
                                </PropertySection>

                                <PropertySection label="Geometry (mm)">
                                    <div className="grid grid-cols-2 gap-3">
                                        <PropertyField label="X" type="number" value={selectedElement.xMm} onChange={(value) => updateElement(selectedElement.id, { xMm: value })} />
                                        <PropertyField label="Y" type="number" value={selectedElement.yMm} onChange={(value) => updateElement(selectedElement.id, { yMm: value })} />
                                        <PropertyField label="Width" type="number" value={selectedElement.widthMm} onChange={(value) => updateElement(selectedElement.id, { widthMm: value })} />
                                        <PropertyField label="Height" type="number" value={selectedElement.heightMm} onChange={(value) => updateElement(selectedElement.id, { heightMm: value })} />
                                    </div>
                                    <PropertyField label="Rotation" type="number" value={selectedElement.rotation || 0} onChange={(value) => updateElement(selectedElement.id, { rotation: normalizeDiscreteRotation(value) })} />
                                </PropertySection>

                                <PropertySection label={selectedElement.type === "image" ? "Image Source" : "Content"}>
                                    <textarea
                                        value={selectedElement.content}
                                        onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })}
                                        className="plms-input min-h-28"
                                    />
                                </PropertySection>

                                {selectedElement.type === "text" ? (
                                    <PropertySection label="Text Style">
                                        <PropertyField label="Font Size (pt)" type="number" value={selectedElement.fontSizePt || 12} onChange={(value) => updateElement(selectedElement.id, { fontSizePt: value })} />
                                        <SelectField label="Font Family" value={selectedElement.font || "Arial"} onChange={(value) => updateElement(selectedElement.id, { font: value })} options={["Arial", "Verdana", "Courier New", "Times New Roman"]} />
                                    </PropertySection>
                                ) : null}

                                {selectedElement.type === "barcode" ? (
                                    <PropertySection label="Barcode Settings">
                                        <SelectField label="Barcode Type" value={selectedElement.barcodeType || "CODE_128"} onChange={(value) => updateElement(selectedElement.id, { barcodeType: value })} options={["CODE_128", "CODE_39", "EAN_13"]} />
                                        <InlineNotice tone="warning" text={selectedElement.barcodeType && selectedElement.barcodeType !== "CODE_128" ? "Non-CODE_128 output may render differently in PDF preview." : "Barcode is configured for supported MVP rendering."} />
                                    </PropertySection>
                                ) : null}

                                {selectedElement.type === "qr" ? (
                                    <PropertySection label="QR Settings">
                                        <PropertyField label="Rotation" type="number" value={selectedElement.rotation || 0} onChange={(value) => updateElement(selectedElement.id, { rotation: normalizeDiscreteRotation(value) })} />
                                        <InlineNotice tone="info" text={selectedElement.content.length > 120 ? "High content density may reduce scan tolerance." : "QR payload is within typical preview tolerance."} />
                                    </PropertySection>
                                ) : null}

                                {(selectedElement.type === "rect" || selectedElement.type === "ellipse" || selectedElement.type === "line") ? (
                                    <PropertySection label="Stroke & Fill">
                                        <PropertyField label="Stroke" value={selectedElement.stroke || "#0f172a"} onChange={(value) => updateElement(selectedElement.id, { stroke: value })} />
                                        {selectedElement.type === "rect" || selectedElement.type === "ellipse" ? <PropertyField label="Fill" value={selectedElement.fill || "#e2e8f0"} onChange={(value) => updateElement(selectedElement.id, { fill: value })} /> : null}
                                        <PropertyField label="Stroke Width (mm)" type="number" value={selectedElement.strokeWidthMm || 0.5} onChange={(value) => updateElement(selectedElement.id, { strokeWidthMm: value })} />
                                    </PropertySection>
                                ) : null}

                                <button className="w-full rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={deleteSelected}>
                                    Delete Element
                                </button>
                            </>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-10 text-center text-sm font-medium text-[color:var(--plms-text-subtle)]">
                                Select an element from the canvas or layer list to edit its properties.
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

function ToolbarButton({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
            {label}
        </button>
    );
}

function PropertySection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{label}</div>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

function PropertyField({ label, value, readOnly, type = "text", mono, onChange }: { label: string; value: string | number; readOnly?: boolean; type?: string; mono?: boolean; onChange?: (value: any) => void }) {
    return (
        <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{label}</label>
            <input
                type={type}
                value={value}
                readOnly={readOnly}
                onChange={(event) => onChange?.(type === "number" ? Number(event.target.value) : event.target.value)}
                className={`plms-input ${mono ? "font-mono" : ""}`}
            />
        </div>
    );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
    return (
        <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{label}</label>
            <select className="plms-select w-full" value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
        </div>
    );
}

function InlineNotice({ text, tone }: { text: string; tone: "info" | "warning" }) {
    const classes = tone === "warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
        : "border-blue-500/20 bg-blue-500/10 text-blue-200";

    return <div className={`rounded-2xl border px-3 py-3 text-xs font-medium ${classes}`}>{text}</div>;
}
