import type { Locale } from "@/lib/i18n/messages";
import { getText } from "@/lib/i18n/useText";

/**
 * Turns codes and stored parameters from the backend into text in the user's language.
 * Every function falls back to the backend's own (English) text when it does not know the code.
 */

export type CheckIssue = {
    code: string;
    severity: "error" | "warning" | string;
    params: Record<string, string>;
    fromSnapshot?: boolean;
};

export function permissionLabel(locale: Locale, key: string, fallback?: string) {
    return getText("permissions", locale).items[key]?.label ?? fallback ?? key;
}

export function permissionDescription(locale: Locale, key: string, fallback?: string) {
    return getText("permissions", locale).items[key]?.description ?? fallback ?? "";
}

export function permissionGroupLabel(locale: Locale, groupKey: string, fallback?: string) {
    return (getText("permissions", locale).groups as Record<string, string>)[groupKey] ?? fallback ?? groupKey;
}

/** Built-in roles get a translated name; custom roles show the name they were given. */
export function roleDisplayName(locale: Locale, name: string) {
    return getText("permissions", locale).roles[name]?.name ?? name;
}

export function roleDescription(locale: Locale, name: string, fallback?: string | null) {
    return getText("permissions", locale).roles[name]?.description ?? fallback ?? "";
}

/** Reads `issues` from a readiness/safety object in either casing (snapshots are stored PascalCase). */
export function readIssues(source: unknown): CheckIssue[] {
    if (!source || typeof source !== "object") return [];
    const record = source as Record<string, unknown>;
    const raw = record.issues ?? record.Issues;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const entry = item as Record<string, unknown>;
        const code = entry.code ?? entry.Code;
        if (typeof code !== "string") return [];
        const params = (entry.params ?? entry.Params ?? {}) as Record<string, string>;
        return [{
            code,
            severity: String(entry.severity ?? entry.Severity ?? "error"),
            params,
            fromSnapshot: Boolean(entry.fromSnapshot ?? entry.FromSnapshot),
        }];
    });
}

/** Parses a stored readiness snapshot (JSON text) and returns its issues. */
export function snapshotIssues(snapshot: string | null | undefined): CheckIssue[] {
    if (!snapshot) return [];
    try {
        return readIssues(JSON.parse(snapshot));
    } catch {
        return [];
    }
}

export function checkIssueText(locale: Locale, issue: CheckIssue) {
    const phrase = getText("errors", locale).issues[issue.code];
    return phrase ? phrase(issue.params ?? {}) : issue.code;
}

/** Translated lines for a check result: the codes when present, else the English messages it carried. */
export function checkMessages(locale: Locale, issues: CheckIssue[], fallback: string[] = []) {
    if (issues.length === 0) return fallback;
    const text = getText("errors", locale);
    return issues.map((issue) => {
        const line = checkIssueText(locale, issue);
        return issue.fromSnapshot ? `${text.fromSnapshot}: ${line}` : line;
    });
}

export function importErrorText(locale: Locale, error: { errorType?: string; value?: string | null; message?: string }) {
    const phrase = error.errorType ? getText("errors", locale).importErrors[error.errorType] : undefined;
    return phrase ? phrase(error.value ?? "") : error.message ?? error.errorType ?? "";
}

/** A failed API call's message: translated when the response carried a known `code`. */
export function apiErrorText(locale: Locale, error: unknown, fallback: string) {
    const code = (error as { code?: unknown } | null)?.code;
    if (typeof code === "string") {
        const known = getText("errors", locale).api[code];
        if (known) return known;
    }
    const message = (error as { message?: unknown } | null)?.message;
    return typeof message === "string" && message ? message : fallback;
}

/** Parses AuditLog.Metadata; empty or invalid JSON gives null. */
export function parseAuditMetadata(metadata: string | null | undefined): Record<string, unknown> | null {
    if (!metadata) return null;
    try {
        const value = JSON.parse(metadata);
        return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    } catch {
        return null;
    }
}

/** The audit entry as a short sentence in the user's language, or null when only the stored Details can say it. */
export function auditSummary(locale: Locale, action: string, metadata: string | null | undefined) {
    const params = parseAuditMetadata(metadata);
    if (!params) return null;
    const sentence = getText("audit", locale).sentences[action];
    return sentence ? sentence(params) : null;
}
