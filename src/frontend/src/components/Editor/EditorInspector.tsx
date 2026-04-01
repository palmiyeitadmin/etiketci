"use client";

import { ChangeEvent, useMemo } from "react";
import { EditorVariablePicker } from "@/components/Editor/EditorVariablePicker";
import { useSelectedElement, useSelectedElements, useSelectedGroup } from "@/components/Editor/editor-selectors";
import { useEditorStore } from "@/components/Editor/useEditorStore";
import { buildAssetContentUrl, uploadAsset } from "@/lib/assets";
import { ElementType, ImageFit, LabelElement, TextTransform, VerticalAlign } from "@/types/canvas";
import { useI18n } from "@/lib/i18n";

const FONT_OPTIONS = [
    // Sans-Serif (Modern & Clean)
    "Arial",
    "Inter",
    "Roboto",
    "Montserrat",
    "Open Sans",
    "Lato",
    "Manrope",
    "Outfit",
    "Plus Jakarta Sans",
    "Poppins",
    // Serif (Elegant & Formal)
    "Playfair Display",
    "Lora",
    "Libre Baskerville",
    "Merriweather",
    "Cormorant Garamond",
    "Times New Roman",
    // Monospace (Data & Industrial)
    "JetBrains Mono",
    "Roboto Mono",
    "Space Mono",
    "Courier New",
    "Fira Code",
    // Display & Decorative
    "Oswald",
    "Bebas Neue",
    "Righteous",
    "Syncopate",
    // Handwriting (Casual)
    "Dancing Script",
    "Caveat",
    "Pacifico",
    "Shadows Into Light",
    "Verdana",
];
const BARCODE_OPTIONS = ["CODE_128", "CODE_39", "EAN_13"];
const DEFAULT_RECT_FILL = "#e2e8f0";
const DEFAULT_SHAPE_STROKE = "#0f172a";
const DEFAULT_TEXT_COLOR = "#0f172a";
const COLOR_SWATCHES = ["#000000", "#FFFFFF", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#64748B"];

function useEditorText() {
    const { locale } = useI18n();
    return locale === "tr"
        ? {
            properties: "Özellikler",
            selectElement: "Düzenlemek için bir eleman veya grup seçin.",
            multiSelect: "Toplu Seçim",
            grouped: "Gruplanmış elemanlar blok olarak yönetilir.",
            memberCount: "Üye Sayısı",
            groupName: "Grup Adı",
            visibility: "Görünürlük",
            lock: "Kilit",
            ungroup: "Grubu Çöz",
            group: "Grupla",
            align: "Hizala",
            arrange: "Yerleşim",
            distributeH: "Yatay Dağıt",
            distributeV: "Dikey Dağıt",
            matchWidth: "Genişlikleri Eşitle",
            matchHeight: "Yükseklikleri Eşitle",
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
            textAlign: "Yatay Hizalama",
            verticalAlign: "Dikey Hizalama",
            lineHeight: "Satır Yüksekliği",
            letterSpacing: "Harf Aralığı",
            textTransform: "Metin Dönüşümü",
            color: "Renk",
            barcodeSettings: "Barkod Ayarları",
            barcodeType: "Barkod Tipi",
            imageSource: "Görsel Kaynağı",
            fitMode: "Sığdırma",
            imageAlignX: "Yatay",
            imageAlignY: "Dikey",
            cornerRadius: "Köşe Yarıçapı (mm)",
            frameFill: "Çerçeve Dolgu",
            frameStroke: "Çerçeve Kenar",
            frameStrokeWidthMm: "Çerçeve Kalınlığı (mm)",
            clearImage: "Görseli Temizle",
            imageDataPlaceholder: "Görsel data URI burada saklanır.",
            imageFormatError: "Yalnızca PNG, JPEG ve SVG desteklenir.",
            strokeAndFill: "Kenar ve Dolgu",
            fillColor: "Dolgu",
            strokeColor: "Kenar",
            strokeWidthMm: "Kenar (mm)",
            lineDirection: "Çizgi Yönü",
            width: "Genişlik",
            height: "Yükseklik",
            alignLeft: "Sola Hizala",
            alignCenter: "Merkeze Hizala",
            alignRight: "Sağa Hizala",
            alignTop: "Üste Hizala",
            alignMiddle: "Ortaya Hizala",
            alignBottom: "Alta Hizala",
        }
        : {
            properties: "Properties",
            selectElement: "Select an element or group to edit.",
            multiSelect: "Multi Select",
            grouped: "Grouped elements are managed as a single block.",
            memberCount: "Member Count",
            groupName: "Group Name",
            visibility: "Visibility",
            lock: "Lock",
            ungroup: "Ungroup",
            group: "Group",
            align: "Align",
            arrange: "Arrange",
            distributeH: "Distribute H",
            distributeV: "Distribute V",
            matchWidth: "Match Width",
            matchHeight: "Match Height",
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
            fontSizePt: "Size (pt)",
            fontWeight: "Weight",
            textAlign: "Text Align",
            verticalAlign: "Vertical Align",
            lineHeight: "Line Height",
            letterSpacing: "Letter Spacing",
            textTransform: "Text Transform",
            color: "Color",
            barcodeSettings: "Barcode Settings",
            barcodeType: "Barcode Type",
            imageSource: "Image Source",
            fitMode: "Fit Mode",
            imageAlignX: "Horizontal",
            imageAlignY: "Vertical",
            cornerRadius: "Corner Radius (mm)",
            frameFill: "Frame Fill",
            frameStroke: "Frame Stroke",
            frameStrokeWidthMm: "Frame Stroke (mm)",
            clearImage: "Clear Image",
            imageDataPlaceholder: "Image data URI is stored here.",
            imageFormatError: "Only PNG, JPEG and SVG are supported.",
            strokeAndFill: "Stroke and Fill",
            fillColor: "Fill",
            strokeColor: "Stroke",
            strokeWidthMm: "Stroke (mm)",
            lineDirection: "Line Direction",
            width: "Width",
            height: "Height",
            alignLeft: "Align Left",
            alignCenter: "Align Center",
            alignRight: "Align Right",
            alignTop: "Align Top",
            alignMiddle: "Align Middle",
            alignBottom: "Align Bottom",
        };
}

function commonValue<T>(elements: LabelElement[], getter: (element: LabelElement) => T) {
    const values = elements.map(getter);
    return values.every((value) => value === values[0]) ? values[0] : undefined;
}

export function EditorInspector({ className = "" }: { className?: string }) {
    const text = useEditorText();
    const selectedElement = useSelectedElement();
    const selectedElements = useSelectedElements();
    const selectedGroup = useSelectedGroup();
    const updateElement = useEditorStore((state) => state.updateElement);
    const updateSelectedElements = useEditorStore((state) => state.updateSelectedElements);
    const groupSelected = useEditorStore((state) => state.groupSelected);
    const ungroupSelectedGroup = useEditorStore((state) => state.ungroupSelectedGroup);
    const renameSelectedGroup = useEditorStore((state) => state.renameSelectedGroup);
    const setSelectedGroupVisibility = useEditorStore((state) => state.setSelectedGroupVisibility);
    const setSelectedGroupLocked = useEditorStore((state) => state.setSelectedGroupLocked);
    const alignSelected = useEditorStore((state) => state.alignSelected);
    const distributeSelected = useEditorStore((state) => state.distributeSelected);
    const matchSelectedSize = useEditorStore((state) => state.matchSelectedSize);
    const inspectorMessage = useEditorStore((state) => state.ui.inspectorMessage);
    const setInspectorMessage = useEditorStore((state) => state.setInspectorMessage);
    const recentColors = useEditorStore((state) => state.recentColors);

    const commonType = useMemo(() => selectedElements.length > 0 && selectedElements.every((element) => element.type === selectedElements[0].type) ? selectedElements[0].type : null, [selectedElements]);
    const supportsVariables = useMemo(() => selectedElement ? [selectedElement.type].filter((type) => type === "text" || type === "barcode" || type === "qr") as ElementType[] : [], [selectedElement]);

    async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!selectedElement || selectedElement.type !== "image" || !file) return;
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

    if (!selectedElement && selectedElements.length === 0 && !selectedGroup) {
        return <EmptyAside className={className} text={text.selectElement} />;
    }

    return (
        <aside className={`custom-scrollbar h-full min-h-0 w-full min-w-0 shrink-0 overflow-y-auto overscroll-contain border-l border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5 pr-2 pb-8 ${className}`} style={{ scrollbarGutter: "stable" }} onWheelCapture={(event) => event.stopPropagation()}>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.properties}</div>
            <div className="mt-1 text-lg font-black tracking-[-0.04em] text-white">{selectedGroup ? selectedGroup.groupName : selectedElement ? (selectedElement.name || selectedElement.type) : text.multiSelect}</div>
            {inspectorMessage ? <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-medium text-amber-200">{inspectorMessage}</div> : null}

            <div className="mt-6 space-y-6">
                {selectedGroup ? (
                    <PropertySection label={text.arrange}>
                        <PropertyField label={text.groupName} value={selectedGroup.groupName} onChange={(value) => renameSelectedGroup(value)} />
                        <InlineNotice tone="info" text={`${text.grouped} ${text.memberCount}: ${selectedGroup.elementIds.length}`} />
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" className="plms-button-compact" onClick={() => setSelectedGroupVisibility(false)}>{text.visibility}: off</button>
                            <button type="button" className="plms-button-compact" onClick={() => setSelectedGroupVisibility(true)}>{text.visibility}: on</button>
                            <button type="button" className="plms-button-compact" onClick={() => setSelectedGroupLocked(true)}>{text.lock}: on</button>
                            <button type="button" className="plms-button-compact" onClick={() => setSelectedGroupLocked(false)}>{text.lock}: off</button>
                            <button type="button" className="plms-button-compact col-span-2" onClick={ungroupSelectedGroup}>{text.ungroup}</button>
                        </div>
                    </PropertySection>
                ) : null}

                {!selectedElement && selectedElements.length > 1 ? (
                    <>
                        <PropertySection label={text.multiSelect}>
                            <InlineNotice tone="info" text={`${selectedElements.length} ${text.multiSelect.toLowerCase()}`} />
                            
                            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                                <PropertyField 
                                    label={`${text.width} (mm)`} 
                                    value={commonValue(selectedElements, (e) => e.widthMm)?.toString() ?? ""} 
                                    placeholder={commonValue(selectedElements, (e) => e.widthMm) === undefined ? "Mixed" : ""}
                                    type="number"
                                    onChange={(val) => updateSelectedElements({ widthMm: parseFloat(val) })} 
                                />
                                <PropertyField 
                                    label={`${text.height} (mm)`} 
                                    value={commonValue(selectedElements, (e) => e.heightMm)?.toString() ?? ""} 
                                    placeholder={commonValue(selectedElements, (e) => e.heightMm) === undefined ? "Mixed" : ""}
                                    type="number"
                                    onChange={(val) => updateSelectedElements({ heightMm: parseFloat(val) })} 
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <button type="button" className="plms-button-compact" onClick={() => alignSelected("left")}>{text.alignLeft || "Left"}</button>
                                <button type="button" className="plms-button-compact" onClick={() => alignSelected("right")}>{text.alignRight || "Right"}</button>
                                <button type="button" className="plms-button-compact" onClick={() => alignSelected("top")}>{text.alignTop || "Top"}</button>
                                <button type="button" className="plms-button-compact" onClick={() => alignSelected("bottom")}>{text.alignBottom || "Bottom"}</button>
                                <button type="button" className="plms-button-compact" onClick={() => distributeSelected("horizontal")}>{text.distributeH}</button>
                                <button type="button" className="plms-button-compact" onClick={() => distributeSelected("vertical")}>{text.distributeV}</button>
                                <button type="button" className="plms-button-compact" onClick={() => matchSelectedSize("width")}>{text.matchWidth}</button>
                                <button type="button" className="plms-button-compact" onClick={() => matchSelectedSize("height")}>{text.matchHeight}</button>
                                {selectedElements.length >= 2 ? <button type="button" className="plms-button-compact col-span-2" onClick={groupSelected}>{text.group}</button> : null}
                            </div>
                        </PropertySection>

                        {commonType === "text" ? (
                            <PropertySection label={text.textStyle}>
                                <SelectField label={text.fontFamily} value={commonValue(selectedElements, (element) => element.font) || "Arial"} options={FONT_OPTIONS} onChange={(value) => updateSelectedElements({ font: value })} />
                                <div className="grid grid-cols-2 gap-3">
                                    <PropertyField label={text.fontSizePt} type="number" value={commonValue(selectedElements, (element) => element.fontSizePt ?? 12) ?? 12} onChange={(value) => updateSelectedElements({ fontSizePt: value })} />
                                    <SelectField label={text.fontWeight} value={commonValue(selectedElements, (element) => element.fontWeight) || "normal"} options={["normal", "bold"]} onChange={(value) => updateSelectedElements({ fontWeight: value as "normal" | "bold" })} />
                                    <SelectField label={text.textAlign} value={commonValue(selectedElements, (element) => element.textAlign) || "left"} options={["left", "center", "right"]} onChange={(value) => updateSelectedElements({ textAlign: value as "left" | "center" | "right" })} />
                                    <SelectField label={text.verticalAlign} value={commonValue(selectedElements, (element) => element.verticalAlign) || "middle"} options={["top", "middle", "bottom"]} onChange={(value) => updateSelectedElements({ verticalAlign: value as VerticalAlign })} />
                                    <PropertyField label={text.lineHeight} type="number" step="0.1" value={commonValue(selectedElements, (element) => element.lineHeight ?? 1) ?? 1} onChange={(value) => updateSelectedElements({ lineHeight: value })} />
                                    <PropertyField label={text.letterSpacing} type="number" step="0.1" value={commonValue(selectedElements, (element) => element.letterSpacingPt ?? 0) ?? 0} onChange={(value) => updateSelectedElements({ letterSpacingPt: value })} />
                                </div>
                                <SelectField label={text.textTransform} value={commonValue(selectedElements, (element) => element.textTransform) || "none"} options={["none", "uppercase", "lowercase"]} onChange={(value) => updateSelectedElements({ textTransform: value as TextTransform })} />
                                <ColorField label={text.color} value={commonValue(selectedElements, (element) => element.fill) ?? DEFAULT_TEXT_COLOR} fallback={DEFAULT_TEXT_COLOR} onChange={(value) => updateSelectedElements({ fill: value })} recentColors={recentColors} />
                            </PropertySection>
                        ) : null}

                        {(commonType === "rect" || commonType === "ellipse" || commonType === "line") ? (
                            <PropertySection label={text.strokeAndFill}>
                                {commonType !== "line" ? <ToggleColorField label={text.fillColor} enabled={commonValue(selectedElements, (e) => e.fill) != null} value={commonValue(selectedElements, (e) => e.fill) ?? DEFAULT_RECT_FILL} fallback={DEFAULT_RECT_FILL} onChangeEnabled={(enabled) => updateSelectedElements({ fill: enabled ? DEFAULT_RECT_FILL : null })} onChangeValue={(value) => updateSelectedElements({ fill: value })} recentColors={recentColors} /> : null}
                                <ToggleColorField label={text.strokeColor} enabled={commonValue(selectedElements, (e) => e.stroke) != null} value={commonValue(selectedElements, (e) => e.stroke) ?? DEFAULT_SHAPE_STROKE} fallback={DEFAULT_SHAPE_STROKE} onChangeEnabled={(enabled) => updateSelectedElements({ stroke: enabled ? DEFAULT_SHAPE_STROKE : null, strokeWidthMm: enabled ? 0.4 : undefined })} onChangeValue={(value) => updateSelectedElements({ stroke: value })} recentColors={recentColors} />
                                {commonValue(selectedElements, (e) => e.stroke) != null ? (
                                    <PropertyField label={text.strokeWidthMm} type="number" step="0.1" value={commonValue(selectedElements, (e) => e.strokeWidthMm) ?? 0} onChange={(value) => updateSelectedElements({ strokeWidthMm: value })} />
                                ) : null}
                            </PropertySection>
                        ) : null}
                    </>
                ) : null}

                {selectedElement ? (
                    <>
                        <PropertySection label={text.identity}>
                            <PropertyField label={text.name} value={selectedElement.name || ""} onChange={(value) => updateElement(selectedElement.id, { name: value }, { recordHistory: false })} />
                            <div className="grid grid-cols-2 gap-3">
                                <PropertyField label={text.xMm} type="number" step="0.1" value={selectedElement.xMm} onChange={(value) => updateElement(selectedElement.id, { xMm: value })} />
                                <PropertyField label={text.yMm} type="number" step="0.1" value={selectedElement.yMm} onChange={(value) => updateElement(selectedElement.id, { yMm: value })} />
                                <PropertyField label={text.widthMm} type="number" step="0.1" value={selectedElement.widthMm} onChange={(value) => updateElement(selectedElement.id, { widthMm: Math.max(1, value) })} />
                                <PropertyField label={text.heightMm} type="number" step="0.1" value={selectedElement.heightMm} onChange={(value) => updateElement(selectedElement.id, { heightMm: Math.max(1, value) })} />
                            </div>
                            <SelectField label={text.rotation} value={String(selectedElement.rotation || 0)} options={["0", "90", "180", "270"]} onChange={(value) => updateElement(selectedElement.id, { rotation: Number(value) as 0 | 90 | 180 | 270 })} />
                        </PropertySection>

                        {(selectedElement.type === "text" || selectedElement.type === "barcode" || selectedElement.type === "qr") ? (
                            <PropertySection label={text.content}>
                                <textarea className="plms-input min-h-28" value={selectedElement.content} onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })} />
                                <EditorVariablePicker supportedTypes={supportsVariables} onInsert={(placeholder) => updateElement(selectedElement.id, { content: `${selectedElement.content}${selectedElement.content ? " " : ""}${placeholder}` })} />
                            </PropertySection>
                        ) : null}

                        {selectedElement.type === "text" ? (
                            <PropertySection label={text.textStyle}>
                                <SelectField label={text.fontFamily} value={selectedElement.font || "Arial"} options={FONT_OPTIONS} onChange={(value) => updateElement(selectedElement.id, { font: value })} />
                                <div className="grid grid-cols-2 gap-3">
                                    <PropertyField label={text.fontSizePt} type="number" value={selectedElement.fontSizePt || 12} onChange={(value) => updateElement(selectedElement.id, { fontSizePt: value })} />
                                    <SelectField label={text.fontWeight} value={selectedElement.fontWeight || "normal"} options={["normal", "bold"]} onChange={(value) => updateElement(selectedElement.id, { fontWeight: value as "normal" | "bold" })} />
                                    <SelectField label={text.textAlign} value={selectedElement.textAlign || "left"} options={["left", "center", "right"]} onChange={(value) => updateElement(selectedElement.id, { textAlign: value as "left" | "center" | "right" })} />
                                    <SelectField label={text.verticalAlign} value={selectedElement.verticalAlign || "middle"} options={["top", "middle", "bottom"]} onChange={(value) => updateElement(selectedElement.id, { verticalAlign: value as VerticalAlign })} />
                                    <PropertyField label={text.lineHeight} type="number" step="0.1" value={selectedElement.lineHeight || 1} onChange={(value) => updateElement(selectedElement.id, { lineHeight: value })} />
                                    <PropertyField label={text.letterSpacing} type="number" step="0.1" value={selectedElement.letterSpacingPt || 0} onChange={(value) => updateElement(selectedElement.id, { letterSpacingPt: value })} />
                                </div>
                                <SelectField label={text.textTransform} value={selectedElement.textTransform || "none"} options={["none", "uppercase", "lowercase"]} onChange={(value) => updateElement(selectedElement.id, { textTransform: value as TextTransform })} />
                                <ColorField label={text.color} value={selectedElement.fill ?? DEFAULT_TEXT_COLOR} fallback={DEFAULT_TEXT_COLOR} onChange={(value) => updateElement(selectedElement.id, { fill: value })} recentColors={recentColors} />
                            </PropertySection>
                        ) : null}

                        {selectedElement.type === "barcode" ? (
                            <PropertySection label={text.barcodeSettings}>
                                <SelectField label={text.barcodeType} value={selectedElement.barcodeType || "CODE_128"} options={BARCODE_OPTIONS} onChange={(value) => updateElement(selectedElement.id, { barcodeType: value })} />
                            </PropertySection>
                        ) : null}

                        {selectedElement.type === "image" ? (
                            <PropertySection label={text.imageSource}>
                                <input className="plms-input file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.18em] file:text-white" type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleImageUpload} />
                                <SelectField label={text.fitMode} value={selectedElement.imageFit || "contain"} options={["contain", "cover", "stretch"]} onChange={(value) => updateElement(selectedElement.id, { imageFit: value as ImageFit })} />
                                <div className="grid grid-cols-2 gap-3">
                                    <SelectField label={text.imageAlignX} value={selectedElement.imageAlignX || "center"} options={["left", "center", "right"]} onChange={(value) => updateElement(selectedElement.id, { imageAlignX: value as "left" | "center" | "right" })} />
                                    <SelectField label={text.imageAlignY} value={selectedElement.imageAlignY || "middle"} options={["top", "middle", "bottom"]} onChange={(value) => updateElement(selectedElement.id, { imageAlignY: value as "top" | "middle" | "bottom" })} />
                                    <PropertyField label={text.cornerRadius} type="number" step="0.1" value={selectedElement.cornerRadiusMm || 0} onChange={(value) => updateElement(selectedElement.id, { cornerRadiusMm: value })} />
                                    <PropertyField label={text.frameStrokeWidthMm} type="number" step="0.1" value={selectedElement.frameStrokeWidthMm || 0} onChange={(value) => updateElement(selectedElement.id, { frameStrokeWidthMm: value })} />
                                </div>
                                <ColorField label={text.frameFill} value={selectedElement.frameFill || "#FFFFFF"} fallback="#FFFFFF" onChange={(value) => updateElement(selectedElement.id, { frameFill: value })} recentColors={recentColors} />
                                <ColorField label={text.frameStroke} value={selectedElement.frameStroke || "#0F172A"} fallback="#0F172A" onChange={(value) => updateElement(selectedElement.id, { frameStroke: value })} recentColors={recentColors} />
                                <textarea className="plms-input min-h-28" value={selectedElement.content} onChange={(event) => updateElement(selectedElement.id, { content: event.target.value })} placeholder={text.imageDataPlaceholder} />
                                <button className="plms-button-secondary w-full" type="button" onClick={() => updateElement(selectedElement.id, { content: "" })}>{text.clearImage}</button>
                            </PropertySection>
                        ) : null}

                        {(selectedElement.type === "rect" || selectedElement.type === "ellipse" || selectedElement.type === "line") ? (
                            <PropertySection label={text.strokeAndFill}>
                                {selectedElement.type !== "line" ? <ToggleColorField label={text.fillColor} enabled={selectedElement.fill != null} value={selectedElement.fill ?? DEFAULT_RECT_FILL} fallback={DEFAULT_RECT_FILL} onChangeEnabled={(enabled) => updateElement(selectedElement.id, { fill: enabled ? DEFAULT_RECT_FILL : null })} onChangeValue={(value) => updateElement(selectedElement.id, { fill: value })} recentColors={recentColors} /> : null}
                                <ToggleColorField label={text.strokeColor} enabled={selectedElement.stroke != null} value={selectedElement.stroke ?? DEFAULT_SHAPE_STROKE} fallback={DEFAULT_SHAPE_STROKE} onChangeEnabled={(enabled) => updateElement(selectedElement.id, { stroke: enabled ? DEFAULT_SHAPE_STROKE : null, strokeWidthMm: enabled ? Math.max(selectedElement.strokeWidthMm || 0.4, 0.4) : selectedElement.strokeWidthMm })} onChangeValue={(value) => updateElement(selectedElement.id, { stroke: value })} recentColors={recentColors} />
                                {selectedElement.stroke != null ? (
                                    <PropertyField label={text.strokeWidthMm} type="number" step="0.1" value={selectedElement.strokeWidthMm || 0} onChange={(value) => updateElement(selectedElement.id, { strokeWidthMm: value })} />
                                ) : null}
                                {selectedElement.type === "line" ? <SelectField label={text.lineDirection} value={selectedElement.lineDirection || "horizontal"} options={["horizontal", "vertical"]} onChange={(value) => updateElement(selectedElement.id, { lineDirection: value as "horizontal" | "vertical" })} /> : null}
                            </PropertySection>
                        ) : null}
                    </>
                ) : null}
            </div>
        </aside>
    );
}

