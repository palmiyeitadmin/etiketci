"use client";

import { ScreenPreviewProfile, UnitConverter } from "@/lib/unit-converter";

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

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 border-b border-white/10 bg-[linear-gradient(180deg,rgba(8,17,31,0.92),rgba(11,18,32,0.92))]">
        <div className="absolute left-0 top-0 h-8 w-8 border-r border-white/10 bg-[color:var(--plms-panel)]" />
        {horizontalTicks.map((tick) => {
          const x = labelX + UnitConverter.mmToProfile(tick.mm, ScreenPreviewProfile, zoom);
          return (
            <div key={`h-${tick.mm}`} className="absolute top-0" style={{ left: x + 8 }}>
              <div className={`w-px bg-white/35 ${tick.major ? "h-5" : "h-3"}`} />
              {tick.label ? <div className="mt-0.5 -translate-x-1/2 text-[9px] font-bold text-[color:var(--plms-text-subtle)]">{tick.label}</div> : null}
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 border-r border-white/10 bg-[linear-gradient(180deg,rgba(8,17,31,0.92),rgba(11,18,32,0.92))]">
        {verticalTicks.map((tick) => {
          const y = labelY + UnitConverter.mmToProfile(tick.mm, ScreenPreviewProfile, zoom);
          return (
            <div key={`v-${tick.mm}`} className="absolute left-0" style={{ top: y + 8 }}>
              <div className={`h-px bg-white/35 ${tick.major ? "w-5" : "w-3"}`} />
              {tick.label ? <div className="ml-1 -translate-y-1/2 text-[9px] font-bold text-[color:var(--plms-text-subtle)]">{tick.label}</div> : null}
            </div>
          );
        })}
      </div>
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
