# Architecture: Unit Conversion Rules

## The Source of Truth
The physical dimension of the label paper is the absolute truth. Therefore, the standard unit of measurement across the PLMS domain is **millimeters (mm)**.

## Render Profiles
Instead of a single fixed conversion, the system now utilizes **Render Profiles** to handle different targets:
- **ScreenPreviewProfile (96 DPI)**: For frontend canvas display. `roundToGrid: true` by default.
- **PdfRenderProfile (72 DPI)**: For QuestPDF generation. `roundToGrid: false`.
- **PrinterProfile (1200 DPI)**: For future industrial print command generation.

## UnitConverter
The `UnitConverter` utility handles these conversions centrally:
- `mmToProfile(mm, profile, zoom)`: mm to target (px/pt/dots).
- `profileToMm(value, profile, zoom)`: target to mm.
- `snapToGrid(value, snapMm)`: Enforces configurable manual grid snapping.
- `toPersisted(value)`: Normalizes mm values to 2 decimal places for JSON storage.

## PDF Generation 
The backend implements the corresponding profile rules when writing to the PDF format, translating mm to PDF points (typically 72 points per inch).
`Points = (Millimeters / 25.4) * 72`
QuestPDF rendering logic in `LabelRenderService` must follow the `PdfRenderProfile` expectations.
