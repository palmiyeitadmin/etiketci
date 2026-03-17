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
import { useI18n } from "@/lib/i18n";

export default function CreatePrintIntentPage() {
    const { locale } = useI18n();
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

    const text = locale === "tr"
        ? {
            eyebrow: "Baski hazirligi",
            title: "Print Intent Olustur",
            description: "Operator aktarimindan once urun, yayinlanmis sablon surumu ve miktar secin.",
            product: "Urun",
            selectProduct: "Urun secin",
            template: "Sablon",
            selectTemplate: "Sablon secin",
            publishedVersion: "Yayinlanmis Surum",
            selectVersion: "Surum secin",
            version: "Surum",
            quantity: "Miktar",
            readinessSnapshot: "Hazirlik Ozeti",
            selectedTemplate: "Secilen sablon",
            noTemplateSelected: "Sablon secilmedi",
            versionState: "Surum durumu",
            awaitingSelection: "Secim bekleniyor",
            creating: "Olusturuluyor...",
            createPrintIntent: "Print Intent Olustur",
        }
        : {
            eyebrow: "Print preparation",
            title: "Create Print Intent",
            description: "Select a product, published template version and quantity before operator handoff.",
            product: "Product",
            selectProduct: "Select product",
            template: "Template",
            selectTemplate: "Select template",
            publishedVersion: "Published Version",
            selectVersion: "Select version",
            version: "Version",
            quantity: "Quantity",
            readinessSnapshot: "Readiness Snapshot",
            selectedTemplate: "Selected template",
            noTemplateSelected: "No template selected",
            versionState: "Version state",
            awaitingSelection: "Awaiting selection",
            creating: "Creating...",
            createPrintIntent: "Create Print Intent",
        };

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
                    eyebrow={text.eyebrow}
                    title={text.title}
                    description={text.description}
                />

                {loading ? (
                    <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>
                ) : (
                    <form className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" onSubmit={submit}>
                        <div className="space-y-6 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.product}</label>
                                <select className="plms-select w-full" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
                                    <option value="">{text.selectProduct}</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.template}</label>
                                <select className="plms-select w-full" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} required>
                                    <option value="">{text.selectTemplate}</option>
                                    {templates.map((template) => (
                                        <option key={template.id} value={template.id}>{template.code} - {template.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.publishedVersion}</label>
                                <select className="plms-select w-full" value={form.versionId} onChange={(e) => setForm({ ...form, versionId: e.target.value })} required>
                                    <option value="">{text.selectVersion}</option>
                                    {templateVersions.map((version) => (
                                        <option key={version.id} value={version.id}>{text.version} {version.versionNumber}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.quantity}</label>
                                <input className="plms-input" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required />
                            </div>
                        </div>

                        <div className="space-y-6 rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.readinessSnapshot}</div>
                                <div className="mt-4 space-y-3">
                                    <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
                                        <div className="text-xs font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.selectedTemplate}</div>
                                        <div className="mt-2 text-sm font-bold text-white">
                                            {selectedTemplate ? `${selectedTemplate.code} - ${selectedTemplate.name}` : text.noTemplateSelected}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
                                        <div className="text-xs font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.versionState}</div>
                                        <div className="mt-2">
                                            {selectedVersion ? <StatusBadge label={`Published v${selectedVersion.versionNumber}`} tone="success" /> : <StatusBadge label={text.awaitingSelection} tone="warning" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button className="plms-button-primary w-full" type="submit" disabled={submitting || !form.productId || !form.templateId || !form.versionId}>
                                {submitting ? text.creating : text.createPrintIntent}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </RoleGuard>
    );
}
