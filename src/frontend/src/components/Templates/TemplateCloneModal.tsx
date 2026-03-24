"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Portal } from "@/components/ui/Portal";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { CloneTemplateRequest, LabelTemplate, TemplateCategory, TemplateVersion } from "@/types/template";

type TemplateCodePreview = {
    categoryId: string;
    categoryCode: string;
    nextCode: string;
};

type CloneResponse = {
    template: LabelTemplate;
    version: TemplateVersion;
    sourceTemplateId: string;
    sourceVersionId: string;
};

type Props = {
    open: boolean;
    sourceTemplate: LabelTemplate | null;
    sourceVersion: TemplateVersion | null;
    onClose: () => void;
    onCloned: (templateId: string) => void;
};

function buildDefaultName(templateName: string, locale: "tr" | "en") {
    return locale === "tr" ? `${templateName} Kopya` : `${templateName} Copy`;
}

export function TemplateCloneModal({ open, sourceTemplate, sourceVersion, onClose, onCloned }: Props) {
    const { locale, t } = useI18n();
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [codePreview, setCodePreview] = useState("");
    const [form, setForm] = useState<CloneTemplateRequest>({ name: "", templateCategoryId: "", description: "" });

    const activeCategories = useMemo(
        () => categories.filter((category) => category.isActive),
        [categories],
    );

    useEffect(() => {
        if (!open || !sourceTemplate || !sourceVersion) {
            return;
        }

        setError(null);
        setForm({
            name: buildDefaultName(sourceTemplate.name, locale),
            templateCategoryId: sourceTemplate.templateCategoryId || "",
            description: sourceTemplate.description || "",
        });
    }, [locale, open, sourceTemplate, sourceVersion]);

    useEffect(() => {
        if (!open) {
            return;
        }

        let active = true;

        async function loadCategories() {
            setLoadingCategories(true);
            const response = await apiFetch<TemplateCategory[]>("/api/template-categories");
            if (!active) {
                return;
            }

            if (!response.success) {
                setError(response.error.message);
                setLoadingCategories(false);
                return;
            }

            setCategories(response.data);
            setError(null);
            if (sourceTemplate?.templateCategoryId && !response.data.some((category) => category.isActive && category.id === sourceTemplate.templateCategoryId)) {
                setForm((current) => ({ ...current, templateCategoryId: "" }));
            }
            setLoadingCategories(false);
        }

        void loadCategories();

        return () => {
            active = false;
        };
    }, [open]);

    useEffect(() => {
        if (!open || !form.templateCategoryId) {
            setCodePreview("");
            return;
        }

        let active = true;

        async function loadCodePreview() {
            const response = await apiFetch<TemplateCodePreview>(`/api/template-categories/${form.templateCategoryId}/next-code`);
            if (!active) {
                return;
            }

            if (!response.success) {
                setCodePreview("");
                setError(response.error.message);
                return;
            }

            setCodePreview(response.data.nextCode);
        }

        void loadCodePreview();

        return () => {
            active = false;
        };
    }, [form.templateCategoryId, open]);

    if (!open || !sourceTemplate || !sourceVersion) {
        return null;
    }

    const submitDisabled = submitting || loadingCategories || !form.name.trim() || !form.templateCategoryId || activeCategories.length === 0;

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!sourceTemplate || !sourceVersion) {
            return;
        }
        setSubmitting(true);
        setError(null);

        const response = await apiFetch<CloneResponse>(`/api/Templates/${sourceTemplate.id}/versions/${sourceVersion.id}/clone`, {
            method: "POST",
            body: JSON.stringify({
                name: form.name.trim(),
                templateCategoryId: form.templateCategoryId,
                description: form.description?.trim() || null,
            }),
        });

        setSubmitting(false);

        if (!response.success) {
            setError(response.error.message);
            return;
        }

        onClose();
        onCloned(response.data.template.id);
    }

    return (
        <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-2xl rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                        {t("templates.detailPage.cloneTemplate")}
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                        {sourceTemplate.code} · v{sourceVersion.versionNumber}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm font-medium text-[color:var(--plms-text-muted)]">
                        {t("templates.detailPage.cloneTemplateDescription")}
                    </p>

                    {error ? (
                        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">
                            {error}
                        </div>
                    ) : null}

                    <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
                        <div className="grid gap-5 md:grid-cols-2">
                            <label className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                                    {t("templates.detailPage.sourceVersion")}
                                </span>
                                <input value={`${sourceTemplate.name} · v${sourceVersion.versionNumber}`} readOnly className="plms-input opacity-80" />
                            </label>
                            <label className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                                    {t("templates.detailPage.generatedCode")}
                                </span>
                                <input value={codePreview} readOnly className="plms-input opacity-80" placeholder="PLM-ETK-001" />
                            </label>
                            <label className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                                    {t("templates.detailPage.targetCategory")}
                                </span>
                                <select
                                    value={form.templateCategoryId}
                                    onChange={(event) => setForm((current) => ({ ...current, templateCategoryId: event.target.value }))}
                                    className="plms-input"
                                    required
                                >
                                    <option value="">{t("templates.detailPage.selectCategory")}</option>
                                    {activeCategories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.code} - {category.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                                    {t("templates.detailPage.cloneName")}
                                </span>
                                <input
                                    value={form.name}
                                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                    className="plms-input"
                                    placeholder={t("templates.detailPage.cloneNamePlaceholder")}
                                    required
                                />
                            </label>
                            <label className="space-y-2 md:col-span-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">
                                    {t("templates.detailPage.cloneDescriptionLabel")}
                                </span>
                                <textarea
                                    value={form.description || ""}
                                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                    className="plms-input min-h-32"
                                    placeholder={t("templates.detailPage.cloneDescriptionPlaceholder")}
                                    rows={4}
                                />
                            </label>
                        </div>

                        {activeCategories.length === 0 ? (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">
                                <div>{t("templates.detailPage.noTemplateCategories")}</div>
                                <Link href="/templates/categories" className="mt-3 inline-flex text-sm font-black text-blue-200 underline underline-offset-4">
                                    {t("templates.detailPage.manageCategories")}
                                </Link>
                            </div>
                        ) : null}

                        <div className="flex justify-end gap-3">
                            <button type="button" className="plms-button-secondary" onClick={onClose}>
                                {t("common.cancel")}
                            </button>
                            <button type="submit" className="plms-button-primary" disabled={submitDisabled}>
                                {submitting ? t("templates.detailPage.cloneCreating") : t("templates.detailPage.createClone")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
}
