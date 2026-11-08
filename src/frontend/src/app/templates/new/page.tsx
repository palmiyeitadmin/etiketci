"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useText } from "@/lib/i18n";
import { CanonicalLabelModel } from "@/types/canvas";
import { TemplateCategory } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LabelProof } from "@/components/ui/LabelProof";
import { useLatest } from "@/lib/useLatest";

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
    const router = useRouter();
    const text = useText("templates").newTemplate;
    const textRef = useLatest(text);
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
                setError(response.error.message || textRef.current.loadFailed);
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
    }, [textRef]);

    useEffect(() => {
        async function loadCodePreview() {
            if (!form.templateCategoryId) {
                setCodePreview("");
                return;
            }

            const response = await apiFetch<TemplateCodePreview>(`/api/template-categories/${form.templateCategoryId}/next-code`);
            if (!response.success) {
                setCodePreview("");
                setError(response.error.message || textRef.current.loadFailed);
                return;
            }

            setCodePreview(response.data.nextCode);
        }

        void loadCodePreview();
    }, [form.templateCategoryId, textRef]);

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

    const previewWidthMm = Number.parseFloat(form.widthMm);
    const previewHeightMm = Number.parseFloat(form.heightMm);
    const previewValid = Number.isFinite(previewWidthMm) && Number.isFinite(previewHeightMm) && previewWidthMm > 0 && previewHeightMm > 0;
    const previewBoxWidth = previewValid ? (previewWidthMm >= previewHeightMm ? 240 : (240 * previewWidthMm) / previewHeightMm) : 0;

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="flex flex-col gap-6">
                <PageHeader
                    title={text.title}
                    description={text.description}
                    actions={<Link href="/templates/categories" className="plms-button-secondary">{text.manageCategories}</Link>}
                />

                {error ? (
                    <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>
                ) : null}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
                    </div>
                ) : activeCategories.length === 0 ? (
                    <EmptyState
                        title={text.noActiveCategoriesTitle}
                        description={text.noActiveCategoriesDescription}
                        action={<Link href="/templates/categories" className="plms-button-primary">{text.manageCategories}</Link>}
                    />
                ) : (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <section className="rounded-xl border border-line bg-surface p-5">
                                <h2 className="text-md font-medium text-ink">{text.identity}</h2>
                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <label className="flex flex-col gap-1.5 md:col-span-2">
                                        <span className="plms-label">{text.name}</span>
                                        <input
                                            value={form.name}
                                            onChange={(e) => handleChange("name", e.target.value)}
                                            required
                                            className="plms-input"
                                            placeholder={text.namePlaceholder}
                                        />
                                    </label>

                                    <label className="flex flex-col gap-1.5">
                                        <span className="plms-label">{text.category}</span>
                                        <select
                                            value={form.templateCategoryId}
                                            onChange={(e) => handleChange("templateCategoryId", e.target.value)}
                                            className="plms-select w-full"
                                            required
                                        >
                                            <option value="">{text.noCategory}</option>
                                            {activeCategories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.code} · {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="flex flex-col gap-1.5">
                                        <span className="plms-label">{text.code}</span>
                                        <input
                                            value={codePreview}
                                            readOnly
                                            className="plms-input bg-raised font-mono text-ink-2"
                                            placeholder="PLM-ETK-001"
                                        />
                                    </label>

                                    <label className="flex flex-col gap-1.5 md:col-span-2">
                                        <span className="plms-label">{text.descriptionLabel}</span>
                                        <textarea
                                            value={form.description}
                                            onChange={(e) => handleChange("description", e.target.value)}
                                            rows={4}
                                            className="plms-input min-h-28"
                                            placeholder={text.descriptionPlaceholder}
                                        />
                                    </label>
                                </div>
                            </section>

                            <section className="rounded-xl border border-line bg-surface p-5">
                                <h2 className="text-md font-medium text-ink">{text.dimensions}</h2>
                                <p className="mt-0.5 text-sm text-ink-3">{text.dimensionsHelp}</p>
                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <label className="flex flex-col gap-1.5">
                                        <span className="plms-label">{text.width}</span>
                                        <input type="number" min="1" step="0.1" value={form.widthMm} onChange={(e) => handleChange("widthMm", e.target.value)} required className="plms-input tabular font-mono" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="plms-label">{text.height}</span>
                                        <input type="number" min="1" step="0.1" value={form.heightMm} onChange={(e) => handleChange("heightMm", e.target.value)} required className="plms-input tabular font-mono" />
                                    </label>
                                </div>
                            </section>

                            <div className="flex justify-end gap-2">
                                <Link href="/templates" className="plms-button-ghost">{text.cancel}</Link>
                                <button type="submit" disabled={saving || !form.templateCategoryId || !codePreview} className="plms-button-primary">
                                    {saving ? text.creating : text.create}
                                </button>
                            </div>
                        </form>

                        <aside className="flex flex-col gap-6">
                            <section className="rounded-xl border border-line bg-surface p-5">
                                <h2 className="text-md font-medium text-ink">{text.preview}</h2>
                                <div className="mt-4 flex justify-center rounded-lg border border-line bg-canvas px-8 pb-5 pt-8">
                                    {previewValid ? (
                                        <div style={{ width: previewBoxWidth }}>
                                            <LabelProof widthMm={previewWidthMm} heightMm={previewHeightMm}>
                                                <div className="flex h-full w-full flex-col justify-between p-3">
                                                    <span className="truncate text-sm text-ink">{form.name || text.blankLabel}</span>
                                                    <span className="truncate font-mono text-xs text-ink-3">{codePreview}</span>
                                                </div>
                                            </LabelProof>
                                        </div>
                                    ) : (
                                        <span className="py-12 text-sm text-ink-3">{text.invalidDimensions}</span>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-xl border border-line bg-surface p-5">
                                <h2 className="text-md font-medium text-ink">{text.governance}</h2>
                                <div className="mt-2 flex flex-col gap-3 text-sm text-ink-2">
                                    <p>{text.governanceDescription}</p>
                                    <p>
                                        <span className="text-ink-3">{text.codeFormat} </span>
                                        <span className="font-mono text-ink">{text.categoryHint}</span>
                                    </p>
                                    <p className="text-ink-3">{text.codeHint}</p>
                                </div>
                            </section>

                            <section className="overflow-hidden rounded-xl border border-line bg-surface">
                                <h2 className="border-b border-line px-5 py-3 text-md font-medium text-ink">{text.categories}</h2>
                                <ul className="divide-y divide-line">
                                    {activeCategories.map((category) => {
                                        const selected = form.templateCategoryId === category.id;
                                        return (
                                            <li
                                                key={category.id}
                                                className={`flex items-center justify-between gap-3 px-5 py-2.5 text-sm ${selected ? "bg-accent-soft" : ""}`}
                                                aria-current={selected || undefined}
                                            >
                                                <span className={selected ? "font-medium text-ink" : "text-ink-2"}>{category.name}</span>
                                                <span className={`tabular whitespace-nowrap font-mono text-xs ${selected ? "text-accent" : "text-ink-3"}`}>
                                                    PLM-{category.code}-{String(category.nextTemplateSequence).padStart(3, "0")}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        </aside>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