function EmptyAside({ className, text }: { className?: string; text: string }) {
    return <aside className={`custom-scrollbar h-full min-h-0 w-full min-w-0 shrink-0 overflow-y-auto overscroll-contain border-l border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5 pr-2 pb-8 ${className}`}><div className="rounded-2xl border border-dashed border-[color:var(--plms-border)] px-4 py-10 text-center text-sm font-medium text-[color:var(--plms-text-subtle)]">{text}</div></aside>;
}

function PropertySection({ label, children }: { label: string; children: React.ReactNode }) {
    return <section className="space-y-3 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{label}</div><div className="space-y-3">{children}</div></section>;
}

function PropertyField({ label, value, onChange, type = "text", step, placeholder }: { label: string; value: string | number; onChange: (value: any) => void; type?: string; step?: number | string; placeholder?: string }) {
    return <div><label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{label}</label><input className="plms-input" type={type} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(type === "number" ? Number(event.target.value) : event.target.value)} /></div>;
}

function ColorField({ label, value, fallback, onChange, recentColors = [] }: { label: string; value: string; fallback: string; onChange: (value: string) => void; recentColors?: string[] }) {
    const safeValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
    const handleChange = (val: string) => {
        onChange(val);
    };

    return (
        <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{label}</label>
            <div className="flex items-center gap-3">
                <input className="h-12 w-16 cursor-pointer rounded-2xl border border-[color:var(--plms-border)] bg-transparent p-1" type="color" value={safeValue} onChange={(event) => handleChange(event.target.value.toUpperCase())} />
                <input className="plms-input flex-1 font-mono uppercase" value={value} onChange={(event) => handleChange(event.target.value.toUpperCase())} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {recentColors.map((color) => (
                    <button key={color} type="button" onClick={() => handleChange(color)} className="h-5 w-5 rounded-md border border-[color:var(--plms-border-strong)] transition-transform hover:scale-110" style={{ backgroundColor: color }} aria-label={`Select color ${color}`} />
                ))}
            </div>
        </div>
    );
}

