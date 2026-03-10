---
name: nextjs-editor-mvp
description: Teach the agent how to implement the editor UI with strict MVP scope and avoid overbuilding.
---
# Skill: Next.js Editor MVP

## Purpose
Keep the React/Next.js frontend focused on shipping a usable label designer without falling into the trap of building a full Figma clone.

## Core Editor State
- The editor must manage the `Canonical Label Model` JSON.
- Maintain a single root `State` (e.g., via Zustand or React Context).
- Implement standard Undo/Redo by snapshotting the JSON state.

## Allowed Features (MVP)
- Render elements: text, box, line, image, QR, barcode.
- Properties panel: Edit X, Y, Width, Height, Type, Content/Variable.
- Select element, move element (snap-to-grid).

## Prohibited Features (DO NOT BUILD YET)
- Auto Layout / Flexbox structures inside the label.
- Grouping/Ungrouping.
- Complex multi-select alignment tools.
- Complex rotation (limit to 0/90/180/270 degrees only if needed, else 0 only).

## Styling
- Use Tailwind CSS.
- Ensure Editor Preview scale respects the `UnitConverter` mm-to-pixel ratio.
