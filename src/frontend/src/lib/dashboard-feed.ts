import { DashboardFeedItem } from "@/types/dashboard";
import { Locale } from "@/lib/i18n";

import { getText } from "@/lib/i18n/useText";
import { humanizeCode } from "@/lib/i18n/text/audit";

/** Human name of an audit action in the given language; unknown codes are humanized. */
export function auditActionLabel(locale: Locale, action: string) {
    const actions = getText("audit", locale).actions as Record<string, string>;
    return actions[action] ?? humanizeCode(action);
}

/** Human name of an audited record type ("PrintIntent" → "Baskı talebi"). */
export function auditEntityLabel(locale: Locale, entityType: string) {
    const entities = getText("audit", locale).entities as Record<string, string>;
    return entities[entityType] ?? humanizeCode(entityType);
}

/**
 * Backend audit details are English sentences. In Turkish, show only the codes they mention
 * (product SKU, template code and version), which are what people scan for.
 */
function extractCodes(details?: string) {
    if (!details) return undefined;
    const codes = new Set<string>();
    const pattern = /\b(?:Product|Template|SKU)\s+([A-Z0-9][A-Z0-9-]{2,})(?:\s+V(\d+))?/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(details)) !== null) {
        codes.add(match[2] ? `${match[1]} v${match[2]}` : match[1]);
    }
    return codes.size > 0 ? Array.from(codes).join(" · ") : undefined;
}

function formatDraftSavedSubtitle(locale: Locale, details?: string) {
    if (!details) {
        return locale === "tr" ? "Taslak değişiklikleri kaydedildi" : "Draft changes were saved";
    }

    const match = details.match(/Draft version (\d+) saved\. LayoutChanged=(True|False); ChangeNotesChanged=(True|False)\./i);
    if (!match) {
        return details;
    }

    const [, version, layoutChanged, notesChanged] = match;
    const changedParts =
        locale === "tr"
            ? [
                  layoutChanged === "True" ? "yerleşim güncellendi" : null,
                  notesChanged === "True" ? "notlar güncellendi" : null,
              ].filter(Boolean)
            : [
                  layoutChanged === "True" ? "layout updated" : null,
                  notesChanged === "True" ? "notes updated" : null,
              ].filter(Boolean);

    if (changedParts.length === 0) {
        return locale === "tr" ? `Taslak v${version} tekrar kaydedildi` : `Draft v${version} was saved again`;
    }

    return locale === "tr"
        ? `Taslak v${version}: ${changedParts.join(" ve ")}`
        : `Draft v${version}: ${changedParts.join(" and ")}`;
}

function formatAuditSubtitle(locale: Locale, item: DashboardFeedItem) {
    switch (item.title) {
        case "TemplateDraftSaved":
            return formatDraftSavedSubtitle(locale, item.subtitle);
        default:
            return locale === "tr" ? extractCodes(item.subtitle) : item.subtitle;
    }
}

export function localizeDashboardFeedItem(locale: Locale, item: DashboardFeedItem): DashboardFeedItem {
    if (item.type === "audit") {
        return {
            ...item,
            title: auditActionLabel(locale, item.title),
            subtitle: formatAuditSubtitle(locale, item),
            status: undefined,
        };
    }

    if (item.type === "import") {
        return {
            ...item,
            title: auditActionLabel(locale, item.title),
        };
    }

    return item;
}
