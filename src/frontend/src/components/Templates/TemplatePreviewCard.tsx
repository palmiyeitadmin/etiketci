"use client";

import { useMemo } from "react";
import { normalizeCanonicalLabelModel } from "@/lib/editor-canonical";
import { LabelTemplate, TemplateVersion } from "@/types/template";

const PREVIEW_WIDTH = 220;

export function TemplatePreviewCard({
  template,
  version,
}: {
  template: LabelTemplate;
  version?: TemplateVersion | null;
}) {
  const model = useMemo(() => {
    if (!version?.layoutJson) {
      return null;
    }

    try {
      return normalizeCanonicalLabelModel(JSON.parse(version.layoutJson), template.name);
    } catch {
      return null;
    }
  }, [template.name, version?.layoutJson]);

  if (!model) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-[1.8rem] border border-dashed border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] text-sm text-[color:var(--plms-text-subtle)]">
        Preview unavailable
      </div>
    );
  }

  const scale = PREVIEW_WIDTH / model.dimensions.widthMm;
  const previewHeight = Math.max(180, model.dimensions.heightMm * scale);

  return (
    <div className="rounded-[1.8rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
      <div className="relative mx-auto overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]" style={{ width: PREVIEW_WIDTH, height: previewHeight }}>
        {model.elements.filter((element) => element.visible !== false).map((element) => (
          <div
            key={element.id}
            className="absolute overflow-hidden"
            style={{
              left: element.xMm * scale,
              top: element.yMm * scale,
              width: Math.max(1, element.widthMm * scale),
              height: Math.max(1, element.heightMm * scale),
              transform: `rotate(${element.rotation || 0}deg)`,
              transformOrigin: "center center",
              color: element.fill || "#0f172a",
              border: element.type === "rect" || element.type === "ellipse" ? `${Math.max(1, (element.strokeWidthMm || 0.3) * scale)}px solid ${element.stroke || "transparent"}` : undefined,
              borderRadius: element.type === "ellipse" ? "9999px" : undefined,
              background: element.type === "rect" || element.type === "ellipse" ? element.fill || "transparent" : undefined,
            }}
          >
            {element.type === "text" ? (
              <div className="h-full w-full truncate font-bold" style={{ fontSize: Math.max(8, (element.fontSizePt || 12) * 0.7), textAlign: element.textAlign || "left" }}>
                {element.content}
              </div>
            ) : null}
            {element.type === "line" ? <div className="h-full w-full" style={{ background: element.stroke || "#0f172a" }} /> : null}
            {element.type === "barcode" || element.type === "qr" ? <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{element.type}</div> : null}
            {element.type === "image" ? <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">asset</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
