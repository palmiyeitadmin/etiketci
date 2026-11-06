"use client";

import { ScreenPreviewProfile, UnitConverter } from "@/lib/unit-converter";

const RULER = 24;
const MARK = 12;
const MARK_GAP = 4;

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
  const horizontalTicks = buildTicks(labelWidthMm, zoom);
  const verticalTicks = buildTicks(labelHeightMm, zoom);
  const labelWidth = UnitConverter.mmToProfile(labelWidthMm, ScreenPreviewProfile, zoom);
  const labelHeight = UnitConverter.mmToProfile(labelHeightMm, ScreenPreviewProfile, zoom);
  const right = labelX + labelWidth;
  const bottom = labelY + labelHeight;

  // Crop marks just outside each corner of the label, as on a print proof.
  const cropMarks = [
    { left: labelX - MARK_GAP - MARK, top: labelY, width: MARK, height: 1 },
    { left: labelX, top: labelY - MARK_GAP - MARK, width: 1, height: MARK },
    { left: right + MARK_GAP, top: labelY, width: MARK, height: 1 },
    { left: right - 1, top: labelY - MARK_GAP - MARK, width: 1, height: MARK },
    { left: labelX - MARK_GAP - MARK, top: bottom - 1, width: MARK, height: 1 },
    { left: labelX, top: bottom + MARK_GAP, width: 1, height: MARK },
    { left: right + MARK_GAP, top: bottom - 1, width: MARK, height: 1 },
    { left: right - 1, top: bottom + MARK_GAP, width: 1, height: MARK },
  ];

  return (
    <>
      {cropMarks.map((mark, index) => (
        <div key={`crop-${index}`} aria-hidden className="pointer-events-none absolute z-10 bg-ink-3" style={mark} />
      ))}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden border-b border-line bg-surface" style={{ height: RULER }}>
        {horizontalTicks.map((tick) => {
          const x = labelX + UnitConverter.mmToProfile(tick.mm, ScreenPreviewProfile, zoom);
          return (
            <div key={`h-${tick.mm}`} className="absolute bottom-0" style={{ left: x }}>
              <div className={`w-px ${tick.major ? "h-3 bg-ink-3" : tick.mid ? "h-2 bg-line-strong" : "h-1 bg-line-strong"}`} />
              {tick.label ? <div className="absolute bottom-2.5 left-1 font-mono text-xs leading-none tabular text-ink-3">{tick.label}</div> : null}
            </div>
          );
        })}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 overflow-hidden border-r border-line bg-surface" style={{ width: RULER }}>
        {verticalTicks.map((tick) => {
          const y = labelY + UnitConverter.mmToProfile(tick.mm, ScreenPreviewProfile, zoom);
          return (
            <div key={`v-${tick.mm}`} className="absolute inset-x-0 h-px" style={{ top: y }}>
              <div className={`ml-auto h-px ${tick.major ? "w-3 bg-ink-3" : tick.mid ? "w-2 bg-line-strong" : "w-1 bg-line-strong"}`} />
              {tick.label ? <div className="absolute left-0.5 top-1 font-mono text-xs leading-none tabular text-ink-3">{tick.label}</div> : null}
            </div>
          );
        })}
      </div>
      <div aria-hidden className="pointer-events-none absolute left-0 top-0 z-10 border-b border-r border-line bg-surface" style={{ width: RULER, height: RULER }} />
    </>
  );
}

function buildTicks(lengthMm: number, zoom: number) {
  const ticks: Array<{ mm: number; major: boolean; mid: boolean; label?: string }> = [];
  const step = zoom < 0.5 ? 10 : 1;
  for (let mm = 0; mm <= lengthMm; mm += step) {
    const major = mm % 10 === 0;
    ticks.push({
      mm,
      major,
      mid: !major && mm % 5 === 0,
      label: major ? `${mm}` : undefined,
    });
  }
  return ticks;
}
