"use client";

import { ChangeEvent, useMemo } from "react";
import { EditorVariablePicker } from "@/components/Editor/EditorVariablePicker";
import { useSelectedElement } from "@/components/Editor/editor-selectors";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { buildAssetContentUrl, uploadAsset } from "@/lib/assets";
import { ElementType } from "@/types/canvas";
import { useI18n } from "@/lib/i18n";

const FONT_OPTIONS = ["Arial", "Verdana", "Courier New", "Times New Roman"];
const BARCODE_OPTIONS = ["CODE_128", "CODE_39", "EAN_13"];
const DEFAULT_RECT_FILL = "#e2e8f0";
const DEFAULT_SHAPE_STROKE = "#0f172a";
const DEFAULT_TEXT_COLOR = "#0f172a";

function isValidHexColor(value: string) {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function useEditorText() {
    const { locale } = useI18n();
    return locale === "tr"
        ? {
            properties: "Özellikler",
            selectElement: "Geometri, stil ve kaynak verisini düzenlemek için bir eleman seçin.",
            identity: "Kimlik",
            name: "Ad",
            xMm: "X (mm)",
            yMm: "Y (mm)",
            widthMm: "Genişlik (mm)",
            heightMm: "Yükseklik (mm)",
            rotation: "Dönme",
            content: "İçerik",
            textStyle: "Metin Stili",
            fontFamily: "Yazı Tipi",
            fontSizePt: "Boyut (pt)",
            fontWeight: "Kalınlık",
            textAlign: "Hizalama",
            color: "Renk",
            barcodeSettings: "Barkod Ayarları",
            barcodeType: "Barkod Tipi",
            barcodeNotice: "CODE_128 dışındaki çıktı, PDF önizlemede farklı görünebilir.",
            barcodeMvp: "Bu barkod türü PDF çıktısında desteklenir.",
            qrSettings: "QR Ayarları",
            qrWarning: "Yüksek içerik yoğunluğu tarama toleransını düşürür.",
            qrOk: "QR içeriği tipik önizleme toleransı içerisinde.",
            imageSource: "Görsel Kaynağı",
            fitMode: "Sığdırma Modu",
            clearImage: "Görseli Temizle",
            imageDataPlaceholder: "Görsel data URI burada saklanır.",
            imageFormatError: "Yalnızca PNG, JPEG ve SVG görseller desteklenir.",
            imageSizeError: "Görseller 500KB veya daha küçük olmalıdır. Daha büyük dosyalar için paylaşımlı Kütüphane'yi kullanın.",
            strokeAndFill: "Kenar ve Dolgu",
            fillEnabled: "Dolgu aktif",
            fillColor: "Dolgu rengi",
            strokeEnabled: "Kenar aktif",
            strokeColor: "Kenar rengi",
            strokeWidthMm: "Kenar Kalınlığı (mm)",
            lineDirection: "Çizgi Yönü",
            colorInvalid: "Renk geçerli bir #RRGGBB değeri olmalıdır.",
        }
        : {
            properties: "Properties",
            selectElement: "Select an element to edit geometry, styling and source data.",
            identity: "Identity",
            name: "Name",
            xMm: "X (mm)",
            yMm: "Y (mm)",
            widthMm: "Width (mm)",
            heightMm: "Height (mm)",
            rotation: "Rotation",
            content: "Content",
            textStyle: "Text Style",
            fontFamily: "Font Family",
            fontSizePt: "Font Size (pt)",
            fontWeight: "Weight",
            textAlign: "Text Align",
            color: "Color",
            barcodeSettings: "Barcode Settings",
            barcodeType: "Barcode Type",
            barcodeNotice: "Non-CODE_128 output may render differently in PDF preview.",
            barcodeMvp: "Barcode is configured for supported MVP rendering.",
            qrSettings: "QR Settings",
            qrWarning: "High content density may reduce scan tolerance.",
            qrOk: "QR payload is within typical preview tolerance.",
            imageSource: "Image Source",
            fitMode: "Fit Mode",
            clearImage: "Clear Image",
            imageDataPlaceholder: "Image data URI will be stored here.",
            imageFormatError: "Only PNG, JPEG and SVG images are supported.",
            imageSizeError: "Embedded template images must be 500KB or smaller. Use the shared Library for larger assets.",
            strokeAndFill: "Stroke and Fill",
            fillEnabled: "Fill enabled",
            fillColor: "Fill color",
            strokeEnabled: "Stroke enabled",
            strokeColor: "Stroke color",
            strokeWidthMm: "Stroke Width (mm)",
            lineDirection: "Line Direction",
            colorInvalid: "Color must be a valid #RRGGBB value.",
        };
}

export function EditorInspector({ className = "" }: { className?: string }) {
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

    if (!selectedElement) {
        return (
            <aside className={`custom-scrollbar h-full min-h-0 w-full min-w-0 shrink-0 overflow-y-auto overscroll-contain border-l border-line bg-surface p-5 pr-2 pb-8 ${className}`} style={{ scrollbarGutter: "stable" }} onWheelCapture={(event) => event.stopPropagation()}>
                <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm font-medium text-ink-3">
                    {text.selectElement}
                </div>
            </aside>
        );
    }

    return (
        <aside className={`custom-scrollbar h-full min-h-0 w-full min-w-0 shrink-0 overflow-y-auto overscroll-contain border-l border-line bg-surface p-5 pr-2 pb-8 ${className}`} style={{ scrollbarGutter: "stable" }} onWheelCapture={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs font-medium text-ink-3">{text.properties}</div>
                    <div className="mt-1 text-lg font-medium text-ink">{selectedElement.name || selectedElement.type}</div>
                </div>
            </div>

            {inspectorMessage ? <div className="mt-4 rounded-lg border border-warn/20 bg-warn/10 p-3 text-sm font-medium text-warn">{inspectorMessage}</div> : null}

            <div className="mt-6 space-y-6">
                <PropertySection label={text.identity}>
                    <PropertyField label={text.name} value={selectedElement.name || ""} onChange={(value) => updateElement(selectedElement.id, { name: value }, { recordHistory: false })} />
                    <div className="grid grid-cols-2 gap-3">
                        <PropertyField label={text.xMm} type="number" step="0.1" value={selectedElement.xMm} onChange={(value) => updateElement(selectedElement.id, { xMm: value })} />
                        <PropertyField label={text.yMm} type="number" step="0.1" value={selectedElement.yMm} onChange={(value) => updateElement(selectedElement.id, { yMm: value })} />
                        <PropertyField label={text.widthMm} type="number" step="0.1" value={selectedElement.widthMm} onChange={(value) => updateElement(selectedElement.id, { widthMm: Math.max(1, value) })} />
                        <PropertyField label={text.heightMm} type="number" step="0.1" value={selectedElement.heightMm} onChange={(value) => updateElement(selectedElement.id, { heightMm: Math.max(1, value) })} />
                    </div>
                    <RotationField label={text.rotation} value={selectedElement.rotation || 0} onChange={(value) => updateElement(selectedElement.id, { rotation: value })} />
                </PropertySection>

                {(selectedElement.type === "text" || selectedElement.type === "barcode" || selectedElement.type === "qr") ? (
                    <PropertySection label={text.content}>
                        <textarea className="plms-input min-h-28" value={selectedElement.content} onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })} />
                        <EditorVariablePicker supportedTypes={supportsVariables} onInsert={appendVariable} />
                    </PropertySection>
                ) : null}

                {selectedElement.type === "text" ? (
                    <PropertySection label={text.textStyle}>
                        <SelectField label={text.fontFamily} value={selectedElement.font || "Arial"} options={FONT_OPTIONS} onChange={(value) => updateElement(selectedElement.id, { font: value })} />
                        <div className="grid grid-cols-2 gap-3">
                            <PropertyField label={text.fontSizePt} type="number" value={selectedElement.fontSizePt || 12} onChange={(value) => updateElement(selectedElement.id, { fontSizePt: value })} />
                            <SelectField label={text.fontWeight} value={selectedElement.fontWeight || "normal"} options={["normal", "bold"]} onChange={(value) => updateElement(selectedElement.id, { fontWeight: value as "normal" | "bold" })} />
                        </div>
                        <SelectField label={text.textAlign} value={selectedElement.textAlign || "left"} options={["left", "center", "right"]} onChange={(value) => updateElement(selectedElement.id, { textAlign: value as "left" | "center" | "right" })} />
                        <ColorField label={text.color} value={selectedElement.fill ?? DEFAULT_TEXT_COLOR} fallback={DEFAULT_TEXT_COLOR} onChange={(value) => updateElement(selectedElement.id, { fill: value })} invalidMessage={text.colorInvalid} onInvalid={(message) => setInspectorMessage(message)} />
                    </PropertySection>
                ) : null}

                {selectedElement.type === "barcode" ? (
                    <PropertySection label={text.barcodeSettings}>
                        <SelectField label={text.barcodeType} value={selectedElement.barcodeType || "CODE_128"} options={BARCODE_OPTIONS} onChange={(value) => updateElement(selectedElement.id, { barcodeType: value })} />
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
                        {selectedElement.assetSource ? <InlineNotice tone="info" text={selectedElement.assetSource === "phosphor" ? `Linked Phosphor icon: ${selectedElement.assetKey || "icon"}` : `Linked shared asset: ${selectedElement.assetId || "upload"}`} /> : null}
                        <input className="plms-input file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.18em] file:text-white" type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleImageUpload} />
                        <SelectField label={text.fitMode} value={selectedElement.imageFit || "contain"} options={["contain", "cover", "stretch"]} onChange={(value) => updateElement(selectedElement.id, { imageFit: value as "contain" | "cover" | "stretch" })} />
                        <textarea className="plms-input min-h-28" value={selectedElement.content} onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })} placeholder={text.imageDataPlaceholder} />
                        <button className="plms-button-secondary w-full" type="button" onClick={() => updateElement(selectedElement.id, { content: "" })}>{text.clearImage}</button>
                    </PropertySection>
                ) : null}

                {(selectedElement.type === "rect" || selectedElement.type === "ellipse" || selectedElement.type === "line") ? (
                    <PropertySection label={text.strokeAndFill}>
                        {selectedElement.type === "rect" || selectedElement.type === "ellipse" ? (
                            <>
                                <ToggleField label={text.fillEnabled} checked={selectedElement.fill != null} onChange={updateFillEnabled} />
                                <ColorField
                                    label={text.fillColor}
                                    value={selectedElement.fill ?? DEFAULT_RECT_FILL}
                                    fallback={DEFAULT_RECT_FILL}
                                    disabled={selectedElement.fill == null}
                                    onChange={(value) => updateElement(selectedElement.id, { fill: value })}
                                    invalidMessage={text.colorInvalid}
                                    onInvalid={(message) => setInspectorMessage(message)}
                                />
                            </>
                        ) : null}
                        <ToggleField label={text.strokeEnabled} checked={Boolean(selectedElement.stroke) && (selectedElement.strokeWidthMm ?? 0) > 0} onChange={updateStrokeEnabled} />
                        <ColorField
                            label={text.strokeColor}
                            value={selectedElement.stroke ?? DEFAULT_SHAPE_STROKE}
                            fallback={DEFAULT_SHAPE_STROKE}
                            disabled={!selectedElement.stroke || (selectedElement.strokeWidthMm ?? 0) <= 0}
                            onChange={(value) => updateElement(selectedElement.id, { stroke: value })}
                            invalidMessage={text.colorInvalid}
                            onInvalid={(message) => setInspectorMessage(message)}
                        />
                        <PropertyField
                            label={text.strokeWidthMm}
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
                        {selectedElement.type === "line" ? <SelectField label={text.lineDirection} value={selectedElement.lineDirection || "horizontal"} options={["horizontal", "vertical"]} onChange={(value) => updateElement(selectedElement.id, { lineDirection: value as "horizontal" | "vertical" })} /> : null}
                    </PropertySection>
                ) : null}
            </div>
        </aside>
    );
}