function ToggleColorField({ label, enabled, value, fallback, onChangeEnabled, onChangeValue, recentColors = [] }: { label: string; enabled: boolean; value: string; fallback: string; onChangeEnabled: (enabled: boolean) => void; onChangeValue: (value: string) => void; recentColors?: string[] }) {
    const safeValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
    const handleChange = (val: string) => {
        onChangeValue(val);
    };

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{label}</label>
                <button type="button" onClick={() => onChangeEnabled(!enabled)} className={`rounded text-[10px] px-1 font-bold uppercase tracking-wider ${enabled ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-slate-500 hover:bg-white/10"}`}>{enabled ? "ON" : "OFF"}</button>
            </div>
            {enabled ? (
                <>
                    <div className="flex items-center gap-3">
                        <input className="h-12 w-16 cursor-pointer rounded-2xl border border-[color:var(--plms-border)] bg-transparent p-1" type="color" value={safeValue} onChange={(event) => handleChange(event.target.value.toUpperCase())} />
                        <input className="plms-input flex-1 font-mono uppercase" value={value} onChange={(event) => handleChange(event.target.value.toUpperCase())} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {recentColors.map((color) => (
                            <button key={color} type="button" onClick={() => handleChange(color)} className="h-5 w-5 rounded-md border border-[color:var(--plms-border-strong)] transition-transform hover:scale-110" style={{ backgroundColor: color }} aria-label={`Select color ${color}`} />
                        ))}
                    </div>
                </>
            ) : (
                <div className="h-12 rounded-2xl border border-dashed border-white/10 bg-white/5 opacity-50 flex items-center justify-center cursor-pointer" onClick={() => onChangeEnabled(true)}>
                    <span className="text-xs text-slate-500 font-medium tracking-wide">Disabled</span>
                </div>
            )}
        </div>
    );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
    return <div><label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)]">{label}</label><select className="plms-select w-full" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}

function InlineNotice({ text, tone }: { text: string; tone: "info" | "warning" }) {
    const classes = tone === "warning" ? "border-amber-500/20 bg-amber-500/10 text-amber-200" : "border-blue-500/20 bg-blue-500/10 text-blue-200";
    return <div className={`rounded-2xl border px-3 py-3 text-xs font-medium ${classes}`}>{text}</div>;
}
