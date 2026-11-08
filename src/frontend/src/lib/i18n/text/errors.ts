import { defineMessages } from "../define";

/**
 * Translations for codes the backend sends instead of (or next to) English text:
 * readiness and safety check issues (CheckIssue.Code), CSV import row errors (ErrorType)
 * and API error codes (`code` on failed responses).
 */
export default defineMessages(
    {
        tr: {
            issues: {
                version_not_printable: (p: Record<string, string>) => `Şablon sürümü “${p.status ?? "?"}” durumunda. Yalnızca onaylı veya yayındaki sürümler basılabilir`,
                product_missing: () => "Ürün seçilmemiş. Baskı için bir ürün gerekli",
                product_not_linked: () => "Ürün bu şablona bağlı değil",
                variable_missing: (p: Record<string, string>) => `“${p.name ?? "?"}” alanı için üründe veri yok`,
                variable_unsupported: (p: Record<string, string>) => `“${p.name ?? "?"}” desteklenmeyen bir alan`,
                intent_context_missing: () => "Talepte şablon, sürüm veya ürün bilgisi eksik",
                snapshot_blocked: () => "Talep oluşturulurken hazırlık kontrolü engellenmişti",
                snapshot_unreadable: () => "Talebin hazırlık kaydı okunamadı",
                snapshot_missing: () => "Talebin hazırlık kaydı yok",
            } as Record<string, (p: Record<string, string>) => string>,
            fromSnapshot: "Talep anında",
            importErrors: {
                Malformed: () => "SKU ve ürün adı zorunlu",
                DuplicateInFile: () => "Bu SKU dosyada birden fazla kez geçiyor",
                DuplicateInDb: () => "Bu SKU sistemde zaten var",
                UnknownCategory: (value: string) => `“${value}” kodlu kategori bulunamadı`,
                UnknownVendor: (value: string) => `“${value}” kodlu tedarikçi bulunamadı`,
            } as Record<string, (value: string) => string>,
            importErrorTypes: {
                Malformed: "Eksik bilgi",
                DuplicateInFile: "Dosyada tekrar",
                DuplicateInDb: "Zaten var",
                UnknownCategory: "Kategori yok",
                UnknownVendor: "Tedarikçi yok",
                InvalidReference: "Geçersiz kod",
            } as Record<string, string>,
            api: {
                readiness_blocked: "Baskı talebi oluşturulamadı: hazırlık kontrolü engelledi",
                safety_check_failed: "Son güvenlik kontrolü geçilemedi",
            } as Record<string, string>,
        },
    },
    {
        issues: {
            version_not_printable: (p: Record<string, string>) => `The template version is “${p.status ?? "?"}”. Only approved or published versions can be printed`,
            product_missing: () => "No product selected. Printing needs a product",
            product_not_linked: () => "The product is not linked to this template",
            variable_missing: (p: Record<string, string>) => `The product has no data for “${p.name ?? "?"}”`,
            variable_unsupported: (p: Record<string, string>) => `“${p.name ?? "?"}” is not a supported field`,
            intent_context_missing: () => "The request is missing its template, version or product",
            snapshot_blocked: () => "The readiness check was blocked when the request was created",
            snapshot_unreadable: () => "The request's readiness record could not be read",
            snapshot_missing: () => "The request has no readiness record",
        } as Record<string, (p: Record<string, string>) => string>,
        fromSnapshot: "At request time",
        importErrors: {
            Malformed: () => "SKU and product name are required",
            DuplicateInFile: () => "This SKU appears more than once in the file",
            DuplicateInDb: () => "This SKU already exists",
            UnknownCategory: (value: string) => `No category with code “${value}”`,
            UnknownVendor: (value: string) => `No vendor with code “${value}”`,
        } as Record<string, (value: string) => string>,
        importErrorTypes: {
            Malformed: "Missing data",
            DuplicateInFile: "Repeated in file",
            DuplicateInDb: "Already exists",
            UnknownCategory: "Unknown category",
            UnknownVendor: "Unknown vendor",
            InvalidReference: "Invalid code",
        } as Record<string, string>,
        api: {
            readiness_blocked: "The print request could not be created: the readiness check blocked it",
            safety_check_failed: "The final safety check did not pass",
        } as Record<string, string>,
    },
);
