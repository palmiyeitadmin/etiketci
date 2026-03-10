# Architecture: Editor Foundation

## Overview
The PLMS Label Editor is a controlled, desktop-first industrial layout tool designed for precise label placement. It operates directly on the **Canonical Label Model** (JSON) and utilizes a centralized **UnitConverter** to ensure physical consistency.

## Core Principles
1. **Millimeters (mm) as Truth:** All geometry (X, Y, Width, Height) is persisted in millimeters. Screen pixels (px) and printer dots are derived units used only for display or execution.
2. **Version Safety:** The editor strictly prevents in-place editing of `Published` versions. It enforces a "Revision" workflow where a new `Draft` is created from a published source before editing begins.
3. **Vendor Neutrality:** The editor state is independent of Epson or Zebra command languages.

## Component Architecture
- `EditorWorkspace`: Manages the overall editor state (Model, Selection, Zoom, History).
- `Canvas`: Renders the mm-based model into a px-based viewport. It handles pointer-driven interactions (Drag & Resize).
- `PropertyPanel`: Provides numeric and configuration controls for the selected element.
- `UnitConverter`: Centralizes all rounding, conversion, and grid-snapping logic.

## Coordinate System & Scaling
- **Default DPI:** 96 DPI for screen rendering.
- **Scaling Formula:** `px = (mm * 96) / 25.4 * zoom`.
- **Snapping:** Basic 1mm grid snapping is enforced to prevent fractional drift in industrial printing.

## Multi-Element Support (MVP)
The following element types are supported in the foundation:
- **Text:** Configurable content, font size (pt), and family.
- **Rectangle:** Solid or stroked shapes for dividers and frames.
- **Line:** Horizontal/Vertical separators.
- **Barcode & QR:** Placeholders that map logic to future renderer.
- **Image:** Bounding box placeholders for static/dynamic assets.

## Preview Foundation
The current editor provides a high-fidelity visual preview on the canvas. However, this is labeled as a **Layout Preview**. Formal PDF-accurate preview is a separate downstream concern handled by the backend printer engine.

## Versioning & API Integration
1. **Fetch:** Load `LabelTemplate` with `Versions`.
2. **Session Logic:** Identify the latest `Draft` or prompt for a `New Revision`.
3. **Persistence:** `PUT` to `/api/Templates/{id}/versions/{versionId}`.
4. **Safety:** API rejects updates to any version not in `Draft` state.
