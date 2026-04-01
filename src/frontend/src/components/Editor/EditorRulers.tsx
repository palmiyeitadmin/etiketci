"use client";

import { useEditorStore } from "@/components/Editor/useEditorStore";
import { ScreenPreviewProfile, UnitConverter } from "@/lib/unit-converter";
import { useState, useRef, useEffect } from "react";

export function EditorRulers({
  labelWidthMm,
  labelHeightMm,
  labelX,
  labelY,
  zoom,
}: {
  labelWidthMm: number;
  labelHeightMm: number;
  labelX: number;
  labelY: number;
  zoom: number;
}) {
  const addCustomGuide = useEditorStore((state) => state.addCustomGuide);
  const customGuides = useEditorStore((state) => state.customGuides);
  const removeCustomGuide = useEditorStore((state) => state.removeCustomGuide);
  
  const [dragGuide, setDragGuide] = useState<{ orientation: "horizontal" | "vertical"; offsetMm: number } | null>(null);
  const [mousePosMm, setMousePosMm] = useState<{ x: number; y: number } | null>(null);
  const horizontalTicks = buildTicks(labelWidthMm, zoom);
  const verticalTicks = buildTicks(labelHeightMm, zoom);

  const handleMouseDown = (orientation: "horizontal" | "vertical", e: React.MouseEvent) => {
    e.stopPropagation();
    setDragGuide({ orientation, offsetMm: 0 });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Section starts after Toolrail.
      const editorArea = document.querySelector("section");
      if (!editorArea) return;

      const rect = editorArea.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const mmX = UnitConverter.profileToMm(mouseX - labelX, ScreenPreviewProfile, zoom);
      const mmY = UnitConverter.profileToMm(mouseY - labelY, ScreenPreviewProfile, zoom);

      setMousePosMm({ x: mmX, y: mmY });

      if (dragGuide) {
        if (dragGuide.orientation === "horizontal") {
          setDragGuide({ ...dragGuide, offsetMm: mmX });
        } else {
          setDragGuide({ ...dragGuide, offsetMm: mmY });
        }
      }
    };

    const handleMouseUp = () => {
      if (dragGuide && dragGuide.offsetMm >= 0 && dragGuide.offsetMm <= (dragGuide.orientation === "horizontal" ? labelWidthMm : labelHeightMm)) {
        addCustomGuide({ orientation: dragGuide.orientation, positionMm: dragGuide.offsetMm });
      }
      setDragGuide(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragGuide, labelX, labelY, zoom, labelWidthMm, labelHeightMm, addCustomGuide]);

  return (
    <>
      {/* Horizontal Ruler */}
      <div 
        className="absolute inset-x-0 top-0 z-[60] h-8 border-b border-white/10 bg-[linear-gradient(180deg,rgba(8,17,31,0.92),rgba(11,18,32,0.92))] cursor-n-resize pointer-events-auto"
        onMouseDown={(e) => handleMouseDown("vertical", e)}
      >
        <div className="absolute left-0 top-0 h-8 w-8 border-r border-white/10 bg-[color:var(--plms-panel)] cursor-default pointer-events-none" />
        {horizontalTicks.map((tick) => {
          const x = labelX + UnitConverter.mmToProfile(tick.mm, ScreenPreviewProfile, zoom);
          return (
            <div key={`h-${tick.mm}`} className="absolute top-0 pointer-events-none" style={{ left: x + 8 }}>
              <div className={`w-px bg-white/35 ${tick.major ? "h-5" : "h-3"}`} />
              {tick.label ? <div className="mt-0.5 -translate-x-1/2 text-[9px] font-bold text-[color:var(--plms-text-subtle)]">{tick.label}</div> : null}
            </div>
          );
        })}
        {mousePosMm && (
          <div 
            className="absolute top-0 h-8 w-px bg-blue-400/80 shadow-[0_0_8px_rgba(96,165,250,0.5)] pointer-events-none transition-transform duration-75"
            style={{ left: labelX + UnitConverter.mmToProfile(mousePosMm.x, ScreenPreviewProfile, zoom) + 8 }}
          />
        )}
      </div>

      {/* Vertical Ruler */}
      <div 
        className="absolute inset-y-0 left-0 z-[60] w-8 border-r border-white/10 bg-[linear-gradient(180deg,rgba(8,17,31,0.92),rgba(11,18,32,0.92))] cursor-e-resize pointer-events-auto"
        onMouseDown={(e) => handleMouseDown("horizontal", e)}
      >
        {verticalTicks.map((tick) => {
          const y = labelY + UnitConverter.mmToProfile(tick.mm, ScreenPreviewProfile, zoom);
          return (
            <div key={`v-${tick.mm}`} className="absolute left-0 pointer-events-none" style={{ top: y + 8 }}>
              <div className={`h-px bg-white/35 ${tick.major ? "w-5" : "w-3"}`} />
              {tick.label ? <div className="ml-1 -translate-y-1/2 text-[9px] font-bold text-[color:var(--plms-text-subtle)]">{tick.label}</div> : null}
            </div>
          );
        })}
        {mousePosMm && (
          <div 
            className="absolute left-0 w-8 h-px bg-blue-400/80 shadow-[0_0_8px_rgba(96,165,250,0.5)] pointer-events-none transition-transform duration-75"
            style={{ top: labelY + UnitConverter.mmToProfile(mousePosMm.y, ScreenPreviewProfile, zoom) + 8 }}
          />
        )}
      </div>

      {/* Actual Guide Markers on Rulers */}
      {customGuides.map((guide) => (
        <div
          key={guide.id}
          className="absolute z-[70] pointer-events-auto group"
          style={
            guide.orientation === "horizontal"
              ? { left: 0, top: labelY + UnitConverter.mmToProfile(guide.positionMm, ScreenPreviewProfile, zoom) + 8 - 4, width: 8, height: 8 }
              : { top: 0, left: labelX + UnitConverter.mmToProfile(guide.positionMm, ScreenPreviewProfile, zoom) + 8 - 4, width: 8, height: 8 }
          }
          onDoubleClick={() => removeCustomGuide(guide.id)}
          title="Kilavuzu silmek icin cift tiklayin"
        >
          <div className={`m-auto rounded-full bg-blue-400 shadow-sm shadow-blue-400/50 ${guide.orientation === "horizontal" ? "h-0.5 w-full cursor-row-resize" : "h-full w-0.5 cursor-col-resize"} transition-transform group-hover:scale-150`} />
        </div>
      ))}

      {/* Dragging Preview */}
      {dragGuide && (
        <div
          className="pointer-events-none fixed z-[100] border-blue-400/50"
          style={
            dragGuide.orientation === "horizontal"
              ? { top: labelY + UnitConverter.mmToProfile(dragGuide.offsetMm, ScreenPreviewProfile, zoom) + 8, left: 0, right: 0, borderTopWidth: 1, borderTopStyle: "dashed" }
              : { left: labelX + UnitConverter.mmToProfile(dragGuide.offsetMm, ScreenPreviewProfile, zoom) + 8, top: 0, bottom: 0, borderLeftWidth: 1, borderLeftStyle: "dashed" }
          }
        />
      )}
    </>
  );
}

function buildTicks(lengthMm: number, zoom: number) {
  const ticks: Array<{ mm: number; major: boolean; label?: string }> = [];
  const step = zoom < 0.5 ? 10 : 1;
  for (let mm = 0; mm <= lengthMm; mm += step) {
    const major = mm % 10 === 0;
    ticks.push({
      mm,
      major,
      label: major ? `${mm}` : undefined,
    });
  }
  return ticks;
}
