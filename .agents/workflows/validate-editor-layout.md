---
description: Review editor, layout, and rendering work for unit consistency, placement correctness, and preview/PDF parity risks.
---
# /validate-editor-layout

## Purpose
Review editor, layout, and rendering work for unit consistency, placement correctness, and preview/PDF parity risks.
Ensure that the Next.js UI editor accurately represents the physical reality of the printed label, maintaining millimeter (mm) as the primary unit.
The expected outcome is a `notify_user` confirmation that the editor preview math matches the PDF rendering math.

## When To Use
Use this workflow when:
- committing changes to the label designer components
- modifying the canonical JSON model parser
- altering the backend PDF renderer

Do not use this workflow when:
- changing non-visual elements of the application
- updating dependencies unrelated to rendering

## Inputs
Required inputs:
- branch or commit containing editor/rendering changes.
- access to the local Next.js environment and .NET API.

Optional inputs:
- a sample canonical JSON template.

Assumptions:
- `UnitConverter.ts` is the single source of truth for frontend dimensions.

## Procedure
1. Inspect the current layout and rendering code.
2. Verify Units: Check `src/frontend/utils/UnitConverter.ts` (or equivalent) for hardcoded anomalies. Ensure `mm` remains the core unit.
3. Check Preview Math: Confirm the editor zoom level explicitly separates DOM pixels from logical layout dimensions (`mm To Px * Zoom` not just `Px * Zoom`).
4. Test Save/Load: Create a test label with all allowed primitives (text, QR, barcode, image, rect, line). Save to the database and reload.
5. Compare PDF: Trigger the backend PDF generation for the test label. Open the generated PDF and visually inspect it.
6. Check image element bounds and fallback behavior for invalid assets.
7. Summarize the validation results.

## Outputs
This workflow must produce:
- A validation summary report.

The output must include:
- results of unit validation
- results of save/reload testing
- visual PDF parity status
- files reviewed

## Validation Checks
Before considering this workflow complete, verify:
- Ensure image elements correctly enforce boundaries and size limits defined in the canonical model setup.
- Verify 100% attribute parity between the saved JSON and the reloaded JSON.
- Verify the generated PDF points match the `mm` configurations from the canonical JSON model precisely.
- UnitConverter consistency is maintained.

## Stop Conditions
Stop and report if:
- visual discrepancies exist between preview and generated PDF.
- the saved canonical JSON is corrupted on reload.

## Escalation Conditions
Escalate explicitly when:
- the PDF outputs text clipping or bounding-box overlap not visible in the Web Preview.
- standard `UnitConverter` logic is insufficient for a new primitive.

## Project-Specific Guardrails
Always enforce:
- `mm` unit supremacy for storage and PDF mapping.
- canonical label model vendor neutrality.

Never:
- use magic multiplier numbers in UI components outside of `UnitConverter`.
- rely on browser printing "Fit to Page" for layout tests.

## Completion Criteria
This workflow is complete only when:
- all tests pass, and PDF visually mirrors the Editor Preview.
- the validation summary is successfully conveyed to the user.
- unresolved items are explicitly listed if any discrepancies remain.
