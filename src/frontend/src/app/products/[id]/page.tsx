"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretRight, DotsThree, LinkSimple } from "@phosphor-icons/react";
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
import { Portal } from "@/components/ui/Portal";

export default function ProductDetailPage() {
  const { formatDateTime, locale } = useI18n();
  const params = useParams();
  const id = String(params.id);
  const text = locale === "tr"
    ? {
      parent: "Ürünler",
      back: "Ürünlere dön",
      linkTemplate: "Şablon bağla",
      notFound: "Ürün bulunamadı",
      notFoundDescription: "Bu ürün kaydı yüklenemedi.",
      sku: "SKU",
      status: "Durum",
      category: "Kategori",
      vendor: "Tedarikçi",
      uncategorized: "Kategorisiz",
      direct: "Doğrudan",
      linkedTemplates: "Bağlı şablonlar",
      linkedDescription: "Bu üründen önizleme ve baskı talebi oluştururken kullanılabilecek şablonlar",
      noLinked: "Bağlı şablon yok",
      noLinkedDescription: "Önizleme veya baskı talebi için en az bir şablon bağlayın.",
      code: "Kod",
      template: "Şablon",
      priority: "Öncelik",
      default: "Varsayılan",
      secondary: "İkincil",
      preview: "Önizle",
      more: "Diğer işlemler",
      setDefault: "Varsayılan yap",
      openTemplate: "Şablonu aç",
      unlink: "Bağlantıyı kaldır",
      created: "Oluşturuldu",
      updated: "Güncellendi",
      guidance: "Nasıl çalışır",
      guidance1: "Önizleme ve baskı talebinde yalnızca bağlı şablonlar kullanılabilir.",
      guidance2: "Varsayılan şablon operatörlere ilk seçenek olarak önerilir.",
      guidance3: "Yayındaki sürümler değişmez; düzenleme yeni bir taslak oluşturur.",
      modalTitle: "Şablon bağla",
      modalLabel: "Şablon",
      selectTemplate: "Şablon seçin",
      markDefault: "Bu ürün için varsayılan şablon yap",
      linking: "Bağlanıyor",
    }
    : {
      parent: "Products",
      back: "Back to products",
      linkTemplate: "Link template",
      notFound: "Product not found",
      notFoundDescription: "This product record could not be loaded.",
      sku: "SKU",
      status: "Status",
      category: "Category",
      vendor: "Vendor",
      uncategorized: "Uncategorized",
      direct: "Direct",
      linkedTemplates: "Linked templates",
      linkedDescription: "Templates you can use for previews and print requests of this product",
      noLinked: "No templates linked",
      noLinkedDescription: "Link at least one template to preview or print this product.",
      code: "Code",
      template: "Template",
      priority: "Priority",
      default: "Default",
      secondary: "Secondary",
      preview: "Preview",
      more: "More actions",
      setDefault: "Make default",
      openTemplate: "Open template",
      unlink: "Unlink",
      created: "Created",
      updated: "Updated",
      guidance: "How it works",
      guidance1: "Only linked templates can be used for previews and print requests.",
      guidance2: "The default template is suggested to operators first.",
      guidance3: "Published versions never change; editing creates a new draft.",
      modalTitle: "Link template",
      modalLabel: "Template",
      selectTemplate: "Select a template",
      markDefault: "Make this the default template for the product",
      linking: "Linking",
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
    return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>;
  }

  if (!product) {
    return <EmptyState title={text.notFound} description={message || text.notFoundDescription} />;
  }

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: text.sku, value: <span className="whitespace-nowrap font-mono text-sm text-ink">{product.sku}</span> },
    { label: text.status, value: <StatusBadge label={product.isActive ? "Active" : "Inactive"} tone={product.isActive ? "success" : "danger"} /> },
    { label: text.category, value: product.categoryName || text.uncategorized },
    { label: text.vendor, value: product.vendorName || text.direct },
    { label: text.created, value: <span className="tabular font-mono text-sm">{formatDateTime(product.createdAt)}</span> },
    { label: text.updated, value: <span className="tabular font-mono text-sm">{formatDateTime(product.updatedAt)}</span> },
  ];

  return (
    <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
      <div className="space-y-6">
        <nav className="flex items-center gap-1.5 text-sm text-ink-3">
          <Link href="/products" className="transition-colors hover:text-ink">{text.parent}</Link>
          <CaretRight size={12} aria-hidden />
          <span className="whitespace-nowrap font-mono text-ink-2">{product.sku}</span>
        </nav>

        <PageHeader
          title={product.name}
          description={product.description && product.description !== product.name ? product.description : undefined}
          actions={
            <RoleGuard allowedRoles={["Admin", "Operator"]}>
              <button className="plms-button-primary" onClick={() => setShowLinkModal(true)}>
                <LinkSimple size={16} aria-hidden />
                {text.linkTemplate}
              </button>
            </RoleGuard>
          }
        />

        {message ? (
          <div className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{message}</div>
        ) : null}

        <dl className="plms-card grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 md:grid-cols-3 xl:grid-cols-6">
          {facts.map((fact) => (
            <div key={fact.label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-sm text-ink-3">{fact.label}</dt>
              <dd className="truncate text-base text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-md font-medium text-ink">{text.linkedTemplates}</h2>
                <p className="text-sm text-ink-3">{text.linkedDescription}</p>
              </div>
              <span className="tabular font-mono text-sm text-ink-3">{links.length}</span>
            </div>

            {links.length === 0 ? (
              <EmptyState title={text.noLinked} description={text.noLinkedDescription} />
            ) : (
              <DataTable columns={[text.code, text.template, text.priority, ""]}>
                {links.map((link) => {
                  const template = templates.find((item) => item.id === link.templateId);
                  const versionId = template?.currentActiveVersionId;
                  return (
                    <tr key={link.id} className="transition-colors hover:bg-raised">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sm text-ink-2">{link.templateCode}</td>
                      <td className="px-4 py-2.5 text-base">
                        <Link href={`/templates/${link.templateId}`} className="text-ink transition-colors hover:text-accent">{link.templateName}</Link>
                      </td>
                      <td className="px-4 py-2.5">{link.isDefault ? <StatusBadge label={text.default} tone="success" /> : <StatusBadge label={text.secondary} tone="neutral" />}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {versionId ? <Link href={`/templates/${link.templateId}/preview?versionId=${versionId}&productId=${id}`} className="plms-button-compact">{text.preview}</Link> : null}
                          <RowMenu label={text.more}>
                            {!link.isDefault ? (
                              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <MenuButton onClick={() => handleSetDefault(link.id)}>{text.setDefault}</MenuButton>
                              </RoleGuard>
                            ) : null}
                            <Link href={`/templates/${link.templateId}`} className={menuItemClass}>{text.openTemplate}</Link>
                            <RoleGuard allowedRoles={["Admin"]}>
                              <MenuButton danger onClick={() => handleUnlink(link.id)}>{text.unlink}</MenuButton>
                            </RoleGuard>
                          </RowMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </DataTable>
            )}
          </section>

          <aside className="plms-card p-5">
            <h2 className="text-base font-medium text-ink">{text.guidance}</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-2">
              <li>{text.guidance1}</li>
              <li>{text.guidance2}</li>
              <li>{text.guidance3}</li>
            </ul>
          </aside>
        </div>

        <SlideOver open={showLinkModal} title={text.modalTitle} subtitle={`${product.sku} · ${product.name}`} onClose={() => setShowLinkModal(false)}>
          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="link-template" className="plms-label">{text.modalLabel}</label>
              <select id="link-template" className="plms-select w-full" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                <option value="">{text.selectTemplate}</option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.code} · {template.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 text-sm text-ink-2">
              <input type="checkbox" className="h-4 w-4 accent-accent" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
              {text.markDefault}
            </label>
            <button className="plms-button-primary w-full" onClick={handleLink} disabled={!selectedTemplateId || submitting}>{submitting ? text.linking : text.linkTemplate}</button>
          </div>
        </SlideOver>
      </div>
    </RoleGuard>
  );
}

const menuItemClass = "flex h-8 w-full items-center whitespace-nowrap rounded-md px-2.5 text-left text-sm text-ink transition-colors hover:bg-raised";

function MenuButton({ children, onClick, danger = false, disabled = false }: { children: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} disabled={disabled} className={`${menuItemClass} disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "text-bad hover:bg-bad-soft" : ""}`}>
      {children}
    </button>
  );
}

/** Overflow menu for secondary row actions. Rendered in a portal so table overflow never clips it; closes on outside click, Escape or after a choice. */
function RowMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = position !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

  return (
    <>
      <button ref={buttonRef} type="button" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle} className="plms-button-compact w-8 px-0">
        <DotsThree size={16} aria-hidden />
      </button>
      {position ? (
        <Portal>
          <div
            ref={menuRef}
            role="menu"
            onClick={() => setPosition(null)}
            style={{ top: position.top, right: position.right }}
            className="fixed z-50 flex min-w-44 flex-col rounded-lg border border-line bg-surface p-1 shadow-pop"
          >
            {children}
          </div>
        </Portal>
      ) : null}
    </>
  );
}
