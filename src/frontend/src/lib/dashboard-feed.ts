import { DashboardFeedItem } from "@/types/dashboard";
import { Locale } from "@/lib/i18n";

export const auditActionLabels: Record<Locale, Record<string, string>> = {
    tr: {
        CategoryCreated: "Kategori oluşturuldu",
        CategoryUpdated: "Kategori güncellendi",
        CategoryDeleted: "Kategori silindi",
        ImportSessionCreated: "İçe aktarma dosyası kontrol edildi",
        ImportSessionCommitted: "Ürünler içe aktarıldı",
        PrintIntentCreated: "Baskı talebi oluşturuldu",
        PrintIntentHandoffConfirmed: "Baskıya hazır olarak onaylandı",
        PrintIntentHandoffFailed: "Hazırlık kontrolü başarısız",
        PrintIntentPdfDispatched: "Baskı PDF'i açıldı",
        PrintIntentUserPrinted: "Etiketler basıldı",
        PrintIntentFailed: "Baskı hatalı olarak işaretlendi",
        PrintIntentCancelled: "Baskı talebi iptal edildi",
        ProductCreated: "Ürün oluşturuldu",
        ProductUpdated: "Ürün güncellendi",
        ProductDeleted: "Ürün silindi",
        ProductDeactivated: "Ürün pasife alındı",
        ProductTemplateLinked: "Ürüne şablon bağlandı",
        ProductTemplateUnlinked: "Ürünün şablon bağlantısı kaldırıldı",
        TemplateApprovalRequested: "Taslak onaya gönderildi",
        TemplateApproved: "Sürüm onaylandı",
        TemplateRejected: "Sürüm reddedildi",
        TemplatePublished: "Sürüm yayına alındı",
        TemplateArchived: "Şablon arşivlendi",
        TemplateVersionArchived: "Sürüm arşivlendi",
        TemplateCategoryCreated: "Şablon kategorisi oluşturuldu",
        TemplateCategoryUpdated: "Şablon kategorisi güncellendi",
        TemplateCategoryDeleted: "Şablon kategorisi silindi",
        TemplateCloned: "Şablon kopyalandı",
        TemplateDeleted: "Şablon silindi",
        TemplateVersionDeleted: "Taslak sürüm silindi",
        TemplateDraftSaved: "Taslak kaydedildi",
        TemplateRevisionCreated: "Yeni taslak oluşturuldu",
        TemplateFavorited: "Şablon favorilere eklendi",
        TemplateUnfavorited: "Şablon favorilerden çıkarıldı",
        TemplateUpdated: "Şablon bilgileri güncellendi",
        TemplateRestorationRequested: "Geri yükleme talebi oluşturuldu",
        TemplateRestorationApproved: "Geri yükleme onaylandı",
        TemplateRestorationRejected: "Geri yükleme reddedildi",
        TemplateRestored: "Şablon geri yüklendi",
        UserCreated: "Kullanıcı oluşturuldu",
        UserUpdated: "Kullanıcı güncellendi",
        UserPasswordResetIssued: "Parola sıfırlama gönderildi",
        UserTemporaryPasswordIssued: "Geçici parola verildi",
        VendorCreated: "Tedarikçi oluşturuldu",
        VendorUpdated: "Tedarikçi güncellendi",
        VendorDeleted: "Tedarikçi silindi",
    },
    en: {
        CategoryCreated: "Category created",
        CategoryUpdated: "Category updated",
        CategoryDeleted: "Category deleted",
        ImportSessionCreated: "Import file checked",
        ImportSessionCommitted: "Products imported",
        PrintIntentCreated: "Print request created",
        PrintIntentHandoffConfirmed: "Marked ready to print",
        PrintIntentHandoffFailed: "Readiness check failed",
        PrintIntentPdfDispatched: "Print PDF opened",
        PrintIntentUserPrinted: "Labels printed",
        PrintIntentFailed: "Print marked as failed",
        PrintIntentCancelled: "Print request cancelled",
        ProductCreated: "Product created",
        ProductUpdated: "Product updated",
        ProductDeleted: "Product deleted",
        ProductDeactivated: "Product deactivated",
        ProductTemplateLinked: "Template linked to product",
        ProductTemplateUnlinked: "Template unlinked from product",
        TemplateApprovalRequested: "Draft submitted for review",
        TemplateApproved: "Version approved",
        TemplateRejected: "Version rejected",
        TemplatePublished: "Version published",
        TemplateArchived: "Template archived",
        TemplateVersionArchived: "Version archived",
        TemplateCategoryCreated: "Template category created",
        TemplateCategoryUpdated: "Template category updated",
        TemplateCategoryDeleted: "Template category deleted",
        TemplateCloned: "Template cloned",
        TemplateDeleted: "Template deleted",
        TemplateVersionDeleted: "Draft version deleted",
        TemplateDraftSaved: "Draft saved",
        TemplateRevisionCreated: "New draft created",
        TemplateFavorited: "Template added to favorites",
        TemplateUnfavorited: "Template removed from favorites",
        TemplateUpdated: "Template details updated",
        TemplateRestorationRequested: "Restoration requested",
        TemplateRestorationApproved: "Restoration approved",
        TemplateRestorationRejected: "Restoration rejected",
        TemplateRestored: "Template restored",
        UserCreated: "User created",
        UserUpdated: "User updated",
        UserPasswordResetIssued: "Password reset issued",
        UserTemporaryPasswordIssued: "Temporary password issued",
        VendorCreated: "Vendor created",
        VendorUpdated: "Vendor updated",
        VendorDeleted: "Vendor deleted",
    },
};

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

function humanizeAction(action: string) {
    return action
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim();
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
