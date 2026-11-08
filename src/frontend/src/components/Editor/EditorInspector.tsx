"use client";

import { ChangeEvent, useId, useMemo } from "react";
import { CursorClick, Info, WarningCircle } from "@phosphor-icons/react";
import { getElementTypeMeta } from "@/components/Editor/EditorToolRail";
import { EditorVariablePicker } from "@/components/Editor/EditorVariablePicker";
import { useSelectedElement } from "@/components/Editor/editor-selectors";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { buildAssetContentUrl, uploadAsset } from "@/lib/assets";
import { ElementType } from "@/types/canvas";
import { useI18n, useText } from "@/lib/i18n";

const FONT_OPTIONS = ["Arial", "Verdana", "Courier New", "Times New Roman"];
const BARCODE_OPTIONS = ["CODE_128", "CODE_39", "EAN_13"];
const DEFAULT_RECT_FILL = "#e2e8f0";
const DEFAULT_SHAPE_STROKE = "#0f172a";
const DEFAULT_TEXT_COLOR = "#0f172a";

function isValidHexColor(value: string) {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function useEditorText() {
    return useText("editor").inspector;
}

export function EditorInspector({ className = "", showHeader = true }: { className?: string; showHeader?: boolean }) {
    const { locale } = useI18n();
    const text = useEditorText();
    const selectedElement = useSelectedElement();
    const updateElement = useEditorStore((state) => state.updateElement);
    const inspectorMessage = useEditorStore((state) => state.ui.inspectorMessage);
    const setInspectorMessage = useEditorStore((state) => state.setInspectorMessage);

    const supportsVariables = useMemo(() => selectedElement ? [selectedElement.type].filter((type) => type === "text" || type === "barcode" || type === "qr") as ElementType[] : [], [selectedElement]);

    async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!selectedElement || !file) return;

        if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
            setInspectorMessage(text.imageFormatError);
            return;
        }

        const response = await uploadAsset(file);
        if (!response.success) {
            setInspectorMessage(response.error.message);
            return;
        }

        updateElement(selectedElement.id, {
            content: buildAssetContentUrl(response.data.asset.id),
            assetId: response.data.asset.id,
            assetSource: "upload",
            assetKey: undefined,
        });
        setInspectorMessage(null);
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

    const asideClass = `custom-scrollbar h-full min-h-0 w-full min-w-0 shrink-0 overflow-y-auto overscroll-contain bg-surface ${className}`;
    const header = showHeader ? (
        <div className="flex h-12 items-center border-b border-line px-4">
            <h2 className="text-base font-medium text-ink">{text.properties}</h2>
        </div>
    ) : null;

    if (!selectedElement) {
        return (
            <aside className={asideClass} style={{ scrollbarGutter: "stable" }} onWheelCapture={(event) => event.stopPropagation()}>
                {header}
                <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-ink-3">
                    <CursorClick size={18} />
                    {text.selectElement}
                </div>
            </aside>
        );
    }

    const typeMeta = getElementTypeMeta(selectedElement.type, locale);
    const TypeIcon = typeMeta.icon;
    const options = (values: string[]) => values.map((value) => ({ value, label: text.options[value] ?? value }));

    return (
        <aside className={asideClass} style={{ scrollbarGutter: "stable" }} onWheelCapture={(event) => event.stopPropagation()}>
            {header}
            <div className="space-y-3 border-b border-line p-4">
                <div className="flex items-center gap-2 text-xs text-ink-3">
                    <TypeIcon size={16} />
                    {typeMeta.label}
                </div>
                <PropertyField label={text.name} value={selectedElement.name || ""} onChange={(value) => updateElement(selectedElement.id, { name: value }, { recordHistory: false })} />
                {inspectorMessage ? <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{inspectorMessage}</div> : null}
            </div>

            <div className="divide-y divide-line">
                <PropertySection label={text.geometry}>
                    <div className="grid grid-cols-2 gap-3">
                        <PropertyField label={text.xMm} unit="mm" type="number" step="0.1" value={selectedElement.xMm} onChange={(value) => updateElement(selectedElement.id, { xMm: value })} />
                        <PropertyField label={text.yMm} unit="mm" type="number" step="0.1" value={selectedElement.yMm} onChange={(value) => updateElement(selectedElement.id, { yMm: value })} />
                        <PropertyField label={text.widthMm} unit="mm" type="number" step="0.1" value={selectedElement.widthMm} onChange={(value) => updateElement(selectedElement.id, { widthMm: Math.max(1, value) })} />
                        <PropertyField label={text.heightMm} unit="mm" type="number" step="0.1" value={selectedElement.heightMm} onChange={(value) => updateElement(selectedElement.id, { heightMm: Math.max(1, value) })} />
                    </div>
                    <RotationField label={text.rotation} value={selectedElement.rotation || 0} onChange={(value) => updateElement(selectedElement.id, { rotation: value })} />
                </PropertySection>

                {(selectedElement.type === "text" || selectedElement.type === "barcode" || selectedElement.type === "qr") ? (
                    <PropertySection label={text.content}>
                        <textarea aria-label={text.content} className="plms-input min-h-24 font-mono text-xs" value={selectedElement.content} onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })} />
                        <EditorVariablePicker supportedTypes={supportsVariables} onInsert={appendVariable} />
                    </PropertySection>
                ) : null}

                {selectedElement.type === "text" ? (
                    <PropertySection label={text.textStyle}>
                        <SelectField label={text.fontFamily} value={selectedElement.font || "Arial"} options={FONT_OPTIONS.map((value) => ({ value, label: value }))} onChange={(value) => updateElement(selectedElement.id, { font: value })} />
                        <div className="grid grid-cols-2 gap-3">
                            <PropertyField label={text.fontSizePt} unit="pt" type="number" value={selectedElement.fontSizePt || 12} onChange={(value) => updateElement(selectedElement.id, { fontSizePt: value })} />
                            <SelectField label={text.fontWeight} value={selectedElement.fontWeight || "normal"} options={options(["normal", "bold"])} onChange={(value) => updateElement(selectedElement.id, { fontWeight: value as "normal" | "bold" })} />
                        </div>
                        <SelectField label={text.textAlign} value={selectedElement.textAlign || "left"} options={options(["left", "center", "right"])} onChange={(value) => updateElement(selectedElement.id, { textAlign: value as "left" | "center" | "right" })} />
                        <ColorField label={text.color} value={selectedElement.fill ?? DEFAULT_TEXT_COLOR} fallback={DEFAULT_TEXT_COLOR} onChange={(value) => updateElement(selectedElement.id, { fill: value })} invalidMessage={text.colorInvalid} onInvalid={(message) => setInspectorMessage(message)} />
                    </PropertySection>
                ) : null}

                {selectedElement.type === "barcode" ? (
                    <PropertySection label={text.barcodeSettings}>
                        <SelectField label={text.barcodeType} value={selectedElement.barcodeType || "CODE_128"} options={BARCODE_OPTIONS.map((value) => ({ value, label: value }))} onChange={(value) => updateElement(selectedElement.id, { barcodeType: value })} />
                        <InlineNotice tone={selectedElement.barcodeType && selectedElement.barcodeType !== "CODE_128" ? "warning" : "info"} text={selectedElement.barcodeType && selectedElement.barcodeType !== "CODE_128" ? text.barcodeNotice : text.barcodeMvp} />
                    </PropertySection>
                ) : null}

                {selectedElement.type === "qr" ? (
                    <PropertySection label={text.qrSettings}>
                        <InlineNotice tone={selectedElement.content.length > 120 ? "warning" : "info"} text={selectedElement.content.length > 120 ? text.qrWarning : text.qrOk} />
                    </PropertySection>
                ) : null}

                {selectedElement.type === "image" ? (
                    <PropertySection label={text.imageSource}>
                        {selectedElement.assetSource ? (
                            <InlineNotice
                                tone="info"
                                text={selectedElement.assetSource === "phosphor"
                                    ? `${text.linkedIcon}: ${selectedElement.assetKey || "icon"}`
                                    : `${text.linkedAsset}: ${selectedElement.assetId || "upload"}`}
                            />
                        ) : null}
                        <div>
                            <label className="plms-label mb-1.5 block" htmlFor={`inspector-upload-${selectedElement.id}`}>{text.uploadImage}</label>
                            <input
                                id={`inspector-upload-${selectedElement.id}`}
                                className="block w-full text-sm text-ink-2 file:mr-3 file:h-8 file:cursor-pointer file:rounded-lg file:border file:border-solid file:border-line file:bg-surface file:px-3 file:text-sm file:font-medium file:text-ink file:transition-colors hover:file:bg-raised"
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml"
                                onChange={handleImageUpload}
                            />
                        </div>
                        <SelectField label={text.fitMode} value={selectedElement.imageFit || "contain"} options={options(["contain", "cover", "stretch"])} onChange={(value) => updateElement(selectedElement.id, { imageFit: value as "contain" | "cover" | "stretch" })} />
                        <div>
                            <label className="plms-label mb-1.5 block" htmlFor={`inspector-image-${selectedElement.id}`}>{text.imageAddress}</label>
                            <textarea id={`inspector-image-${selectedElement.id}`} className="plms-input min-h-20 font-mono text-xs" value={selectedElement.content} onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })} placeholder={text.imageDataPlaceholder} />
                        </div>
                        <button className="plms-button-secondary h-8 w-full" type="button" onClick={() => updateElement(selectedElement.id, { content: "" })}>{text.clearImage}</button>
                    </PropertySection>
                ) : null}

                {(selectedElement.type === "rect" || selectedElement.type === "ellipse" || selectedElement.type === "line") ? (
                    <PropertySection label={text.strokeAndFill}>
                        {selectedElement.type === "rect" || selectedElement.type === "ellipse" ? (
                            <div className="space-y-2">
                                <ToggleField label={text.fillEnabled} checked={selectedElement.fill != null} onChange={updateFillEnabled} />
                                <ColorField
                                    label={text.fillColor}
                                    hideLabel
                                    value={selectedElement.fill ?? DEFAULT_RECT_FILL}
                                    fallback={DEFAULT_RECT_FILL}
                                    disabled={selectedElement.fill == null}
                                    onChange={(value) => updateElement(selectedElement.id, { fill: value })}
                                    invalidMessage={text.colorInvalid}
                                    onInvalid={(message) => setInspectorMessage(message)}
                                />
                            </div>
                        ) : null}
                        <div className="space-y-2">
                            <ToggleField label={text.strokeEnabled} checked={Boolean(selectedElement.stroke) && (selectedElement.strokeWidthMm ?? 0) > 0} onChange={updateStrokeEnabled} />
                            <ColorField
                                label={text.strokeColor}
                                hideLabel
                                value={selectedElement.stroke ?? DEFAULT_SHAPE_STROKE}
                                fallback={DEFAULT_SHAPE_STROKE}
                                disabled={!selectedElement.stroke || (selectedElement.strokeWidthMm ?? 0) <= 0}
                                onChange={(value) => updateElement(selectedElement.id, { stroke: value })}
                                invalidMessage={text.colorInvalid}
                                onInvalid={(message) => setInspectorMessage(message)}
                            />
                        </div>
                        <PropertyField
                            label={text.strokeWidthMm}
                            unit="mm"
                            type="number"
                            step="0.1"
                            value={selectedElement.strokeWidthMm || 0}
                            disabled={!selectedElement.stroke || (selectedElement.strokeWidthMm ?? 0) <= 0}
                            onChange={(value) => {
                                const nextWidth = Math.max(0, value);
                                updateElement(selectedElement.id, nextWidth <= 0
                                    ? { strokeWidthMm: 0, stroke: null }
                                    : { strokeWidthMm: nextWidth, stroke: selectedElement.stroke ?? DEFAULT_SHAPE_STROKE });
                            }}
                        />
                        {selectedElement.type === "line" ? <SelectField label={text.lineDirection} value={selectedElement.lineDirection || "horizontal"} options={options(["horizontal", "vertical"])} onChange={(value) => updateElement(selectedElement.id, { lineDirection: value as "horizontal" | "vertical" })} /> : null}
                    </PropertySection>
                ) : null}
            </div>
        </aside>
    );
}

