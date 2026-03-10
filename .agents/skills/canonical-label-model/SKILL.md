---
name: canonical-label-model
description: Teach the agent how to design and evolve the canonical label JSON model, variables, layout primitives, units, and validation rules.
---
# Skill: Canonical Label Model

## Purpose
To ensure consistent defining and parsing of label shapes, dimensions, and variables. The Canonical Label Model is a JSON document representing the blueprint of a label template.

## Model Principles
- Must be vendor-agnostic at its core, but naturally suited to PDF rendering. It should precisely encode positions (X, Y) and sizes (W, H).
- **Primitives allowed:** `text`, `rectangle`, `line`, `barcode`, `qr`, `image`.
- **Variables:** Must be clearly marked (e.g., `{{ ProductName }}`) and strictly validated against a known variable schema.

## When to Use
- When modifying backend template storage schema.
- When passing layout configuration to the frontend editor.
- When generating fixed-size PDFs.

## Expected Actions
1. Define coordinates in a consistent base unit (usually millimeters or points) explicitly declared in the JSON model.
2. Provide fallback rendering behavior if an image or variable is missing.

## Constraints
- Avoid proprietary tags mapping specifically to ZPL.
- Avoid nesting beyond `Canvas -> Layers -> Elements`. Keep the element structure flat.
