"use client";

import { useMemo, useState } from "react";
import {
  AlignCenterHorizontalSimple,
  CopySimple,
  ImageSquare,
  Rows,
  SelectionPlus,
  SelectionSlash,
  Square,
  TextT,
  TrashSimple,
  type Icon,
} from "@phosphor-icons/react";
import { EditorAlignmentReference, ImageFit, TextAlign, TextTransform } from "@/types/canvas";
import { useI18n } from "@/lib/i18n";

type ToolbarMenu = "align" | "arrange" | "text" | "image" | "shape" | null;

interface TextStyleState {
  fontSizePt?: number;
  fontWeight?: "normal" | "bold";
  textAlign?: TextAlign;
  lineHeight?: number;
  letterSpacingPt?: number;
  textTransform?: TextTransform;
}

interface ImageStyleState {
  imageFit?: ImageFit;
  imageAlignX?: "left" | "center" | "right";
  imageAlignY?: "top" | "middle" | "bottom";
  cornerRadiusMm?: number;
}

interface ShapeStyleState {
  fill?: string | null;
  stroke?: string | null;
  strokeWidthMm?: number;
}

export function SelectionToolbar({
  anchor,
  summary,
  canGroup,
  canUngroup,
  canDistribute,
  canRotate,
  isHidden,
  isLocked,
  alignmentReference,
  textStyle,
  imageStyle,
  shapeStyle,
  onSetAlignmentReference,
  onAlign,
  onDistribute,
  onMatchSize,
  onReorder,
  onToggleVisibility,
  onToggleLock,
  onRotateLeft,
  onRotateRight,
  onGroup,
  onUngroup,
  onDuplicate,
  onDelete,
  onUpdateTextStyle,
  onUpdateImageStyle,
  onUpdateShapeStyle,
}: {
  anchor: { left: number; top: number; placement: "top" | "bottom" };
  summary: string;
  canGroup: boolean;
  canUngroup: boolean;
  canDistribute: boolean;
  canRotate: boolean;
  isHidden: boolean;
  isLocked: boolean;
  alignmentReference: EditorAlignmentReference;
  textStyle?: TextStyleState | null;
  imageStyle?: ImageStyleState | null;
  shapeStyle?: ShapeStyleState | null;
  onSetAlignmentReference: (reference: EditorAlignmentReference) => void;
  onAlign: (mode: "left" | "center-horizontal" | "right" | "top" | "middle" | "bottom") => void;
  onDistribute: (mode: "horizontal" | "vertical") => void;
  onMatchSize: (mode: "width" | "height") => void;
  onReorder: (mode: "forward" | "backward" | "front" | "back") => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdateTextStyle: (updates: Partial<TextStyleState>) => void;
  onUpdateImageStyle: (updates: Partial<ImageStyleState>) => void;
  onUpdateShapeStyle: (updates: Partial<ShapeStyleState>) => void;
}) {
  const { locale } = useI18n();
  const [openMenu, setOpenMenu] = useState<ToolbarMenu>(null);
  const text = useMemo(() => locale === "tr"
    ? {
        arrange: "Yerleşim",
        align: "Hizala",
        text: "Metin",
        image: "Görsel",
        shape: "Şekil",
        group: "Grupla",
        ungroup: "Ayır",
        duplicate: "Çoğalt",
        delete: "Sil",
        selection: "Seçim",
        canvas: "Tuval",
        show: "Göster",
        hide: "Gizle",
        lock: "Kilitle",
        unlock: "Kilidi Aç",
        rotateLeft: "Sola 90°",
        rotateRight: "Sağa 90°",
        forward: "İleri",
        backward: "Geri",
        front: "Öne",
        back: "Arkaya",
        distributeH: "Yatay dağıt",
        distributeV: "Dikey dağıt",
        matchWidth: "Genişliği eşitle",
        matchHeight: "Yüksekliği eşitle",
        fill: "Dolgu",
        stroke: "Kenar",
        strokeWidth: "Kenar (mm)",
        fit: "Fit",
        alignX: "X",
        alignY: "Y",
        radius: "Radius (mm)",
        fontSize: "Boyut",
        bold: "Kalın",
        normal: "Normal",
        lineHeight: "Satır",
        letterSpacing: "Harf",
        transform: "Dönüşüm",
        alignLeft: "Sola",
        alignCenter: "Merkez",
        alignRight: "Sağa",
        alignTop: "Üste",
        alignMiddle: "Ortaya",
        alignBottom: "Alta",
        textAlignLeft: "Sola",
        textAlignCenter: "Orta",
        textAlignRight: "Sağa",
      }
    : {
        arrange: "Arrange",
        align: "Align",
        text: "Text",
        image: "Image",
        shape: "Shape",
        group: "Group",
        ungroup: "Ungroup",
        duplicate: "Duplicate",
        delete: "Delete",
        selection: "Selection",
        canvas: "Canvas",
        show: "Show",
        hide: "Hide",
        lock: "Lock",
        unlock: "Unlock",
        rotateLeft: "Rotate Left",
        rotateRight: "Rotate Right",
        forward: "Forward",
        backward: "Backward",
        front: "To Front",
        back: "To Back",
        distributeH: "Distribute H",
        distributeV: "Distribute V",
        matchWidth: "Match width",
        matchHeight: "Match height",
        fill: "Fill",
        stroke: "Stroke",
        strokeWidth: "Stroke (mm)",
        fit: "Fit",
        alignX: "X",
        alignY: "Y",
        radius: "Radius (mm)",
        fontSize: "Size",
        bold: "Bold",
        normal: "Normal",
        lineHeight: "Line height",
        letterSpacing: "Letter",
        transform: "Transform",
        alignLeft: "Left",
        alignCenter: "Center",
        alignRight: "Right",
        alignTop: "Top",
        alignMiddle: "Middle",
        alignBottom: "Bottom",
        textAlignLeft: "Left",
        textAlignCenter: "Center",
        textAlignRight: "Right",
      }, [locale]);

  const placementClass = anchor.placement === "top" ? "bottom-full mb-3" : "top-full mt-3";

  return (
    <div
      className={`absolute z-30 -translate-x-1/2 ${placementClass}`}
      style={{ left: anchor.left, top: anchor.top }}
    >
      <div className="min-w-[23rem] max-w-[34rem] rounded-2xl border border-white/12 bg-[#0f1b2f]/96 px-3 py-3 shadow-[0_26px_80px_rgba(2,6,23,0.62)] ring-1 ring-white/6 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="max-w-[9rem] truncate rounded-xl border border-blue-300/35 bg-[#19345d] px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" title={summary}>
            {summary}
          </div>
          <ToolbarButton icon={Rows} label={text.arrange} active={openMenu === "arrange"} onClick={() => setOpenMenu((current) => current === "arrange" ? null : "arrange")} />
          <ToolbarButton icon={AlignCenterHorizontalSimple} label={text.align} active={openMenu === "align"} onClick={() => setOpenMenu((current) => current === "align" ? null : "align")} />
          {textStyle ? <ToolbarButton icon={TextT} label={text.text} active={openMenu === "text"} onClick={() => setOpenMenu((current) => current === "text" ? null : "text")} /> : null}
          {imageStyle ? <ToolbarButton icon={ImageSquare} label={text.image} active={openMenu === "image"} onClick={() => setOpenMenu((current) => current === "image" ? null : "image")} /> : null}
          {shapeStyle ? <ToolbarButton icon={Square} label={text.shape} active={openMenu === "shape"} onClick={() => setOpenMenu((current) => current === "shape" ? null : "shape")} /> : null}
          {canUngroup ? <ToolbarButton icon={SelectionSlash} label={text.ungroup} onClick={onUngroup} /> : null}
          {canGroup ? <ToolbarButton icon={SelectionPlus} label={text.group} onClick={onGroup} /> : null}
          <ToolbarButton icon={CopySimple} label={text.duplicate} onClick={onDuplicate} />
          <ToolbarButton icon={TrashSimple} label={text.delete} tone="danger" onClick={onDelete} />
        </div>

        {openMenu ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-[#13233b] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {openMenu === "arrange" ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <ToolbarMiniButton onClick={() => onReorder("forward")}>{text.forward}</ToolbarMiniButton>
                <ToolbarMiniButton onClick={() => onReorder("backward")}>{text.backward}</ToolbarMiniButton>
                <ToolbarMiniButton onClick={() => onReorder("front")}>{text.front}</ToolbarMiniButton>
                <ToolbarMiniButton onClick={() => onReorder("back")}>{text.back}</ToolbarMiniButton>
                <ToolbarMiniButton onClick={onToggleVisibility}>{isHidden ? text.show : text.hide}</ToolbarMiniButton>
                <ToolbarMiniButton onClick={onToggleLock}>{isLocked ? text.unlock : text.lock}</ToolbarMiniButton>
                {canRotate ? <ToolbarMiniButton onClick={onRotateLeft}>{text.rotateLeft}</ToolbarMiniButton> : null}
                {canRotate ? <ToolbarMiniButton onClick={onRotateRight}>{text.rotateRight}</ToolbarMiniButton> : null}
              </div>
            ) : null}

            {openMenu === "align" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ToolbarMiniButton active={alignmentReference === "selection"} onClick={() => onSetAlignmentReference("selection")}>{text.selection}</ToolbarMiniButton>
                  <ToolbarMiniButton active={alignmentReference === "canvas"} onClick={() => onSetAlignmentReference("canvas")}>{text.canvas}</ToolbarMiniButton>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <ToolbarMiniButton onClick={() => onAlign("left")}>{text.alignLeft}</ToolbarMiniButton>
                  <ToolbarMiniButton onClick={() => onAlign("center-horizontal")}>{text.alignCenter}</ToolbarMiniButton>
                  <ToolbarMiniButton onClick={() => onAlign("right")}>{text.alignRight}</ToolbarMiniButton>
                  <ToolbarMiniButton onClick={() => onAlign("top")}>{text.alignTop}</ToolbarMiniButton>
                  <ToolbarMiniButton onClick={() => onAlign("middle")}>{text.alignMiddle}</ToolbarMiniButton>
                  <ToolbarMiniButton onClick={() => onAlign("bottom")}>{text.alignBottom}</ToolbarMiniButton>
                  <ToolbarMiniButton onClick={() => onMatchSize("width")}>{text.matchWidth}</ToolbarMiniButton>
                  <ToolbarMiniButton onClick={() => onMatchSize("height")}>{text.matchHeight}</ToolbarMiniButton>
                  <div />
                  <ToolbarMiniButton disabled={!canDistribute} onClick={() => onDistribute("horizontal")}>{text.distributeH}</ToolbarMiniButton>
                  <ToolbarMiniButton disabled={!canDistribute} onClick={() => onDistribute("vertical")}>{text.distributeV}</ToolbarMiniButton>
                </div>
              </div>
            ) : null}

            {openMenu === "text" && textStyle ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <InlineField label={text.fontSize}>
                  <input className="plms-input h-10" type="number" value={textStyle.fontSizePt ?? 12} onChange={(event) => onUpdateTextStyle({ fontSizePt: Number(event.target.value) })} />
                </InlineField>
                <InlineField label={text.lineHeight}>
                  <input className="plms-input h-10" type="number" step="0.1" value={textStyle.lineHeight ?? 1} onChange={(event) => onUpdateTextStyle({ lineHeight: Number(event.target.value) })} />
                </InlineField>
                <InlineField label={text.letterSpacing}>
                  <input className="plms-input h-10" type="number" step="0.1" value={textStyle.letterSpacingPt ?? 0} onChange={(event) => onUpdateTextStyle({ letterSpacingPt: Number(event.target.value) })} />
                </InlineField>
                <InlineField label={text.transform}>
                  <select className="plms-select h-10 w-full" value={textStyle.textTransform ?? "none"} onChange={(event) => onUpdateTextStyle({ textTransform: event.target.value as TextTransform })}>
                    <option value="none">none</option>
                    <option value="uppercase">uppercase</option>
                    <option value="lowercase">lowercase</option>
                  </select>
                </InlineField>
                <div className="col-span-2 flex items-end gap-2 md:col-span-4">
                  <ToolbarMiniButton active={textStyle.fontWeight === "normal"} onClick={() => onUpdateTextStyle({ fontWeight: "normal" })}>{text.normal}</ToolbarMiniButton>
                  <ToolbarMiniButton active={textStyle.fontWeight === "bold"} onClick={() => onUpdateTextStyle({ fontWeight: "bold" })}>{text.bold}</ToolbarMiniButton>
                  <ToolbarMiniButton active={textStyle.textAlign === "left"} onClick={() => onUpdateTextStyle({ textAlign: "left" })}>{text.textAlignLeft}</ToolbarMiniButton>
                  <ToolbarMiniButton active={textStyle.textAlign === "center"} onClick={() => onUpdateTextStyle({ textAlign: "center" })}>{text.textAlignCenter}</ToolbarMiniButton>
                  <ToolbarMiniButton active={textStyle.textAlign === "right"} onClick={() => onUpdateTextStyle({ textAlign: "right" })}>{text.textAlignRight}</ToolbarMiniButton>
                </div>
              </div>
            ) : null}

            {openMenu === "image" && imageStyle ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <InlineField label={text.fit}>
                  <select className="plms-select h-10 w-full" value={imageStyle.imageFit ?? "contain"} onChange={(event) => onUpdateImageStyle({ imageFit: event.target.value as ImageFit })}>
                    <option value="contain">contain</option>
                    <option value="cover">cover</option>
                    <option value="stretch">stretch</option>
                  </select>
                </InlineField>
                <InlineField label={text.alignX}>
                  <select className="plms-select h-10 w-full" value={imageStyle.imageAlignX ?? "center"} onChange={(event) => onUpdateImageStyle({ imageAlignX: event.target.value as "left" | "center" | "right" })}>
                    <option value="left">left</option>
                    <option value="center">center</option>
                    <option value="right">right</option>
                  </select>
                </InlineField>
                <InlineField label={text.alignY}>
                  <select className="plms-select h-10 w-full" value={imageStyle.imageAlignY ?? "middle"} onChange={(event) => onUpdateImageStyle({ imageAlignY: event.target.value as "top" | "middle" | "bottom" })}>
                    <option value="top">top</option>
                    <option value="middle">middle</option>
                    <option value="bottom">bottom</option>
                  </select>
                </InlineField>
                <InlineField label={text.radius}>
                  <input className="plms-input h-10" type="number" step="0.1" value={imageStyle.cornerRadiusMm ?? 0} onChange={(event) => onUpdateImageStyle({ cornerRadiusMm: Number(event.target.value) })} />
                </InlineField>
              </div>
            ) : null}

            {openMenu === "shape" && shapeStyle ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <InlineField label={text.fill}>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className={`flex-none h-10 w-10 border rounded-xl flex items-center justify-center transition-colors ${shapeStyle.fill ? "border-blue-400/50 bg-[#2258d6]/30 text-blue-100" : "border-white/10 bg-[#16263f] hover:bg-[#203452] text-slate-400"}`}
                      onClick={() => onUpdateShapeStyle({ fill: shapeStyle.fill ? null : "#E2E8F0" })}
                      title={text.fill}
                    >
                      <Square size={16} weight="fill" />
                    </button>
                    {shapeStyle.fill ? (
                      <input className="h-10 w-full min-w-0 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1" type="color" value={shapeStyle.fill || "#e2e8f0"} onChange={(event) => onUpdateShapeStyle({ fill: event.target.value.toUpperCase() })} />
                    ) : null}
                  </div>
                </InlineField>
                <InlineField label={text.stroke}>
                  <div className="flex gap-1.5">
                     <button
                      type="button"
                      className={`flex-none h-10 w-10 border rounded-xl flex items-center justify-center transition-colors ${shapeStyle.stroke ? "border-blue-400/50 bg-[#2258d6]/30 text-blue-100" : "border-white/10 bg-[#16263f] hover:bg-[#203452] text-slate-400"}`}
                      onClick={() => onUpdateShapeStyle({ stroke: shapeStyle.stroke ? null : "#0F172A", strokeWidthMm: shapeStyle.stroke ? shapeStyle.strokeWidthMm : Math.max(shapeStyle.strokeWidthMm || 0.4, 0.4) })}
                      title={text.stroke}
                    >
                      <Square size={16} weight="bold" />
                    </button>
                    {shapeStyle.stroke ? (
                      <input className="h-10 w-full min-w-0 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1" type="color" value={shapeStyle.stroke || "#0f172a"} onChange={(event) => onUpdateShapeStyle({ stroke: event.target.value.toUpperCase() })} />
                    ) : null}
                  </div>
                </InlineField>
                {shapeStyle.stroke ? (
                  <InlineField label={text.strokeWidth}>
                    <input className="plms-input h-10" type="number" step="0.1" value={shapeStyle.strokeWidthMm ?? 0.4} onChange={(event) => onUpdateShapeStyle({ strokeWidthMm: Number(event.target.value) })} />
                  </InlineField>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: IconComponent,
  label,
  onClick,
  active = false,
  tone = "default",
}: {
  icon: Icon;
  label: string;
  onClick: () => void;
  active?: boolean;
  tone?: "default" | "danger";
}) {
  const toneClass = tone === "danger"
    ? "border-red-400/35 bg-[#3d1722] text-red-50 hover:border-red-300/50 hover:bg-[#542030]"
    : active
      ? "border-blue-300/40 bg-[#2258d6] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      : "border-white/10 bg-[#16263f] text-slate-100 hover:border-white/20 hover:bg-[#203452] hover:text-white";

  return (
    <button
      type="button"
      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${toneClass}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <IconComponent size={18} weight={active ? "fill" : "bold"} />
    </button>
  );
}

function ToolbarMiniButton({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-11 min-w-0 items-center justify-center rounded-xl border px-3 text-[11px] font-black uppercase tracking-[0.16em] transition-colors ${
        active
          ? "border-blue-300/40 bg-[#2258d6] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-white/10 bg-[#172842] text-slate-100 hover:border-white/20 hover:bg-[#203452] hover:text-white"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function InlineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">{label}</span>
      {children}
    </label>
  );
}
