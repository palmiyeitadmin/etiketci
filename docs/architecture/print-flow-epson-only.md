# Architecture: Epson Print Flow (MVP)

## Summary
The MVP explicitly targets the Epson ColorWorks CW-C4000e. All abstractions for QZ Tray and Zebra/ZPL are formally excluded from this phase.

## The Flow
1. **Initiation:** User selects product(s) or an independent template in the Next.js UI.
2. **Merge:** Backend receives the request, loads the Template (JSON), loads the Product Data (DB/CSV), and interpolates variables.
3. **PDF Generation:** Using a standard library (e.g., QuestPDF, iText), the backend renders the label to a strict physical size `Byte[]`.
4. **Job Tracking (Queued):** Backend logs a new `PrintJob` entity with state `queued`.
5. **Client Handoff:** The `Byte[]` is returned to the Next.js client, job state updates to `sent_to_client`.
6. **Print Setup:** The UI opens the PDF via an internal route or iframe, naturally triggering the browser's native print-dialog.
7. **User Routing:** The user selects the Epson Windows driver to print.
8. **Confirmation Dialog:** The UI modal asks: "Did the labels print successfully?"
9. **Job Tracking (Final):** 
   - User clicks Yes -> API call to update job to `user_printed`. Audit log created.
   - User clicks No/Cancel -> API call to update job to `failed`. Audit log created.

## Browser Print Dialog Limitations
- **No hardware guarantee:** Because the MVP utilizes standard OS print dialogs, the browser cannot guarantee ink, paper jams, or final spool success mechanically.
- **User-Confirmed Semantics:** The system's truth ends when the user clicks 'Print' on the OS dialog and subsequently confirms the success in the PLMS UI. `user_printed` simply means "The user claimed they printed it."
- **Dialog Cancellation:** If the user exits the browser print modal without printing, they must manually click "Cancel" or "Failed" in the PLMS tracking UI to formally close the loop.

## Printing Operator Guidelines
- **Actual Size:** Because the PDF is dimensionally fixed to the model's precise millimeter layout, the operator MUST be trained to select "Actual Size" or "Scale: 100%" in the Epson/Browser print dialog.
- "Fit to Page" or any other dynamic scaling will destroy the alignment.

## Why User Confirmation?
Without direct integration (like QZ Tray), the browser cannot definitively know if the printer succeeded, paper jammed, or ran out of ink. Asking the user provides the most reliable MVP audit trail.
