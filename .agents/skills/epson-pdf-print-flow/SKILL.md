---
name: epson-pdf-print-flow
description: Teach the agent the Epson-only print flow, print job states, UI confirmation model, error handling, and future upgrade boundaries.
---
# Skill: Epson PDF Print Flow

## Purpose
Defines the strictly-governed print boundaries for the PLMS MVP, ensuring a reliable user-confirmed process.

## Flow Execution
1. **Trigger:** User clicks "Print" on a selected Product or standalone Template.
2. **Render:** Backend compiles the canonical JSON + Product Data into a PDF byte stream.
3. **Job Logging:** Print Job is created in `queued` state in DB.
4. **Client Delivery:** Frontend receives PDF and opens it in a new browser tab/iframe for standard browser printing. State becomes `sent_to_client`.
5. **Confirmation:** The UI prompts the user: "Did the print succeed?".
6. **Completion:** User clicks "Yes" -> State `user_printed`. User clicks "No" -> State `failed`.

## Constraints & Anti-patterns
- **DO NOT** use QZ Tray, Zebra protocols, or raw ZPL in MVP.
- **DO NOT** attempt to bypass the browser print dialog.
- Ensure the PDF dimensions exactly match the label stock (e.g., 4x3 inches, 100x150mm).
- Ensure `user_printed` events trigger an audit log entry for the specific user and product serial.
