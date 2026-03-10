# Architecture: Canonical Label Model

## Goal
To maintain a single JSON definition that accurately describes the physical attributes and elements of a label.

## Structure
```json
{
  "version": "1.0",
  "name": "Shipping Label A",
  "dimensions": {
    "widthMm": 100,
    "heightMm": 150
  },
  "elements": [
    {
      "id": "elem-1",
      "type": "text",
      "xMm": 10,
      "yMm": 10,
      "widthMm": 80,
      "heightMm": 15,
      "content": "Product: {{ ProductName }}",
      "font": "Arial",
      "fontSizePt": 12
    },
    {
      "id": "elem-2",
      "type": "barcode",
      "xMm": 10,
      "yMm": 30,
      "widthMm": 80,
      "heightMm": 20,
      "content": "{{ ProductSku }}"
    }
  ]
}
```

## Constraints
1. **Units:** Always millimeter (mm) for coordinates and physical bounding boxes. Fonts use standard point (pt) sizing.
2. **Types:** `text`, `barcode`, `qr`, `image`, `rect`, `line`.
3. **Variables:** Must be enveloped in `{{ }}` and resolve exactly against product data properties.
4. **ZPL Isolation:** No vendor-specific raw commands (like ZPL `^FD`) should exist in this generic schema. The canonical model is strictly vendor-neutral.

## Image Primitive Rules
Images in the canonical label model must adhere to specific validation bounds to prevent layout distortion or memory exhaustion during PDF generation.

1. **Size Limits:** Hard-limit the underlying static byte content length during template creation. (e.g. 500KB max per `image` payload or URL fetch).
2. **Dimensions Constraints:** The physical layout `widthMm` and `heightMm` are supreme. Any embedded image will be scaled (stretch or maintain-aspect depending on future CSS rules, defaulting to `object-fit: contain` behavior) strictly into the bounding box defined by the model.
3. **Missing/Invalid Asset Behavior:** If an image URL returns 404 or a Base64 string is corrupted, the `.NET` PDF generation MUST output a visibly distinct "Fallback Placeholder" (a stroked box with a red "X") rather than failing the entire print job.
4. **Offline Resilience:** Using base64 encoded strings within the JSON is preferred for small icons to avoid network blocking during PDF render. If URLs are used, the backend must enforce strict timeouts.
