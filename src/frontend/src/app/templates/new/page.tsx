"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { CanonicalLabelModel } from "@/types/canvas";
import { TemplateCategory } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

type TemplateFormState = {
    name: string;
    templateCategoryId: string;
    description: string;
    widthMm: string;
    heightMm: string;
};

type TemplateCodePreview = {
    categoryId: string;
    categoryCode: string;
    nextCode: string;
};

const initialFormState: TemplateFormState = {
    name: "",
    templateCategoryId: "",
    description: "",
    widthMm: "100",
    heightMm: "150",
};

function getErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== "object") return fallback;

    const errorRecord = error as Record<string, unknown>;
    if (typeof errorRecord.message === "string" && errorRecord.message.trim()) {
        return errorRecord.message;
    }

    return fallback;
}

function createInitialLayout(name: string, widthMm: number, heightMm: number): string {
    const model: CanonicalLabelModel = {
        version: "1.0",
        name,
        dimensions: { widthMm, heightMm },
        elements: [],
    };

    return JSON.stringify(model);
}

export default function NewTemplatePage() {
    const { locale } = useI18n();
    const router = useRouter();
    const text = locale === "tr"
        ? {
            eyebrow: "Sablon olusturma",
            title: "Yeni Sablon",
            description: "Yeni sablon kaydi olustururken kategoriye bagli otomatik kod uretilir ve editor taslak V1 ile acilir.",
            loadFailed: "Sablon kategorileri yuklenemedi.",
            invalidDimensions: "Etiket boyutlari pozitif sayilar olmalidir.",
            createFailed: "Sablon olusturulamadi.",
            loading: "Sablon kategorileri yukleniyor...",
            identity: "Kimlik",
            category: "Sablon Kategorisi",
            manageCategories: "Kategori Yonetimi",
            noCategory: "Kategori secin",
            noActiveCategoriesTitle: "Aktif sablon kategorisi yok",
            noActiveCategoriesDescription: "Yeni sablon olusturabilmek icin once en az bir aktif sablon kategorisi tanimlayin.",
            code: "Sablon Kodu",
            name: "Sablon Adi",
            descriptionLabel: "Aciklama",
            dimensions: "Yerlesim Boyutlari",
            width: "Genislik (mm)",
            height: "Yukseklik (mm)",
            governance: "Yonetişim Notlari",
            governanceDescription: "Kategori secimi kodu otomatik belirler. Yeni sablon taslak V1 olarak acilir ve yayin oncesi approval akisindan gecer.",
            categoryHint: "Kod formati: PLM-{kategori}-{sira}",
            codeHint: "Kod backend tarafinda kategori sirasi ile uretilir ve degistirilemez.",
            dimensionsHelp: "Bos yerlesim bu fiziksel boyutlarla olusturulur. Sonraki adimda editor icinde metin, sekil, QR, barkod ve gorsel oge yerlestirebilirsiniz.",
            cancel: "Iptal",
            creating: "Olusturuluyor...",
            create: "Sablon Olustur",
        }
        : {
            eyebrow: "Template creation",
            title: "New Template",
            description: "New template records receive a category-based generated code and open in the editor as draft v1.",
            loadFailed: "Template categories could not be loaded.",
            invalidDimensions: "Label dimensions must be positive numbers.",
            createFailed: "Template could not be created.",
            loading: "Loading template categories...",
            identity: "Identity",
            category: "Template Category",
            manageCategories: "Manage Categories",
            noCategory: "Select category",
            noActiveCategoriesTitle: "No active template category",
            noActiveCategoriesDescription: "Create at least one active template category before creating a new template.",
            code: "Template Code",
            name: "Template Name",
            descriptionLabel: "Description",
            dimensions: "Layout Dimensions",
            width: "Width (mm)",
            height: "Height (mm)",
            governance: "Governance Notes",
            governanceDescription: "Category selection defines the generated code. New templates open as draft v1 and continue through the approval flow before publication.",
            categoryHint: "Code format: PLM-{category}-{sequence}",
            codeHint: "Code is generated server-side from the category sequence and cannot be edited.",
            dimensionsHelp: "A blank layout is created with these physical dimensions. Place text, shapes, QR, barcode and image elements in the next step.",
            cancel: "Cancel",
            creating: "Creating...",
            create: "Create Template",
        };
    const [form, setForm] = useState<TemplateFormState>(initialFormState);
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [codePreview, setCodePreview] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeCategories = useMemo(() => categories.filter((category) => category.isActive), [categories]);

    useEffect(() => {
        async function loadCategories() {
            const response = await apiFetch<TemplateCategory[]>("/api/template-categories");
            if (!response.success) {
                setError(response.error.message || text.loadFailed);
                setLoading(false);
                return;
            }

            const nextCategories = response.data;
            setCategories(nextCategories);
            const firstActiveCategory = nextCategories.find((category) => category.isActive);
            if (firstActiveCategory) {
                setForm((current) => ({ ...current, templateCategoryId: firstActiveCategory.id }));
            }
            setLoading(false);
        }

        void loadCategories();
    }, []);

    useEffect(() => {
        async function loadCodePreview() {
            if (!form.templateCategoryId) {
                setCodePreview("");
                return;
            }

            const response = await apiFetch<TemplateCodePreview>(`/api/template-categories/${form.templateCategoryId}/next-code`);
            if (!response.success) {
                setCodePreview("");
                setError(response.error.message || text.loadFailed);
                return;
            }

            setCodePreview(response.data.nextCode);
        }

        void loadCodePreview();
    }, [form.templateCategoryId]);

    const handleChange = (field: keyof TemplateFormState, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);

        const widthMm = Number.parseFloat(form.widthMm);
        const heightMm = Number.parseFloat(form.heightMm);

        if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) {
            setError(text.invalidDimensions);
            setSaving(false);
            return;
        }

        const response = await apiFetch<{ id: string }>("/api/Templates", {
            method: "POST",
            body: JSON.stringify({
                name: form.name.trim(),
                templateCategoryId: form.templateCategoryId,
                description: form.description.trim(),
                initialLayoutJson: createInitialLayout(form.name.trim(), widthMm, heightMm),
            }),
        });

        if (response.success) {
            router.push(`/templates/${response.data.id}/edit`);
            return;
        }

        setError(getErrorMessage(response.error, text.createFailed));
        setSaving(false);
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="mx-auto max-w-7xl space-y-6">
                <PageHeader
                    eyebrow={text.eyebrow}
                    title={text.title}
                    description={text.description}
                    actions={<Link href="/templates/categories" className="plms-button-secondary">{text.manageCategories}</Link>}
                />

                {error ? (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">
                        {error}
                    </div>
                ) : null}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
                    </div>
                ) : activeCategories.length === 0 ? (
                    <EmptyState
                        title={text.noActiveCategoriesTitle}
                        description={text.noActiveCategoriesDescription}
                    />
                ) : (
                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <section className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.identity}</div>
                                <div className="mt-5 grid gap-5 md:grid-cols-2">
                                    <label className="space-y-2 md:col-span-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.name}</span>
                                        <input
                                            value={form.name}
                                            onChange={(e) => handleChange("name", e.target.value)}
                                            required
                                            className="plms-input"
                                            placeholder={locale === "tr" ? "Yeni etiket sablonu" : "New label template"}
                                        />
                                    </label>

                                    <label className="space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.category}</span>
                                        <select
                                            value={form.templateCategoryId}
                                            onChange={(e) => handleChange("templateCategoryId", e.target.value)}
                                            className="plms-input"
                                            required
                                        >
                                            <option value="">{text.noCategory}</option>
                                            {activeCategories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.code} - {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.code}</span>
                                        <input
                                            value={codePreview}
                                            readOnly
                                            className="plms-input opacity-80"
                                            placeholder="PLM-ETK-001"
                                        />
                                    </label>

                                    <label className="space-y-2 md:col-span-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.descriptionLabel}</span>
                                        <textarea
                                            value={form.description}
                                            onChange={(e) => handleChange("description", e.target.value)}
                                            rows={5}
                                            className="plms-input min-h-36"
                                            placeholder={locale === "tr" ? "Operasyon notlari, alt malzeme ve kullanim kapsami" : "Operational notes, substrate and usage scope"}
                                        />
                                    </label>
                                </div>
                            </section>

                            <section className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.dimensions}</div>
                                <div className="mt-5 grid gap-5 md:grid-cols-2">
                                    <label className="space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.width}</span>
                                        <input type="number" min="1" step="0.1" value={form.widthMm} onChange={(e) => handleChange("widthMm", e.target.value)} required className="plms-input" />
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.height}</span>
                                        <input type="number" min="1" step="0.1" value={form.heightMm} onChange={(e) => handleChange("heightMm", e.target.value)} required className="plms-input" />
                                    </label>
                                </div>
                                <div className="mt-5 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4 text-sm font-medium text-[color:var(--plms-text-subtle)]">
                                    {text.dimensionsHelp}
                                </div>
                            </section>

                            <div className="flex justify-end gap-3">
                                <Link href="/templates" className="plms-button-secondary">{text.cancel}</Link>
                                <button type="submit" disabled={saving || !form.templateCategoryId || !codePreview} className="plms-button-primary">
                                    {saving ? text.creating : text.create}
                                </button>
                            </div>
                        </form>

                        <aside className="space-y-6">
                            <section className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.governance}</div>
                                <div className="mt-4 space-y-4 text-sm font-medium text-[color:var(--plms-text-subtle)]">
                                    <p>{text.governanceDescription}</p>
                                    <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-blue-100">
                                        {text.categoryHint}
                                    </div>
                                    <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
                                        {text.codeHint}
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.category}</div>
                                <div className="mt-4 space-y-3">
                                    {activeCategories.map((category) => (
                                        <div
                                            key={category.id}
                                            className={`rounded-2xl border px-4 py-3 transition-colors ${form.templateCategoryId === category.id ? "border-blue-400/30 bg-blue-500/10" : "border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)]"}`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-bold text-white">{category.name}</div>
                                                    <div className="mt-1 text-xs font-mono text-[color:var(--plms-text-subtle)]">{category.code}</div>
                                                </div>
                                                <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">
                                                    PLM-{category.code}-{String(category.nextTemplateSequence).padStart(3, "0")}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </aside>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
