# Architecture: Unit Conversion Rules

## The Source of Truth
The physical dimension of the label paper is the absolute truth. Therefore, the standard unit of measurement across the PLMS domain is **millimeters (mm)**.

## The Conversions
- **Editor Dimensions:** The UI must display the label visually. Web browsers use CSS Pixels.
- **Conversion Math:** 
  `Pixels = (Millimeters / 25.4) * DPI`
- **Standard UI DPI:** 96 (standard CSS scaling).
- **Zoom Factor:** The UI should maintain a logical coordinate system separate from screen zoom. E.g. `RenderSize = Pixels * ZoomMap`.

## UnitConverter.ts
A robust, thoroughly tested `UnitConverter` utility must exist in the frontend. It should provide:
- `mmToPx(mm: number): number`
- `pxToMm(px: number): number`
- `ptToPx(pt: number): number` (For Font Sizes, usually `1pt = 1.333px`)

**DO NOT** scatter `* 3.779` magic numbers throughout the React components.

## PDF Generation 
The backend must do the corresponding conversion when writing to the PDF format, translating mm to PDF points (typically 72 points per inch).
`Points = (Millimeters / 25.4) * 72`
