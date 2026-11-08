"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Portal } from "@/components/ui/Portal";
import { apiFetch } from "@/lib/api-client";
import { useText } from "@/lib/i18n";
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

export function TemplateCloneModal({ open, sourceTemplate, sourceVersion, onClose, onCloned }: Props) {
    const text = useText("templates").cloneModal;
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
            name: text.defaultName(sourceTemplate.name),
            templateCategoryId: sourceTemplate.templateCategoryId || "",
            description: sourceTemplate.description || "",
        });
    }, [text, open, sourceTemplate, sourceVersion]);

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
    }, [open, sourceTemplate?.templateCategoryId]);

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

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !submitting) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, submitting, onClose]);

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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
                <div role="dialog" aria-modal="true" aria-labelledby="clone-modal-title" className="flex w-full max-w-2xl flex-col gap-5 rounded-xl border border-line bg-surface p-5 shadow-pop">
                    <div className="flex flex-col gap-1.5">
                        <h2 id="clone-modal-title" className="text-md font-medium text-ink">{text.title}</h2>
                        <p className="text-sm text-ink-2">{text.description}</p>
                    </div>

                    {error ? (
                        <div role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>
                    ) : null}

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="flex flex-col gap-1.5">
                                <span className="plms-label">{text.sourceVersion}</span>
                                <input value={`${sourceTemplate.code} · v${sourceVersion.versionNumber}`} readOnly className="plms-input bg-raised font-mono text-ink-2" title={sourceTemplate.name} />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="plms-label">{text.generatedCode}</span>
                                <input value={codePreview} readOnly className="plms-input bg-raised font-mono text-ink-2" placeholder="PLM-ETK-001" />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="plms-label">{text.targetCategory}</span>
                                <select
                                    value={form.templateCategoryId}
                                    onChange={(event) => setForm((current) => ({ ...current, templateCategoryId: event.target.value }))}
                                    className="plms-select w-full"
                                    required
                                >
                                    <option value="">{text.selectCategory}</option>
                                    {activeCategories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.code} · {category.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="plms-label">{text.name}</span>
                                <input
                                    value={form.name}
                                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                    className="plms-input"
                                    placeholder={text.namePlaceholder}
                                    required
                                    autoFocus
                                />
                            </label>
                            <label className="flex flex-col gap-1.5 md:col-span-2">
                                <span className="plms-label">{text.descriptionLabel}</span>
                                <textarea
                                    value={form.description || ""}
                                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                    className="plms-input min-h-24"
                                    placeholder={text.descriptionPlaceholder}
                                    rows={3}
                                />
                            </label>
                        </div>

                        {!loadingCategories && activeCategories.length === 0 ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
                                <span>{text.noCategories}</span>
                                <Link href="/templates/categories" className="font-medium text-accent hover:text-accent-hover">
                                    {text.manageCategories}
                                </Link>
                            </div>
                        ) : null}

                        <div className="flex justify-end gap-2">
                            <button type="button" className="plms-button-ghost" onClick={onClose}>
                                {text.cancel}
                            </button>
                            <button type="submit" className="plms-button-primary" disabled={submitDisabled}>
                                {submitting ? text.creating : text.create}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
}
