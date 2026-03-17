"use client";

import { ChangeEvent, useMemo } from "react";
import { EditorVariablePicker } from "@/components/Editor/EditorVariablePicker";
import { useSelectedElement } from "@/components/Editor/editor-selectors";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { ElementType } from "@/types/canvas";

const FONT_OPTIONS = ["Arial", "Verdana", "Courier New", "Times New Roman"];
const BARCODE_OPTIONS = ["CODE_128", "CODE_39", "EAN_13"];
const DEFAULT_RECT_FILL = "#e2e8f0";
const DEFAULT_SHAPE_STROKE = "#0f172a";
const DEFAULT_TEXT_COLOR = "#0f172a";

function isValidHexColor(value: string) {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function EditorInspector({ className = "" }: { className?: string }) {
    const selectedElement = useSelectedElement();
    const updateElement = useEditorStore((state) => state.updateElement);
    const inspectorMessage = useEditorStore((state) => state.ui.inspectorMessage);
    const setInspectorMessage = useEditorStore((state) => state.setInspectorMessage);

    const supportsVariables = useMemo(() => selectedElement ? [selectedElement.type].filter((type) => type === "text" || type === "barcode" || type === "qr") as ElementType[] : [], [selectedElement]);

    async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!selectedElement || !file) return;

        if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
            setInspectorMessage("Only PNG, JPEG and SVG images are supported.");
            return;
        }

        if (file.size > 500 * 1024) {
            setInspectorMessage("Embedded template images must be 500KB or smaller. Use the shared Library for larger assets.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            updateElement(selectedElement.id, { content: String(reader.result), assetId: undefined, assetSource: undefined, assetKey: undefined });
            setInspectorMessage(null);
        };
        reader.readAsDataURL(file);
    }

    function appendVariable(placeholder: string) {
        if (!selectedElement) return;
        updateElement(selectedElement.id, { content: `${selectedElement.content}${selectedElement.content ? " " : ""}${placeholder}` });
    }

    function updateFillEnabled(enabled: boolean) {
        if (!selectedElement || (selectedElement.type !== "rect" && selectedElement.type !== "ellipse")) return;
        updateElement(selectedElement.id, { fill: enabled ? (selectedElement.fill ?? DEFAULT_RECT_FILL) : null });
    }

    function updateStrokeEnabled(enabled: boolean) {
        if (!selectedElement || (selectedElement.type !== "rect" && selectedElement.type !== "ellipse" && selectedElement.type !== "line")) return;
        updateElement(selectedElement.id, enabled
            ? { stroke: selectedElement.stroke ?? DEFAULT_SHAPE_STROKE, strokeWidthMm: selectedElement.strokeWidthMm && selectedElement.strokeWidthMm > 0 ? selectedElement.strokeWidthMm : 0.4 }
            : { stroke: null, strokeWidthMm: 0 });
    }

    if (!selectedElement) {
        return (
            <aside className={`custom-scrollbar h-full min-h-0 w-full min-w-0 shrink-0 overflow-y-auto overscroll-contain border-l border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5 pr-2 pb-8 ${className}`} onWheelCapture={(event) => event.stopPropagation()}>
                <div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-10 text-center text-sm font-medium text-[color:var(--plms-text-subtle)]">
                    Select an element to edit geometry, styling and source data.
                </div>
            </aside>
        );
    }

    return (
        <aside className={`custom-scrollbar h-full min-h-0 w-full min-w-0 shrink-0 overflow-y-auto overscroll-contain border-l border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5 pr-2 pb-8 ${className}`} onWheelCapture={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Properties</div>
                    <div className="mt-1 text-lg font-black tracking-[-0.04em] text-white">{selectedElement.name || selectedElement.type}</div>
                </div>
            </div>

            {inspectorMessage ? <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-medium text-amber-200">{inspectorMessage}</div> : null}

            <div className="mt-6 space-y-6">
                <PropertySection label="Identity">
                    <PropertyField label="Name" value={selectedElement.name || ""} onChange={(value) => updateElement(selectedElement.id, { name: value }, { recordHistory: false })} />
                    <div className="grid grid-cols-2 gap-3">
                        <PropertyField label="X (mm)" type="number" value={selectedElement.xMm} onChange={(value) => updateElement(selectedElement.id, { xMm: value })} />
                        <PropertyField label="Y (mm)" type="number" value={selectedElement.yMm} onChange={(value) => updateElement(selectedElement.id, { yMm: value })} />
                        <PropertyField label="Width (mm)" type="number" value={selectedElement.widthMm} onChange={(value) => updateElement(selectedElement.id, { widthMm: Math.max(1, value) })} />
                        <PropertyField label="Height (mm)" type="number" value={selectedElement.heightMm} onChange={(value) => updateElement(selectedElement.id, { heightMm: Math.max(1, value) })} />
                    </div>
                    <RotationField value={selectedElement.rotation || 0} onChange={(value) => updateElement(selectedElement.id, { rotation: value })} />
                </PropertySection>

                {(selectedElement.type === "text" || selectedElement.type === "barcode" || selectedElement.type === "qr") ? (
                    <PropertySection label="Content">
                        <textarea className="plms-input min-h-28" value={selectedElement.content} onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })} />
                        <EditorVariablePicker supportedTypes={supportsVariables} onInsert={appendVariable} />
                    </PropertySection>
                ) : null}

                {selectedElement.type === "text" ? (
                    <PropertySection label="Text Style">
                        <SelectField label="Font Family" value={selectedElement.font || "Arial"} options={FONT_OPTIONS} onChange={(value) => updateElement(selectedElement.id, { font: value })} />
                        <div className="grid grid-cols-2 gap-3">
                            <PropertyField label="Font Size (pt)" type="number" value={selectedElement.fontSizePt || 12} onChange={(value) => updateElement(selectedElement.id, { fontSizePt: value })} />
                            <SelectField label="Weight" value={selectedElement.fontWeight || "normal"} options={["normal", "bold"]} onChange={(value) => updateElement(selectedElement.id, { fontWeight: value as "normal" | "bold" })} />
                        </div>
                        <SelectField label="Text Align" value={selectedElement.textAlign || "left"} options={["left", "center", "right"]} onChange={(value) => updateElement(selectedElement.id, { textAlign: value as "left" | "center" | "right" })} />
                        <ColorField label="Color" value={selectedElement.fill ?? DEFAULT_TEXT_COLOR} fallback={DEFAULT_TEXT_COLOR} onChange={(value) => updateElement(selectedElement.id, { fill: value })} onInvalid={(message) => setInspectorMessage(message)} />
                    </PropertySection>
                ) : null}

                {selectedElement.type === "barcode" ? (
                    <PropertySection label="Barcode Settings">
                        <SelectField label="Barcode Type" value={selectedElement.barcodeType || "CODE_128"} options={BARCODE_OPTIONS} onChange={(value) => updateElement(selectedElement.id, { barcodeType: value })} />
                        <InlineNotice tone={selectedElement.barcodeType && selectedElement.barcodeType !== "CODE_128" ? "warning" : "info"} text={selectedElement.barcodeType && selectedElement.barcodeType !== "CODE_128" ? "Non-CODE_128 output may render differently in PDF preview." : "Barcode is configured for supported MVP rendering."} />
                    </PropertySection>
                ) : null}

                {selectedElement.type === "qr" ? (
                    <PropertySection label="QR Settings">
                        <InlineNotice tone={selectedElement.content.length > 120 ? "warning" : "info"} text={selectedElement.content.length > 120 ? "High content density may reduce scan tolerance." : "QR payload is within typical preview tolerance."} />
                    </PropertySection>
                ) : null}

                {selectedElement.type === "image" ? (
                    <PropertySection label="Image Source">
                        {selectedElement.assetSource ? <InlineNotice tone="info" text={selectedElement.assetSource === "phosphor" ? `Linked Phosphor icon: ${selectedElement.assetKey || "icon"}` : `Linked shared asset: ${selectedElement.assetId || "upload"}`} /> : null}
                        <input className="plms-input file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.18em] file:text-white" type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleImageUpload} />
                        <SelectField label="Fit Mode" value={selectedElement.imageFit || "contain"} options={["contain", "cover", "stretch"]} onChange={(value) => updateElement(selectedElement.id, { imageFit: value as "contain" | "cover" | "stretch" })} />
                        <textarea className="plms-input min-h-28" value={selectedElement.content} onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })} placeholder="Image data URI will be stored here." />
                        <button className="plms-button-secondary w-full" type="button" onClick={() => updateElement(selectedElement.id, { content: "" })}>Clear Image</button>
                    </PropertySection>
                ) : null}

                {(selectedElement.type === "rect" || selectedElement.type === "ellipse" || selectedElement.type === "line") ? (
                    <PropertySection label="Stroke and Fill">
                        {selectedElement.type === "rect" || selectedElement.type === "ellipse" ? (
                            <>
                                <ToggleField label="Fill enabled" checked={selectedElement.fill != null} onChange={updateFillEnabled} />
                                <ColorField
                                    label="Fill color"
                                    value={selectedElement.fill ?? DEFAULT_RECT_FILL}
                                    fallback={DEFAULT_RECT_FILL}
                                    disabled={selectedElement.fill == null}
                                    onChange={(value) => updateElement(selectedElement.id, { fill: value })}
                                    onInvalid={(message) => setInspectorMessage(message)}
                                />
                            </>
                        ) : null}
                        <ToggleField label="Stroke enabled" checked={Boolean(selectedElement.stroke) && (selectedElement.strokeWidthMm ?? 0) > 0} onChange={updateStrokeEnabled} />
                        <ColorField
                            label="Stroke color"
                            value={selectedElement.stroke ?? DEFAULT_SHAPE_STROKE}
                            fallback={DEFAULT_SHAPE_STROKE}
                            disabled={!selectedElement.stroke || (selectedElement.strokeWidthMm ?? 0) <= 0}
                            onChange={(value) => updateElement(selectedElement.id, { stroke: value })}
                            onInvalid={(message) => setInspectorMessage(message)}
                        />
                        <PropertyField
                            label="Stroke Width (mm)"
                            type="number"
                            value={selectedElement.strokeWidthMm || 0}
                            disabled={!selectedElement.stroke || (selectedElement.strokeWidthMm ?? 0) <= 0}
                            onChange={(value) => {
                                const nextWidth = Math.max(0, value);
                                updateElement(selectedElement.id, nextWidth <= 0
                                    ? { strokeWidthMm: 0, stroke: null }
                                    : { strokeWidthMm: nextWidth, stroke: selectedElement.stroke ?? DEFAULT_SHAPE_STROKE });
                            }}
                        />
                        {selectedElement.type === "line" ? <SelectField label="Line Direction" value={selectedElement.lineDirection || "horizontal"} options={["horizontal", "vertical"]} onChange={(value) => updateElement(selectedElement.id, { lineDirection: value as "horizontal" | "vertical" })} /> : null}
                    </PropertySection>
                ) : null}
            </div>
        </aside>
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

