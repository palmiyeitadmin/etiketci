import type { ProductTemplateDto } from "@/types/operational";

/** Same limit as the backend (LabelRenderService.MaxCopies). */
export const MAX_PRINT_COPIES = 2000;

/** A prints in SentToClient longer than this is shown as waiting too long. */
export const AWAITING_OUTCOME_WARNING_MINUTES = 30;

/** Scanners type the code followed by Enter; strip whitespace and control characters they may add. */
export function normalizeScan(raw: string): string {
    return raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

/** A whole number in range, or null. Accepts "1.000" style grouping. */
export function parseQuantity(text: string, max = MAX_PRINT_COPIES): number | null {
    const cleaned = text.replace(/[\s.]/g, "");
    if (!/^\d+$/.test(cleaned)) {
        return null;
    }

    const value = Number(cleaned);
    return value >= 1 && value <= max ? value : null;
}

/** Only templates with a published version can be printed. */
export function printableTemplates(templates: ProductTemplateDto[]): ProductTemplateDto[] {
    return templates.filter((template) => template.isActive !== false && Boolean(template.publishedVersionId));
}

/** The product's default template if it is printable, otherwise the first printable one. */
export function pickDefaultTemplate(templates: ProductTemplateDto[]): ProductTemplateDto | undefined {
    const printable = printableTemplates(templates);
    return printable.find((template) => template.isDefault) ?? printable[0];
}

export function buildPrintIntentPdfUrl(intentId: string): string {
    return `/api/print-intents/${encodeURIComponent(intentId)}/pdf`;
}

/** Minutes since a moment, rounded down; 0 for future or invalid dates. */
export function minutesSince(iso: string | null | undefined, now = Date.now()): number {
    if (!iso) return 0;
    const time = Date.parse(iso);
    return Number.isNaN(time) ? 0 : Math.max(0, Math.floor((now - time) / 60000));
}
