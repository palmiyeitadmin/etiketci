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
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        productId: "",
        templateId: "",
        versionId: "",
        quantity: 1,
    });

    const text = locale === "tr"
        ? {
            title: "Baskı talebi oluştur",
            description: "Ürün, yayındaki şablon sürümü ve adet seçin. Talep, operatör onayından sonra basılır.",
            product: "Ürün",
            selectProduct: "Ürün seçin",
            template: "Şablon",
            selectTemplate: "Şablon seçin",
            publishedVersion: "Yayındaki sürüm",
            selectVersion: "Sürüm seçin",
            version: "Sürüm",
            quantity: "Adet",
            loading: "Yükleniyor",
            summary: "Özet",
            selectedTemplate: "Şablon",
            selectedProduct: "Ürün",
            noSelection: "Seçilmedi",
            versionState: "Sürüm",
            publishedLabel: "Yayında, sürüm {n}",
            awaitingSelection: "Seçim bekleniyor",
            creating: "Oluşturuluyor",
            createPrintIntent: "Baskı talebi oluştur",
            cancel: "Vazgeç",
            createFailed: "Baskı talebi oluşturulamadı.",
        }
        : {
            title: "Create print request",
            description: "Select a product, a published template version and a quantity. The request is printed after operator approval.",
            product: "Product",
            selectProduct: "Select product",
            template: "Template",
            selectTemplate: "Select template",
            publishedVersion: "Published version",
            selectVersion: "Select version",
            version: "Version",
            quantity: "Quantity",
            loading: "Loading",
            summary: "Summary",
            selectedTemplate: "Template",
            selectedProduct: "Product",
            noSelection: "Not selected",
            versionState: "Version",
            publishedLabel: "Published, version {n}",
            awaitingSelection: "Waiting for selection",
            creating: "Creating",
            createPrintIntent: "Create print request",
            cancel: "Cancel",
            createFailed: "Print request could not be created.",
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
    const selectedProduct = useMemo(() => products.find((product) => product.id === form.productId), [products, form.productId]);
    const selectedVersion = useMemo(() => templateVersions.find((version) => version.id === form.versionId), [templateVersions, form.versionId]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

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

        setError(res.error.message || text.createFailed);
    };

    return (
        <RoleGuard allowedRoles={["Admin", "Operator"]}>
            <div className="flex flex-col gap-6 pb-10">
                <PageHeader title={text.title} description={text.description} />

                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-20 text-sm text-ink-2">
                        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
                        {text.loading}
                    </div>
                ) : (
                    <form className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={submit}>
                        <div className="grid grid-cols-1 gap-5 rounded-xl border border-line bg-surface p-6 md:grid-cols-2">
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                                <label htmlFor="intent-product" className="plms-label">{text.product}</label>
                                <select id="intent-product" className="plms-select w-full" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
                                    <option value="">{text.selectProduct}</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5 md:col-span-2">
                                <label htmlFor="intent-template" className="plms-label">{text.template}</label>
                                <select id="intent-template" className="plms-select w-full" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} required>
                                    <option value="">{text.selectTemplate}</option>
                                    {templates.map((template) => (
                                        <option key={template.id} value={template.id}>{template.code} - {template.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="intent-version" className="plms-label">{text.publishedVersion}</label>
                                <select id="intent-version" className="plms-select w-full" value={form.versionId} onChange={(e) => setForm({ ...form, versionId: e.target.value })} required>
                                    <option value="">{text.selectVersion}</option>
                                    {templateVersions.map((version) => (
                                        <option key={version.id} value={version.id}>{text.version} {version.versionNumber}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="intent-quantity" className="plms-label">{text.quantity}</label>
                                <input id="intent-quantity" className="plms-input tabular" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required />
                            </div>
                        </div>

                        <aside className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
                            <h2 className="text-base font-medium text-ink">{text.summary}</h2>
                            <dl className="flex flex-col gap-3 text-sm">
                                <div className="flex flex-col gap-0.5">
                                    <dt className="text-ink-3">{text.selectedProduct}</dt>
                                    <dd className="text-ink">
                                        {selectedProduct ? (
                                            <>
                                                {selectedProduct.name}
                                                <span className="ml-2 whitespace-nowrap font-mono text-xs text-ink-3">{selectedProduct.sku}</span>
                                            </>
                                        ) : <span className="text-ink-3">{text.noSelection}</span>}
                                    </dd>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <dt className="text-ink-3">{text.selectedTemplate}</dt>
                                    <dd className="text-ink">
                                        {selectedTemplate ? (
                                            <>
                                                {selectedTemplate.name}
                                                <span className="ml-2 whitespace-nowrap font-mono text-xs text-ink-3">{selectedTemplate.code}</span>
                                            </>
                                        ) : <span className="text-ink-3">{text.noSelection}</span>}
                                    </dd>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <dt className="text-ink-3">{text.versionState}</dt>
                                    <dd>
                                        {selectedVersion
                                            ? <StatusBadge label={text.publishedLabel.replace("{n}", String(selectedVersion.versionNumber))} tone="success" />
                                            : <StatusBadge label={text.awaitingSelection} tone="neutral" />}
                                    </dd>
                                </div>
                            </dl>
                            {error ? <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
                            <div className="flex flex-col gap-2">
                                <button className="plms-button-primary w-full" type="submit" disabled={submitting || !form.productId || !form.templateId || !form.versionId}>
                                    {submitting ? text.creating : text.createPrintIntent}
                                </button>
                                <button type="button" className="plms-button-ghost w-full" onClick={() => router.push("/print-intents")}>
                                    {text.cancel}
                                </button>
                            </div>
                        </aside>
                    </form>
                )}
            </div>
        </RoleGuard>
    );
}
