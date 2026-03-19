import { DashboardFeedItem } from "@/types/dashboard";
import { Locale } from "@/lib/i18n";

const auditActionLabels: Record<Locale, Record<string, string>> = {
    tr: {
        TemplateDraftSaved: "Taslak kaydedildi",
        TemplateApprovalRequested: "Taslak incelemeye gonderildi",
        TemplateApproved: "Surum onaylandi",
        TemplateRejected: "Surum reddedildi",
        TemplatePublished: "Surum yayina alindi",
        TemplateDeleted: "Sablon silindi",
        TemplateRestorationRequested: "Geri yukleme talebi olusturuldu",
        TemplateRestorationApproved: "Geri yukleme talebi onaylandi",
        TemplateRestorationRejected: "Geri yukleme talebi reddedildi",
    },
    en: {
        TemplateDraftSaved: "Draft saved",
        TemplateApprovalRequested: "Draft submitted for review",
        TemplateApproved: "Version approved",
        TemplateRejected: "Version rejected",
        TemplatePublished: "Version published",
        TemplateDeleted: "Template deleted",
        TemplateRestorationRequested: "Restoration requested",
        TemplateRestorationApproved: "Restoration approved",
        TemplateRestorationRejected: "Restoration rejected",
    },
};

function humanizeAction(action: string) {
    return action
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim();
}

function formatDraftSavedSubtitle(locale: Locale, details?: string) {
    if (!details) {
        return locale === "tr" ? "Taslak degisiklikleri kaydedildi." : "Draft changes were saved.";
    }

    const match = details.match(/Draft version (\d+) saved\. LayoutChanged=(True|False); ChangeNotesChanged=(True|False)\./i);
    if (!match) {
        return details;
    }

    const [, version, layoutChanged, notesChanged] = match;
    const changedParts =
        locale === "tr"
            ? [
                  layoutChanged === "True" ? "yerlesim guncellendi" : null,
                  notesChanged === "True" ? "notlar guncellendi" : null,
              ].filter(Boolean)
            : [
                  layoutChanged === "True" ? "layout updated" : null,
                  notesChanged === "True" ? "notes updated" : null,
              ].filter(Boolean);

    if (changedParts.length === 0) {
        return locale === "tr" ? `Taslak v${version} tekrar kaydedildi.` : `Draft v${version} was saved again.`;
    }

    return locale === "tr"
        ? `Taslak v${version} kaydedildi, ${changedParts.join(" ve ")}.`
        : `Draft v${version} saved, ${changedParts.join(" and ")}.`;
}

function formatAuditSubtitle(locale: Locale, item: DashboardFeedItem) {
    switch (item.title) {
        case "TemplateDraftSaved":
            return formatDraftSavedSubtitle(locale, item.subtitle);
        default:
            return item.subtitle;
    }
}

export function localizeDashboardFeedItem(locale: Locale, item: DashboardFeedItem): DashboardFeedItem {
    if (item.type === "audit") {
        return {
            ...item,
            title: auditActionLabels[locale][item.title] || humanizeAction(item.title),
            subtitle: formatAuditSubtitle(locale, item),
            status: undefined,
        };
    }

    if (item.type === "import") {
        return {
            ...item,
            title: auditActionLabels[locale][item.title] || humanizeAction(item.title),
        };
    }

    return item;
}
