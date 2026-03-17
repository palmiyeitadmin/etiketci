"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { Product } from "@/types/product";
import { ProductTemplateDto } from "@/types/operational";
import { LabelTemplate } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SlideOver } from "@/components/ui/SlideOver";

export default function ProductDetailPage() {
  const params = useParams();
  const id = String(params.id);

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
    return <EmptyState title="Product not found" description={message || "The requested product record could not be loaded."} />;
  }

  return (
    <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Product context"
          title={product.name}
          description={product.description || "Product master data and linked label templates."}
          actions={
            <>
              <Link href="/products" className="plms-button-secondary">Back to Products</Link>
              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                <button className="plms-button-primary" onClick={() => setShowLinkModal(true)}>Link Template</button>
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
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Status</div>
            <div className="mt-3"><StatusBadge label={product.isActive ? "Active" : "Inactive"} tone={product.isActive ? "success" : "danger"} /></div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Category</div>
            <div className="mt-3 text-lg font-black tracking-[-0.04em] text-white">{product.categoryName || "Uncategorized"}</div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Vendor</div>
            <div className="mt-3 text-lg font-black tracking-[-0.04em] text-white">{product.vendorName || "Direct"}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Linked Templates</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--plms-text-muted)]">Templates available for proof generation and print intent creation from this product.</div>
              </div>
            </div>

            {links.length === 0 ? (
              <div className="mt-6"><EmptyState title="No templates linked" description="Link at least one template to generate product-context previews or print intents." /></div>
            ) : (
              <div className="mt-6">
                <DataTable columns={["Code", "Template", "Priority", "Actions"]}>
                  {links.map((link) => {
                    const template = templates.find((item) => item.id === link.templateId);
                    const versionId = template?.currentActiveVersionId;
                    return (
                      <tr key={link.id} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4"><span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{link.templateCode}</span></td>
                        <td className="px-6 py-4 text-sm font-bold text-white">{link.templateName}</td>
                        <td className="px-6 py-4">{link.isDefault ? <StatusBadge label="Default" tone="success" /> : <StatusBadge label="Secondary" tone="neutral" />}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {versionId ? <Link href={`/templates/${link.templateId}/preview?versionId=${versionId}&productId=${id}`} className="plms-button-secondary">Preview</Link> : null}
                            {!link.isDefault ? (
                              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <button className="plms-button-secondary" onClick={() => handleSetDefault(link.id)}>Set Default</button>
                              </RoleGuard>
                            ) : null}
                            <Link href={`/templates/${link.templateId}`} className="plms-button-secondary">Open Template</Link>
                            <RoleGuard allowedRoles={["Admin"]}>
                              <button className="rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => handleUnlink(link.id)}>Unlink</button>
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
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Record Timeline</div>
              <div className="mt-4 space-y-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
                <div className="flex items-center justify-between"><span>Created</span><span className="text-white">{new Date(product.createdAt).toLocaleString()}</span></div>
                <div className="flex items-center justify-between"><span>Updated</span><span className="text-white">{new Date(product.updatedAt).toLocaleString()}</span></div>
                <div className="flex items-center justify-between"><span>Linked Templates</span><span className="text-white">{links.length}</span></div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Operational Guidance</div>
              <ul className="mt-4 space-y-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
                <li>Only linked templates can be used with product-context preview and print intent creation.</li>
                <li>The default template is the recommended entry point for operators.</li>
                <li>Published template versions remain immutable; edits create a new draft revision.</li>
              </ul>
            </div>
          </div>
        </div>

        <SlideOver open={showLinkModal} title="Link Template" subtitle={`${product.sku} · ${product.name}`} onClose={() => setShowLinkModal(false)}>
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Template</label>
              <select className="plms-input" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                <option value="">Select template</option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.code} · {template.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4 text-sm font-medium text-[color:var(--plms-text-muted)]">
              <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
              Mark as default template for this product
            </label>
            <button className="plms-button-primary w-full" onClick={handleLink} disabled={!selectedTemplateId || submitting}>{submitting ? "Linking..." : "Link Template"}</button>
          </div>
        </SlideOver>
      </div>
    </RoleGuard>
  );
}
