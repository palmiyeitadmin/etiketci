"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { Portal } from "@/components/ui/Portal";
import { apiFetch } from "@/lib/api-client";
import { useText } from "@/lib/i18n";
import { openPdfDocument } from "@/lib/pdf-print";
import { buildPrintIntentPdfUrl } from "@/lib/print-station";
import type { PrintFailureCategory, PrintIntentDetailDto } from "@/types/operational";

const CATEGORIES: PrintFailureCategory[] = ["paper_jam", "color", "alignment", "barcode", "wrong_data", "printer_error", "other"];

export type OutcomeTarget = { id: string; quantity: number; productName?: string };

/**
 * Asks for the result of a print right after its PDF is opened: printed, or what went wrong.
 * "Later" closes it; the request then stays in "awaiting outcome" until someone records it.
 */
export function PrintOutcomeDialog({
    target,
    onClose,
    onRecorded,
}: {
    target: OutcomeTarget | null;
    onClose: () => void;
    onRecorded: (detail: PrintIntentDetailDto, outcome: "printed" | "failed") => void;
}) {
    const text = useText("print");
    const [mode, setMode] = useState<"choose" | "failure">("choose");
    const [category, setCategory] = useState<PrintFailureCategory | null>(null);
    const [note, setNote] = useState("");
    const [printedQuantity, setPrintedQuantity] = useState("0");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (target) {
            setMode("choose");
            setCategory(null);
            setNote("");
            setPrintedQuantity("0");
            setError(null);
        }
    }, [target]);

    useEffect(() => {
        if (!target) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !saving) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [target, saving, onClose]);

    if (!target) return null;

    const noteMissing = category === "other" && note.trim() === "";
    const printedCount = Number(printedQuantity);
    const printedValid = printedQuantity !== "" && Number.isInteger(printedCount) && printedCount >= 0 && printedCount <= target.quantity;

    async function record(outcome: "printed" | "failed") {
        if (!target) return;
        setSaving(true);
        setError(null);
        const res = outcome === "printed"
            ? await apiFetch<PrintIntentDetailDto>(`/api/PrintIntents/${target.id}/confirm-print`, { method: "POST" })
            : await apiFetch<PrintIntentDetailDto>(`/api/PrintIntents/${target.id}/mark-failed`, {
                method: "POST",
                body: JSON.stringify({ category, reason: note.trim() || null, printedQuantity: printedCount }),
            });
        setSaving(false);
        if (!res.success) {
            setError(res.error.message);
            return;
        }
        onRecorded(res.data, outcome);
    }

    return (
        <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
                <div role="dialog" aria-modal="true" aria-labelledby="print-outcome-title" className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-pop">
                    <div className="flex flex-col gap-1.5">
                        <h2 id="print-outcome-title" className="text-md font-medium text-ink">{text.outcome.title}</h2>
                        <p className="text-sm text-ink-2">
                            {target.productName ? <span className="text-ink">{target.productName} · </span> : null}
                            {text.outcome.description(target.quantity)}
                        </p>
                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 self-start text-sm text-accent hover:underline"
                            onClick={() => openPdfDocument(buildPrintIntentPdfUrl(target.id))}
                        >
                            <ArrowSquareOut size={14} />
                            {text.outcome.openPdfAgain}
                        </button>
                    </div>

                    {mode === "choose" ? (
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" className="plms-button-primary h-11" disabled={saving} onClick={() => record("printed")} autoFocus>
                                <CheckCircle size={18} />
                                {saving ? text.outcome.saving : text.outcome.printed}
                            </button>
                            <button type="button" className="plms-button-secondary h-11" disabled={saving} onClick={() => setMode("failure")}>
                                <WarningCircle size={18} className="text-bad" />
                                {text.outcome.failed}
                            </button>
                        </div>
                    ) : (
                        <form
                            className="flex flex-col gap-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (category && !noteMissing && printedValid) void record("failed");
                            }}
                        >
                            <fieldset className="flex flex-col gap-1.5">
                                <legend className="plms-label mb-1.5">{text.outcome.categoryLabel}</legend>
                                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                                    {CATEGORIES.map((code) => (
                                        <label
                                            key={code}
                                            className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors ${category === code ? "border-accent bg-accent-soft text-ink" : "border-line text-ink-2 hover:bg-raised"}`}
                                        >
                                            <input type="radio" name="failure-category" className="accent-[rgb(var(--accent))]" checked={category === code} onChange={() => setCategory(code)} />
                                            {text.failureCategories[code]}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="failure-note" className="plms-label">{text.outcome.noteLabel}</label>
                                <textarea id="failure-note" className="plms-input min-h-16" placeholder={text.outcome.notePlaceholder} value={note} onChange={(event) => setNote(event.target.value)} />
                                {noteMissing ? <p className="text-xs text-bad">{text.outcome.noteRequired}</p> : null}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="failure-printed" className="plms-label">{text.outcome.printedQuantityLabel}</label>
                                <input id="failure-printed" type="number" min={0} max={target.quantity} className="plms-input tabular w-32" value={printedQuantity} onChange={(event) => setPrintedQuantity(event.target.value)} />
                                <p className="text-xs text-ink-3">{text.outcome.printedQuantityHint(target.quantity)}</p>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" className="plms-button-ghost" onClick={() => setMode("choose")} disabled={saving}>{text.outcome.back}</button>
                                <button type="submit" className="plms-button-primary !bg-bad hover:!bg-bad/90" disabled={saving || !category || noteMissing || !printedValid}>
                                    {saving ? text.outcome.saving : text.outcome.saveFailure}
                                </button>
                            </div>
                        </form>
                    )}

                    {error ? <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

                    {mode === "choose" ? (
                        <button type="button" className="plms-button-ghost self-end" onClick={onClose} disabled={saving}>{text.outcome.later}</button>
                    ) : null}
                </div>
            </div>
        </Portal>
    );
}
