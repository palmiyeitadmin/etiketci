"use client";

import { useMemo } from "react";
import { normalizeCanonicalLabelModel } from "@/lib/editor-canonical";
import { useI18n } from "@/lib/i18n";
import { LabelProof } from "@/components/ui/LabelProof";
import { LabelTemplate, TemplateVersion } from "@/types/template";

/** The longest side of the preview in px. */
const PREVIEW_MAX = 280;
const MM_PER_PT = 0.3528;

export function TemplatePreviewCard({
  template,
  version,
}: {
  template: LabelTemplate;
  version?: TemplateVersion | null;
}) {
  const { locale } = useI18n();
  const text = locale === "tr"
    ? { unavailable: "Önizleme yok", barcode: "Barkod", qr: "QR", image: "Görsel" }
    : { unavailable: "No preview", barcode: "Barcode", qr: "QR", image: "Image" };

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

  if (!model || model.dimensions.widthMm <= 0 || model.dimensions.heightMm <= 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-line-strong bg-canvas text-sm text-ink-3">
        {text.unavailable}
      </div>
    );
  }

  const { widthMm, heightMm } = model.dimensions;
  const previewWidth = widthMm >= heightMm ? PREVIEW_MAX : (PREVIEW_MAX * widthMm) / heightMm;
  const scale = previewWidth / widthMm;
  const placeholderClass = "flex h-full w-full items-center justify-center bg-raised font-mono text-xs text-ink-3";

  return (
    <div className="flex justify-center rounded-xl border border-line bg-canvas px-8 pb-5 pt-8">
      <div style={{ width: previewWidth }}>
        <LabelProof widthMm={widthMm} heightMm={heightMm} caption={version ? `v${version.versionNumber}` : undefined}>
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
                <div
                  className="h-full w-full truncate leading-tight"
                  style={{ fontSize: Math.max(6, (element.fontSizePt || 12) * MM_PER_PT * scale), textAlign: element.textAlign || "left" }}
                >
                  {element.content}
                </div>
              ) : null}
              {element.type === "line" ? <div className="h-full w-full" style={{ background: element.stroke || "#0f172a" }} /> : null}
              {element.type === "barcode" ? <div className={placeholderClass}>{text.barcode}</div> : null}
              {element.type === "qr" ? <div className={placeholderClass}>{text.qr}</div> : null}
              {element.type === "image" ? (
                element.assetId ? (
                  <img src={`/api/assets/${element.assetId}/content`} alt="" className="h-full w-full" style={{ objectFit: (element.imageFit as any) || "contain" }} />
                ) : (
                  <div className={placeholderClass}>{text.image}</div>
                )
              ) : null}
            </div>
          ))}
        </LabelProof>
      </div>
    </div>
  );
}
