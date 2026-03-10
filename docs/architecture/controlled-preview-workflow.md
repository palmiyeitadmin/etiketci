# Architecture: Controlled Preview Workflow

## Overview
The Controlled Preview Workflow in PLMS allows users (Operators, Reviewers, Admins) to verify the layout of a template version as a layout-accurate PDF before it is used in production. This is a read-only review step, not an orchestration for physical printing.

## Workflow Steps
1. **Trigger Preview**: User selects "Print Preview" from the Template Detail page for a specific version.
2. **Metadata Fetch**: Frontend calls `GET /api/Templates/{id}/versions/{versionId}/preview-metadata` to retrieve version status and render-readiness warnings.
3. **PDF Generation**: Frontend embeds an iframe pointing to `GET /api/Templates/{id}/versions/{versionId}/preview`. 
4. **Backend Rendering**: 
    - `TemplatesController` fetches the version JSON.
    - `LabelRenderService` maps the Canonical Model to QuestPDF.
    - Barcodes and QR codes are rendered using `ZXing.Net` with SkiaSharp.
5. **Review**: User inspects the PDF for layout correctness, alignments, and barcode presence.

## Render Warnings
The system performs basic validation during the metadata fetch:
- **Unsupported Barcodes**: Warns if symbologies other than CODE_128 or QR are used.
- **Malformed Config**: Alerts if barcode content is invalid for the selected type.

## Limitations & Guarantees
- **Visual Parity**: High (Vector-based PDF).
- **Physical Parity**: Depends on printer DPI (e.g., 203 DPI vs 300 DPI vs 1200 DPI) and "Actual Size" print settings.
- **Silent Print**: Not supported. User must use the browser/system print dialog from the preview shell.