function PropertySection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 p-4">
            <h3 className="text-sm font-medium text-ink">{label}</h3>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

function useFieldId(label: string) {
    const id = useId();
    return `${id}-${label.replace(/\s+/g, "-").toLowerCase()}`;
}

function PropertyField({ label, value, onChange, type = "text", disabled = false, step, unit }: { label: string; value: string | number; onChange: (value: any) => void; type?: string; disabled?: boolean; step?: number | string; unit?: string }) {
    const id = useFieldId(label);
    return (
        <div>
            <label className="plms-label mb-1.5 block" htmlFor={id}>{label}</label>
            <div className="relative">
                <input
                    id={id}
                    className={`plms-input ${type === "number" ? "font-mono tabular" : ""} ${unit ? "pr-10" : ""}`}
                    type={type}
                    step={step}
                    value={value}
                    disabled={disabled}
                    onChange={(event) => onChange(type === "number" ? Number(event.target.value) : event.target.value)}
                />
                {unit ? <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-3">{unit}</span> : null}
            </div>
        </div>
    );
}

function ColorField({
    label,
    hideLabel = false,
    value,
    fallback,
    disabled,
    invalidMessage,
    onChange,
    onInvalid,
}: {
    label: string;
    hideLabel?: boolean;
    value: string;
    fallback: string;
    disabled?: boolean;
    invalidMessage: string;
    onChange: (value: string) => void;
    onInvalid: (message: string | null) => void;
}) {
    const safeValue = isValidHexColor(value) ? value : fallback;
    const id = useFieldId(label);

    return (
        <div>
            <label className={hideLabel ? "sr-only" : "plms-label mb-1.5 block"} htmlFor={id}>{label}</label>
            <div className="flex items-center gap-2">
                <input
                    className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-50"
                    type="color"
                    aria-label={label}
                    value={safeValue}
                    disabled={disabled}
                    onChange={(event) => {
                        onInvalid(null);
                        onChange(event.target.value.toUpperCase());
                    }}
                />
                <input
                    id={id}
                    className="plms-input flex-1 font-mono"
                    value={value}
                    disabled={disabled}
                    onChange={(event) => {
                        const nextValue = event.target.value.toUpperCase();
                        if (nextValue === "" || isValidHexColor(nextValue)) {
                            onInvalid(null);
                            onChange(nextValue === "" ? fallback : nextValue);
                            return;
                        }

                        onInvalid(invalidMessage);
                    }}
                />
            </div>
        </div>
    );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex h-7 cursor-pointer items-center justify-between gap-3">
            <span className="plms-label">{label}</span>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-accent" />
        </label>
    );
}

