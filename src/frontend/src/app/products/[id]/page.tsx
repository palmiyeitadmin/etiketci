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
      eyebrow: "Urun baglami",
      description: "Urun ana verisi ve bagli etiket sablonlari.",
      back: "Urunlere Don",
      linkTemplate: "Sablon Bagla",
      notFound: "Urun bulunamadi",
      notFoundDescription: "Istenen urun kaydi yuklenemedi.",
      status: "Durum",
      category: "Kategori",
      vendor: "Tedarikci",
      uncategorized: "Kategorisiz",
      direct: "Dogrudan",
      linkedTemplates: "Bagli Sablonlar",
      linkedDescription: "Bu urunden prova ve baski niyeti olusturmak icin kullanilabilecek sablonlar.",
      noLinked: "Bagli sablon yok",
      noLinkedDescription: "Urun baglamli onizleme veya baski niyeti icin en az bir sablon baglayin.",
      code: "Kod",
      template: "Sablon",
      priority: "Oncelik",
      actions: "Islemler",
      default: "Varsayilan",
      secondary: "Ikincil",
      preview: "Onizleme",
      setDefault: "Varsayilan Yap",
      openTemplate: "Sablonu Ac",
      unlink: "Baglantiyi Kaldir",
      recordTimeline: "Kayit Zaman Cizelgesi",
      created: "Olusturuldu",
      updated: "Guncellendi",
      linkedCount: "Bagli Sablonlar",
      guidance: "Operasyon Rehberi",
      guidance1: "Yalnizca bagli sablonlar urun baglamli onizleme ve baski niyeti olusturmada kullanilabilir.",
      guidance2: "Varsayilan sablon operatorler icin onerilen giris noktasi olur.",
      guidance3: "Yayindaki sablon surumleri degistirilemez; duzenleme yeni bir taslak revizyon olusturur.",
      modalTitle: "Sablon Bagla",
      modalLabel: "Sablon",
      selectTemplate: "Sablon secin",
      markDefault: "Bu urun icin varsayilan sablon olarak isaretle",
      linking: "Baglaniyor...",
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
    return <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>;
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
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">{message}</div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">SKU</div>
            <div className="mt-3 font-mono text-2xl font-black tracking-[-0.05em] text-white">{product.sku}</div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.status}</div>
            <div className="mt-3"><StatusBadge label={product.isActive ? "Active" : "Inactive"} tone={product.isActive ? "success" : "danger"} /></div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.category}</div>
            <div className="mt-3 text-lg font-black tracking-[-0.04em] text-white">{product.categoryName || text.uncategorized}</div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.vendor}</div>
            <div className="mt-3 text-lg font-black tracking-[-0.04em] text-white">{product.vendorName || text.direct}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.linkedTemplates}</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--plms-text-muted)]">{text.linkedDescription}</div>
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
                        <td className="px-6 py-4"><span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{link.templateCode}</span></td>
                        <td className="px-6 py-4 text-sm font-bold text-white">{link.templateName}</td>
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
                              <button className="rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => handleUnlink(link.id)}>{text.unlink}</button>
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
            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.recordTimeline}</div>
              <div className="mt-4 space-y-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
                <div className="flex items-center justify-between"><span>{text.created}</span><span className="text-white">{formatDateTime(product.createdAt)}</span></div>
                <div className="flex items-center justify-between"><span>{text.updated}</span><span className="text-white">{formatDateTime(product.updatedAt)}</span></div>
                <div className="flex items-center justify-between"><span>{text.linkedCount}</span><span className="text-white">{links.length}</span></div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.guidance}</div>
              <ul className="mt-4 space-y-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
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
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{text.modalLabel}</label>
              <select className="plms-input" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                <option value="">{text.selectTemplate}</option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.code} · {template.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4 text-sm font-medium text-[color:var(--plms-text-muted)]">
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
