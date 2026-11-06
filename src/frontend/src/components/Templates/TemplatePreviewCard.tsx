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
      <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-line bg-raised text-sm text-ink-3">
        Preview unavailable
      </div>
    );
  }

  const scale = PREVIEW_WIDTH / model.dimensions.widthMm;
  const previewHeight = Math.max(180, model.dimensions.heightMm * scale);

  return (
    <div className="rounded-xl border border-line bg-raised p-4">
      <div className="relative mx-auto overflow-hidden rounded-lg border border-line bg-white" style={{ width: PREVIEW_WIDTH, height: previewHeight }}>
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
              <div className="h-full w-full truncate font-medium" style={{ fontSize: Math.max(8, (element.fontSizePt || 12) * 0.7), textAlign: element.textAlign || "left" }}>
                {element.content}
              </div>
            ) : null}
            {element.type === "line" ? <div className="h-full w-full" style={{ background: element.stroke || "#0f172a" }} /> : null}
            {element.type === "barcode" || element.type === "qr" ? <div className="flex h-full w-full items-center justify-center bg-raised text-xs font-medium text-ink-3">{element.type}</div> : null}
            {element.type === "image" ? (
                element.assetId ? (
                    <img src={`/api/assets/${element.assetId}/content`} alt="Asset" className="h-full w-full" style={{ objectFit: (element.imageFit as any) || "contain" }} />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-raised text-xs font-medium text-ink-3">asset</div>
                )
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