function PropertySection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 rounded-lg border border-line bg-raised p-4">
            <div className="text-xs font-medium text-ink-3">{label}</div>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

function PropertyField({ label, value, onChange, type = "text", disabled = false, step }: { label: string; value: string | number; onChange: (value: any) => void; type?: string; disabled?: boolean; step?: number | string }) {
    return (
        <div>
            <label className="mb-2 block text-xs font-medium text-ink-3">{label}</label>
            <input className="plms-input" type={type} step={step} value={value} disabled={disabled} onChange={(event) => onChange(type === "number" ? Number(event.target.value) : event.target.value)} />
        </div>
    );
}

function ColorField({
    label,
    value,
    fallback,
    disabled,
    invalidMessage,
    onChange,
    onInvalid,
}: {
    label: string;
    value: string;
    fallback: string;
    disabled?: boolean;
    invalidMessage: string;
    onChange: (value: string) => void;
    onInvalid: (message: string | null) => void;
}) {
    const safeValue = isValidHexColor(value) ? value : fallback;

    return (
        <div>
            <label className="mb-2 block text-xs font-medium text-ink-3">{label}</label>
            <div className="flex items-center gap-3">
                <input
                    className="h-12 w-16 cursor-pointer rounded-lg border border-line bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
                    type="color"
                    value={safeValue}
                    disabled={disabled}
                    onChange={(event) => {
                        onInvalid(null);
                        onChange(event.target.value.toUpperCase());
                    }}
                />
                <input
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
        <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
            <span className="text-xs font-medium text-ink-3">{label}</span>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-accent" />
        </label>
    );
}

function RotationField({ label, value, onChange }: { label: string; value: 0 | 90 | 180 | 270; onChange: (value: 0 | 90 | 180 | 270) => void }) {
    const options: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
    return (
        <div>
            <label className="mb-2 block text-xs font-medium text-ink-3">{label}</label>
            <div className="grid grid-cols-4 gap-2">
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${value === option ? "border-accent/30 bg-accent/10 text-ink" : "border-line text-ink-3 hover:bg-raised hover:text-ink"}`}
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
            <label className="mb-2 block text-xs font-medium text-ink-3">{label}</label>
            <select className="plms-select w-full" value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
        </div>
    );
}

function InlineNotice({ text, tone }: { text: string; tone: "info" | "warning" }) {
    const classes = tone === "warning"
        ? "border-warn/20 bg-warn/10 text-warn"
        : "border-accent/20 bg-accent/10 text-accent";

    return <div className={`rounded-lg border px-3 py-3 text-xs font-medium ${classes}`}>{text}</div>;
}
