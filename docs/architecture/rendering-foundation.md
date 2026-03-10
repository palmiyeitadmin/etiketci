# Architecture: Rendering Foundation

## Overview
Sprint 6 establishes the core rendering pipeline for PLMS, bridging the gap between the interactive editor canvas and the formal backend printer output (PDF). This is achieved through a profile-aware unit conversion system and an absolute-positioned QuestPDF layout engine.

## Render Profiles
The system now distinguishes between different rendering contexts using **Render Profiles**:
- **ScreenPreviewProfile (96 DPI):** Optimized for web display with grid-snapping (1mm default) and visual rounding.
- **PdfRenderProfile (72 DPI):** Standard PDF point-based resolution for high-fidelity vector output.
- **PrinterProfile (1200 DPI):** High-resolution profile for future Epson production targets.

## Tech Stack
- **Frontend:** `bwip-js` for real-time barcode and QR rendering in the browser.
- **Backend:** `QuestPDF` for server-side PDF generation from the Canonical Label Model.
- **Unit Conversion:** Centralized `UnitConverter` (TypeScript) and manual mapping in C#.

## Canvas vs PDF Parity
Parity is maintained by strictly deriving all layouts from the **Canonical Label Model** where dimensions are stored in **Millimeters (mm)**.

### Tolerance Rules
- Precision for storage: 2 decimal places (`toPersisted`).
- Grid snapping: Configurable in the UI (0.25mm, 0.5mm, 1.0mm).
- Text origin: Bottom-left baseline is approximated, but for MVP, top-left bounding box is the primary anchor.

## Barcode & QR Fidelity
- **Editor:** Shows real scan-ready previews using `bwip-js`.
- **PDF:** Currently uses labeled placeholders in the QuestPDF output. *Note: Backend barcode rendering integration is planned for a subsequent sprint.*

## Validation Strategy
- **Golden Samples:** A set of canonical JSON files used to verify that the backend can generate valid PDFs without layout drift.
- **Unit Tests:** Located in `Plms.Tests` to verify `LabelRenderService` behavior.

## API Endpoints
- `GET /api/Templates/{id}/versions/{versionId}/preview`: Generates a downloadable layout PDF for the specified template version.
