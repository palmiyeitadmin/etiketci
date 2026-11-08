"use client";

import { useEffect, useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { apiFetch } from "@/lib/api-client";
import { useText } from "@/lib/i18n";
import { openPendingTab } from "@/lib/pdf-print";
import { buildPrintIntentPdfUrl, MAX_PRINT_COPIES, parseQuantity } from "@/lib/print-station";
import type { PrintIntentDetailDto, ReprintReason } from "@/types/operational";

const REASONS: ReprintReason[] = ["damaged", "lost", "extra", "other"];

export type ReprintSource = { id: string; quantity: number; productName?: string; hasPrintedPayload?: boolean };

/**
 * Prints the stored label of a finished request again. Creates the reprint, releases it and opens its PDF
 * in one go; the caller then asks for the outcome (onStarted gives the reprint and whether the PDF tab opened).
 */
export function ReprintDialog({
    source,
    onClose,
    onStarted,
}: {
    source: ReprintSource | null;
    onClose: () => void;
    onStarted: (reprint: PrintIntentDetailDto, pdfOpened: boolean) => void;
}) {
    const text = useText("print");
    const [reason, setReason] = useState<ReprintReason | null>(null);
    const [note, setNote] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (source) {
            setReason(null);
            setNote("");
            setQuantity(String(source.quantity));
            setError(null);
        }
    }, [source]);

    useEffect(() => {
        if (!source) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !saving) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [source, saving, onClose]);

    if (!source) return null;

    const parsedQuantity = parseQuantity(quantity);
    const noteMissing = reason === "other" && note.trim() === "";
    const unavailable = source.hasPrintedPayload === false;

    async function submit() {
        if (!source || !reason || parsedQuantity == null || noteMissing) return;
        setSaving(true);
        setError(null);

        // The tab must open inside the click; the PDF address is known only after the requests below.
        const tab = openPendingTab();
        const created = await apiFetch<PrintIntentDetailDto>(`/api/PrintIntents/${source.id}/reprint`, {
            method: "POST",
            body: JSON.stringify({ reason, note: note.trim() || null, quantity: parsedQuantity }),
        });
        if (!created.success) {
            tab?.close();
            setSaving(false);
            setError(created.error.message);
            return;
        }

        const dispatched = await apiFetch<PrintIntentDetailDto>(`/api/PrintIntents/${created.data.id}/dispatch-pdf`, { method: "POST" });
        setSaving(false);
        if (!dispatched.success) {
            tab?.close();
            setError(dispatched.error.message);
            return;
        }

        const opened = tab?.navigate(buildPrintIntentPdfUrl(dispatched.data.id)) ?? false;
        onStarted(dispatched.data, opened);
    }

    return (
        <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" onClick={() => !saving && onClose()}>
                <form
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reprint-title"
                    className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-pop"
                    onClick={(event) => event.stopPropagation()}
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submit();
                    }}
                >
                    <div className="flex flex-col gap-1.5">
                        <h2 id="reprint-title" className="text-md font-medium text-ink">{text.reprint.title}</h2>
                        <p className="text-sm text-ink-2">
                            {source.productName ? <span className="text-ink">{source.productName} · </span> : null}
                            {text.reprint.description}
                        </p>
                    </div>

                    {unavailable ? (
                        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{text.reprint.unavailable}</p>
                    ) : (
                        <>
                            <fieldset className="flex flex-col gap-1.5">
                                <legend className="plms-label mb-1.5">{text.reprint.reasonLabel}</legend>
                                <div className="grid grid-cols-2 gap-1">
                                    {REASONS.map((code) => (
                                        <label
                                            key={code}
                                            className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors ${reason === code ? "border-accent bg-accent-soft text-ink" : "border-line text-ink-2 hover:bg-raised"}`}
                                        >
                                            <input type="radio" name="reprint-reason" className="accent-[rgb(var(--accent))]" checked={reason === code} onChange={() => setReason(code)} />
                                            {text.reprintReasons[code]}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="reprint-note" className="plms-label">{text.reprint.noteLabel}</label>
                                <input id="reprint-note" className="plms-input" placeholder={text.reprint.notePlaceholder} value={note} onChange={(event) => setNote(event.target.value)} />
                                {noteMissing ? <p className="text-xs text-bad">{text.reprint.noteRequired}</p> : null}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="reprint-quantity" className="plms-label">{text.reprint.quantityLabel}</label>
                                <input
                                    id="reprint-quantity"
                                    inputMode="numeric"
                                    className="plms-input tabular w-32"
                                    value={quantity}
                                    onChange={(event) => setQuantity(event.target.value)}
                                    aria-invalid={parsedQuantity == null}
                                />
                                <p className={`text-xs ${parsedQuantity == null ? "text-bad" : "text-ink-3"}`}>{text.station.quantityHint(MAX_PRINT_COPIES)}</p>
                            </div>
                        </>
                    )}

                    {error ? <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

                    <div className="flex justify-end gap-2">
                        <button type="button" className="plms-button-secondary" onClick={onClose} disabled={saving}>{text.reprint.cancel}</button>
                        {unavailable ? null : (
                            <button type="submit" className="plms-button-primary" disabled={saving || !reason || parsedQuantity == null || noteMissing}>
                                {saving ? text.reprint.submitting : text.reprint.submit}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </Portal>
    );
}
