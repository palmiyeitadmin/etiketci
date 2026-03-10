---
name: unit-conversion-and-layout
description: Teach the agent how to handle mm/dpi/dot/pixel conversions, layout rounding, alignment, and preview-vs-PDF consistency.
---
# Skill: Unit Conversion and Layout

## Purpose
Ensure all UI preview sizing matches the physical PDF dimensions. The PLMS uses physical units (mm) as the source of truth.

## Standard Flow
1. **Model:** Store coordinates and dimensions in mm.
2. **Editor Preview:** Convert mm to CSS pixels using a unified `UnitConverter` utility.
3. **PDF Generation:** Convert mm to raw points/PDF units on the backend via the same fundamental arithmetic.

## Allowed DPI
- The Epson CW-C4000e typically prints at 1200x1200dpi max, but label templates should be defined logically in millimeter dimensions (Width/Height) independent of printer DPI.
- For UI scaling, assume standard screen DPI (96 dpi) but keep logic isolated in `UnitConverter.ts`.

## Constraints
- Never scatter magic multiplier numbers in UI components. Always use `UnitConverter.mmToPx(val, zoomMap)` etc.
- Always handle fractional values with explicit rounding rules (e.g., standardizing on 2 decimal places for storage, browser native for layout).
