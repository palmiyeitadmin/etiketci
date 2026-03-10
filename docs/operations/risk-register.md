# Operations: Risk Register

## Known Risks & Decisions

| Risk | Impact | Mitigating Action | Status |
|---|---|---|---|
| **Epson Windows Driver Variations** | PDF scaling might be incorrectly altered by the "Fit to Page" default Windows printer setting. | Document "Actual Size" printing instructions aggressively in UI. | Active |
| **Silent Printing Desire** | The client may demand "no popup" printing. | MVP constraint enforced strictly. "No QZ tray, no Zebra." Educate stakeholder on OS security sandbox. | Mitigated by Scope |
| **Editor Complexity Creep** | Overbuilding the label designer. | Stick to the 6 primitives (`text`, `rect`, `image`, `qr`, `barcode`, `line`). No responsive flexbox nested containers inside variables. | Active |
| **Browser PDF Rendering Differences** | Different chromium edge vs chrome vs firefox innate PDF viewer variations. | Backend-generated PDF bytes fix visual inconsistencies, but UI viewer iframe must be tested across browsers. | Active |

## Note to Future Agents
Before accepting any request involving print flow automation or complex vector grouping in the editor, check this log. Do not proceed with architecture changes violating these mitigations.