function PropertyField({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string | number; onChange: (value: any) => void; type?: string; disabled?: boolean }) {
    return (
        <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{label}</label>
            <input className="plms-input" type={type} value={value} disabled={disabled} onChange={(event) => onChange(type === "number" ? Number(event.target.value) : event.target.value)} />
        </div>
    );
}

function ColorField({
    label,
    value,
    fallback,
    disabled,
    onChange,
    onInvalid,
}: {
    label: string;
    value: string;
    fallback: string;
    disabled?: boolean;
    onChange: (value: string) => void;
    onInvalid: (message: string | null) => void;
}) {
    const safeValue = isValidHexColor(value) ? value : fallback;

    return (
        <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{label}</label>
            <div className="flex items-center gap-3">
                <input
                    className="h-12 w-16 cursor-pointer rounded-2xl border border-[color:var(--plms-border)] bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
                    type="color"
                    value={safeValue}
                    disabled={disabled}
                    onChange={(event) => {
                        onInvalid(null);
                        onChange(event.target.value.toUpperCase());
                    }}
                />
                <input
                    className="plms-input flex-1 font-mono uppercase"
                    value={value}
                    disabled={disabled}
                    onChange={(event) => {
                        const nextValue = event.target.value.toUpperCase();
                        if (nextValue === "" || isValidHexColor(nextValue)) {
                            onInvalid(null);
                            onChange(nextValue === "" ? fallback : nextValue);
                            return;
                        }

                        onInvalid("Color must be a valid #RRGGBB value.");
                    }}
                />
            </div>
        </div>
    );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--plms-border)] px-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{label}</span>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-blue-500" />
        </label>
    );
}

function RotationField({ value, onChange }: { value: 0 | 90 | 180 | 270; onChange: (value: 0 | 90 | 180 | 270) => void }) {
    const options: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
    return (
        <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">Rotation</label>
            <div className="grid grid-cols-4 gap-2">
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${value === option ? "border-blue-400/30 bg-blue-500/10 text-white" : "border-[color:var(--plms-border)] text-[color:var(--plms-text-subtle)] hover:bg-white/5 hover:text-white"}`}
                        onClick={() => onChange(option)}
                    >
                        {option}°
                    </button>
                ))}
            </div>
        </div>
    );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
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
