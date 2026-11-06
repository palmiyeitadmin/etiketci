"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { Product } from "@/types/product";
import { ProductTemplateDto } from "@/types/operational";
import { LabelTemplate } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SlideOver } from "@/components/ui/SlideOver";

export default function ProductDetailPage() {
  const { formatDateTime, locale } = useI18n();
  const params = useParams();
  const id = String(params.id);
  const text = locale === "tr"
    ? {
      eyebrow: "Ürün bağlamı",
      description: "Ürün ana verisi ve bağlı etiket şablonları.",
      back: "Ürünlere Dön",
      linkTemplate: "Şablon Bağla",
      notFound: "Ürün bulunamadı",
      notFoundDescription: "İstenen ürün kaydı yüklenemedi.",
      status: "Durum",
      category: "Kategori",
      vendor: "Tedarikçi",
      uncategorized: "Kategorisiz",
      direct: "Doğrudan",
      linkedTemplates: "Bağlı Şablonlar",
      linkedDescription: "Bu üründen prova ve baskı talebi oluşturmak için kullanılabilecek şablonlar.",
      noLinked: "Bağlı şablon yok",
      noLinkedDescription: "Ürün bağlamlı önizleme veya baskı talebi için en az bir şablon bağlayın.",
      code: "Kod",
      template: "Şablon",
      priority: "Öncelik",
      actions: "İşlemler",
      default: "Varsayılan",
      secondary: "İkincil",
      preview: "Önizleme",
      setDefault: "Varsayılan Yap",
      openTemplate: "Şablonu Aç",
      unlink: "Bağlantıyı Kaldır",
      recordTimeline: "Kayıt Zaman Çizelgesi",
      created: "Oluşturuldu",
      updated: "Güncellendi",
      linkedCount: "Bağlı Şablonlar",
      guidance: "Operasyon Rehberi",
      guidance1: "Yalnızca bağlı şablonlar ürün bağlamlı önizleme ve baskı talebi oluşturmada kullanılabilir.",
      guidance2: "Varsayılan şablon operatörler için önerilen giriş noktası olur.",
      guidance3: "Yayındaki şablon sürümleri değiştirilemez; düzenleme yeni bir taslak revizyon oluşturur.",
      modalTitle: "Şablon Bağla",
      modalLabel: "Şablon",
      selectTemplate: "Şablon seçin",
      markDefault: "Bu ürün için varsayılan şablon olarak işaretle",
      linking: "Bağlanıyor...",
    }
    : {
      eyebrow: "Product context",
      description: "Product master data and linked label templates.",
      back: "Back to Products",
      linkTemplate: "Link Template",
      notFound: "Product not found",
      notFoundDescription: "The requested product record could not be loaded.",
      status: "Status",
      category: "Category",
      vendor: "Vendor",
      uncategorized: "Uncategorized",
      direct: "Direct",
      linkedTemplates: "Linked Templates",
      linkedDescription: "Templates available for proof generation and print intent creation from this product.",
      noLinked: "No templates linked",
      noLinkedDescription: "Link at least one template to generate product-context previews or print intents.",
      code: "Code",
      template: "Template",
      priority: "Priority",
      actions: "Actions",
      default: "Default",
      secondary: "Secondary",
      preview: "Preview",
      setDefault: "Set Default",
      openTemplate: "Open Template",
      unlink: "Unlink",
      recordTimeline: "Record Timeline",
      created: "Created",
      updated: "Updated",
      linkedCount: "Linked Templates",
      guidance: "Operational Guidance",
      guidance1: "Only linked templates can be used with product-context preview and print intent creation.",
      guidance2: "The default template is the recommended entry point for operators.",
      guidance3: "Published template versions remain immutable; edits create a new draft revision.",
      modalTitle: "Link Template",
      modalLabel: "Template",
      selectTemplate: "Select template",
      markDefault: "Mark as default template for this product",
      linking: "Linking...",
    };

  const [product, setProduct] = useState<Product | null>(null);
  const [links, setLinks] = useState<ProductTemplateDto[]>([]);
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const [productRes, linkRes, templateRes] = await Promise.all([
      apiFetch<Product>(`/api/Products/${id}`),
      apiFetch<ProductTemplateDto[]>(`/api/Products/${id}/Templates`),
      apiFetch<LabelTemplate[]>(`/api/Templates`),
    ]);

    if (productRes.success) {
      setProduct(productRes.data);
    } else {
      setMessage(productRes.error.message);
    }

    if (linkRes.success) {
      setLinks(linkRes.data);
    }

    if (templateRes.success) {
      setTemplates(templateRes.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  const availableTemplates = useMemo(
    () => templates.filter((template) => !links.some((link) => link.templateId === template.id)),
    [links, templates]
  );

  async function handleLink() {
    if (!selectedTemplateId) return;

    setSubmitting(true);
    const res = await apiFetch(`/api/Products/${id}/Templates`, {
      method: "POST",
      body: JSON.stringify({ templateId: selectedTemplateId, isDefault }),
      headers: { "Content-Type": "application/json" },
    });
    setSubmitting(false);

    if (!res.success) {
      setMessage(res.error.message);
      return;
    }

    setShowLinkModal(false);
    setSelectedTemplateId("");
    setIsDefault(false);
    await load();
  }

  async function handleSetDefault(linkId: string) {
    const res = await apiFetch(`/api/Products/${id}/Templates/${linkId}/set-default`, { method: "POST" });
    if (!res.success) {
      setMessage(res.error.message);
      return;
    }

    await load();
  }

  async function handleUnlink(linkId: string) {
    const res = await apiFetch(`/api/Products/${id}/Templates/${linkId}`, { method: "DELETE" });
    if (!res.success) {
      setMessage(res.error.message);
      return;
    }

    await load();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" /></div>;
  }

  if (!product) {
    return <EmptyState title={text.notFound} description={message || text.notFoundDescription} />;
  }

  return (
    <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow={text.eyebrow}
          title={product.name}
          description={product.description || text.description}
          actions={
            <>
              <Link href="/products" className="plms-button-secondary">{text.back}</Link>
              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                <button className="plms-button-primary" onClick={() => setShowLinkModal(true)}>{text.linkTemplate}</button>
              </RoleGuard>
            </>
          }
        />

        {message ? (
          <div className="rounded-lg border border-warn/20 bg-warn/10 p-4 text-sm font-medium text-warn">{message}</div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">SKU</div>
            <div className="mt-3 font-mono text-2xl font-medium text-ink">{product.sku}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{text.status}</div>
            <div className="mt-3"><StatusBadge label={product.isActive ? "Active" : "Inactive"} tone={product.isActive ? "success" : "danger"} /></div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{text.category}</div>
            <div className="mt-3 text-lg font-medium text-ink">{product.categoryName || text.uncategorized}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{text.vendor}</div>
            <div className="mt-3 text-lg font-medium text-ink">{product.vendorName || text.direct}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-ink-3">{text.linkedTemplates}</div>
                <div className="mt-1 text-sm font-medium text-ink-2">{text.linkedDescription}</div>
              </div>
            </div>

            {links.length === 0 ? (
              <div className="mt-6"><EmptyState title={text.noLinked} description={text.noLinkedDescription} /></div>
            ) : (
              <div className="mt-6">
                <DataTable columns={[text.code, text.template, text.priority, text.actions]}>
                  {links.map((link) => {
                    const template = templates.find((item) => item.id === link.templateId);
                    const versionId = template?.currentActiveVersionId;
                    return (
                      <tr key={link.id} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4"><span className="rounded-xl border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-xs font-medium text-accent">{link.templateCode}</span></td>
                        <td className="px-6 py-4 text-sm font-medium text-ink">{link.templateName}</td>
                        <td className="px-6 py-4">{link.isDefault ? <StatusBadge label={text.default} tone="success" /> : <StatusBadge label={text.secondary} tone="neutral" />}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {versionId ? <Link href={`/templates/${link.templateId}/preview?versionId=${versionId}&productId=${id}`} className="plms-button-secondary">{text.preview}</Link> : null}
                            {!link.isDefault ? (
                              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <button className="plms-button-secondary" onClick={() => handleSetDefault(link.id)}>{text.setDefault}</button>
                              </RoleGuard>
                            ) : null}
                            <Link href={`/templates/${link.templateId}`} className="plms-button-secondary">{text.openTemplate}</Link>
                            <RoleGuard allowedRoles={["Admin"]}>
                              <button className="rounded-lg bg-bad px-4 py-3 text-xs font-medium text-white" onClick={() => handleUnlink(link.id)}>{text.unlink}</button>
                            </RoleGuard>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </DataTable>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{text.recordTimeline}</div>
              <div className="mt-4 space-y-3 text-sm font-medium text-ink-2">
                <div className="flex items-center justify-between"><span>{text.created}</span><span className="text-ink">{formatDateTime(product.createdAt)}</span></div>
                <div className="flex items-center justify-between"><span>{text.updated}</span><span className="text-ink">{formatDateTime(product.updatedAt)}</span></div>
                <div className="flex items-center justify-between"><span>{text.linkedCount}</span><span className="text-ink">{links.length}</span></div>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{text.guidance}</div>
              <ul className="mt-4 space-y-3 text-sm font-medium text-ink-2">
                <li>{text.guidance1}</li>
                <li>{text.guidance2}</li>
                <li>{text.guidance3}</li>
              </ul>
            </div>
          </div>
        </div>

        <SlideOver open={showLinkModal} title={text.modalTitle} subtitle={`${product.sku} · ${product.name}`} onClose={() => setShowLinkModal(false)}>
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-ink-3">{text.modalLabel}</label>
              <select className="plms-input" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                <option value="">{text.selectTemplate}</option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.code} · {template.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-line bg-raised p-4 text-sm font-medium text-ink-2">
              <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
              {text.markDefault}
            </label>
            <button className="plms-button-primary w-full" onClick={handleLink} disabled={!selectedTemplateId || submitting}>{submitting ? text.linking : text.linkTemplate}</button>
          </div>
        </SlideOver>
      </div>
    </RoleGuard>
  );
}
