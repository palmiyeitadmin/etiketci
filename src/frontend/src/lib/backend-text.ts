import { messages, type Locale } from "@/lib/i18n/messages";
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

export function importErrorTypeLabel(locale: Locale, errorType: string) {
    return getText("errors", locale).importErrorTypes[errorType] ?? errorType;
}

/** One failed ASP.NET Identity rule as the backend sends it under `errors` (code `identity_error`). */
export type IdentityErrorItem = { code: string; description: string; params?: Record<string, string> };

/** Raw status values in params (e.g. `{ status: "SentToClient" }`) are shown with their label in the user's language. */
function localizeParams(locale: Locale, params: Record<string, string> | undefined) {
    const result: Record<string, string> = { ...(params ?? {}) };
    if (result.status) {
        result.status = (messages[locale].status.generic as Record<string, string>)[result.status] ?? result.status;
    }
    return result;
}

/** Text for a backend error `code` in the given language, or undefined when the code is unknown. */
export function apiCodeText(locale: Locale, code: string, params?: Record<string, string>) {
    const phrase = getText("errors", locale).api[code];
    return phrase ? phrase(localizeParams(locale, params)) : undefined;
}

/** Each Identity rule translated by its code; unknown codes keep the backend's description. */
export function identityErrorsText(locale: Locale, errors: IdentityErrorItem[]) {
    const phrases = getText("errors", locale).identity;
    return errors
        .map((item) => (phrases[item.code]?.(item.params ?? {}) ?? item.description).trim().replace(/\.$/, ""))
        .filter(Boolean)
        .join(". ");
}

/**
 * A failed call's message in the given language: from `code` (+ `params`), or from the Identity rules,
 * else the message it carried (English for unknown codes), else `fallback`.
 */
export function apiErrorText(locale: Locale, error: unknown, fallback: string) {
    const record = (error ?? {}) as { code?: unknown; params?: unknown; identityErrors?: unknown; message?: unknown };
    if (Array.isArray(record.identityErrors) && record.identityErrors.length > 0) {
        const text = identityErrorsText(locale, record.identityErrors as IdentityErrorItem[]);
        if (text) return text;
    }
    if (typeof record.code === "string") {
        const params = record.params && typeof record.params === "object" ? record.params as Record<string, string> : undefined;
        const known = apiCodeText(locale, record.code, params);
        if (known) return known;
    }
    return typeof record.message === "string" && record.message ? record.message : fallback;
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