function RotationField({ label, value, onChange }: { label: string; value: 0 | 90 | 180 | 270; onChange: (value: 0 | 90 | 180 | 270) => void }) {
    const options: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
    return (
        <div>
            <div className="plms-label mb-1.5">{label}</div>
            <div className="grid grid-cols-4 gap-0.5 rounded-lg bg-raised p-0.5" role="radiogroup" aria-label={label}>
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={value === option}
                        className={`h-8 rounded-md font-mono text-xs tabular transition-colors ${value === option ? "bg-surface text-ink shadow-xs" : "text-ink-2 hover:text-ink"}`}
                        onClick={() => onChange(option)}
                    >
                        {option}°
                    </button>
                ))}
            </div>
        </div>
    );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
    const id = useFieldId(label);
    return (
        <div>
            <label className="plms-label mb-1.5 block" htmlFor={id}>{label}</label>
            <select id={id} className="plms-select w-full" value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </div>
    );
}

function InlineNotice({ text, tone }: { text: string; tone: "info" | "warning" }) {
    if (tone === "warning") {
        return (
            <div className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
                <WarningCircle size={16} className="mt-0.5 shrink-0" />
                {text}
            </div>
        );
    }

    return (
        <div className="flex items-start gap-2 text-sm text-ink-3">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{text}</span>
        </div>
    );
}
