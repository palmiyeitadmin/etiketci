"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { Product } from "@/types/product";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function CreatePrintIntentPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [templates, setTemplates] = useState<LabelTemplate[]>([]);
    const [templateVersions, setTemplateVersions] = useState<TemplateVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        productId: "",
        templateId: "",
        versionId: "",
        quantity: 1,
    });

    useEffect(() => {
        async function load() {
            const [productsRes, templatesRes] = await Promise.all([
                apiFetch<Product[]>("/api/Products"),
                apiFetch<LabelTemplate[]>("/api/Templates"),
            ]);

            if (productsRes.success) setProducts(productsRes.data.filter((product) => product.isActive));
            if (templatesRes.success) setTemplates(templatesRes.data.map(normalizeLabelTemplate));
            setLoading(false);
        }

        load();
    }, []);

    useEffect(() => {
        if (!form.templateId) {
            setTemplateVersions([]);
            return;
        }

        async function loadTemplate() {
            const res = await apiFetch<LabelTemplate>(`/api/Templates/${form.templateId}`);
            if (res.success) {
                const template = normalizeLabelTemplate(res.data);
                const publishedVersions = (template.versions || []).filter((version) => version.status === "Published");
                setTemplateVersions(publishedVersions);
                setForm((current) => ({
                    ...current,
                    versionId: publishedVersions[0]?.id || "",
                }));
            }
        }

        loadTemplate();
    }, [form.templateId]);

    const selectedTemplate = useMemo(() => templates.find((template) => template.id === form.templateId), [templates, form.templateId]);
    const selectedVersion = useMemo(() => templateVersions.find((version) => version.id === form.versionId), [templateVersions, form.versionId]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);

        const res = await apiFetch<{ id: string }>("/api/PrintIntents", {
            method: "POST",
            body: JSON.stringify({
                productId: form.productId,
                templateId: form.templateId,
                versionId: form.versionId,
                quantity: form.quantity,
            }),
        });

        setSubmitting(false);

        if (res.success) {
            router.push(`/print-intents/${res.data.id}`);
            return;
        }

        alert(res.error.message);
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="mx-auto max-w-5xl space-y-6">
                <PageHeader
                    eyebrow="Print preparation"
                    title="Create Print Intent"
                    description="Select a product, published template version and quantity before operator handoff."
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : (
                    <form className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" onSubmit={submit}>
                        <div className="space-y-6 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Product</label>
                                <select className="plms-select w-full" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
                                    <option value="">Select product</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Template</label>
                                <select className="plms-select w-full" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} required>
                                    <option value="">Select template</option>
                                    {templates.map((template) => (
                                        <option key={template.id} value={template.id}>{template.code} - {template.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Published Version</label>
                                <select className="plms-select w-full" value={form.versionId} onChange={(e) => setForm({ ...form, versionId: e.target.value })} required>
                                    <option value="">Select version</option>
                                    {templateVersions.map((version) => (
                                        <option key={version.id} value={version.id}>Version {version.versionNumber}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Quantity</label>
                                <input className="plms-input" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required />
                            </div>
                        </div>

                        <div className="space-y-6 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Readiness Snapshot</div>
                                <div className="mt-4 space-y-3">
                                    <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
                                        <div className="text-xs font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Selected template</div>
                                        <div className="mt-2 text-sm font-bold text-white">
                                            {selectedTemplate ? `${selectedTemplate.code} - ${selectedTemplate.name}` : "No template selected"}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
                                        <div className="text-xs font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Version state</div>
                                        <div className="mt-2">
                                            {selectedVersion ? <StatusBadge label={`Published v${selectedVersion.versionNumber}`} tone="success" /> : <StatusBadge label="Awaiting selection" tone="warning" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button className="plms-button-primary w-full" type="submit" disabled={submitting || !form.productId || !form.templateId || !form.versionId}>
                                {submitting ? "Creating..." : "Create Print Intent"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </RoleGuard>
    );
}
