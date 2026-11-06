"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CaretDown, CaretRight, Star } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RoleGuard } from "@/components/RoleGuard";
import { TemplateCloneModal } from "@/components/Templates/TemplateCloneModal";
import { TemplatePreviewCard } from "@/components/Templates/TemplatePreviewCard";
import { TemplateRowMenu, type RowMenuItem } from "@/components/Templates/TemplateRowMenu";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { hasAnyPermission, hasLegacyRoleAccess, permissions } from "@/lib/permissions";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { ensureEditableVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Portal } from "@/components/ui/Portal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

function getTemplateTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  switch (status) {
    case "Draft":
    case "Rejected":
      return "warning";
    case "InReview":
      return "info";
    case "Approved":
    case "Published":
      return "success";
    case "Deprecated":
    case "Archived":
      return "danger";
    default:
      return "neutral";
  }
}

function canArchiveVersion(template: LabelTemplate, version: TemplateVersion) {
  return !template.isArchived && template.currentActiveVersionId !== version.id && (version.status === "Rejected" || version.status === "Deprecated");
}

function canDeleteVersion(template: LabelTemplate, version: TemplateVersion) {
  return template.currentActiveVersionId !== version.id && version.status === "Draft" && (template.versions?.length ?? 0) > 1;
}

export default function TemplateDetailPage() {
  const { data: session } = useSession();
  const { formatDateTime, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const roles = ((session?.user as any)?.roles || []) as string[];
  const grantedPermissions = ((session?.user as any)?.permissions || []) as string[];
  const canCreate = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.templatesCreate]);
  const canArchive = hasAnyPermission(grantedPermissions, [permissions.templatesArchive]) || roles.includes("Admin");
  const canDelete = hasAnyPermission(grantedPermissions, [permissions.templatesDelete]) || roles.includes("Admin");
  const isAuthor = hasLegacyRoleAccess(roles, grantedPermissions, ["Admin", "Operator"]);
  const isReviewer = hasLegacyRoleAccess(roles, grantedPermissions, ["Admin", "Reviewer"]);

  const [template, setTemplate] = useState<LabelTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ versionId: string; versionNumber: number } | null>(null);
  const [cloneTarget, setCloneTarget] = useState<TemplateVersion | null>(null);
  const [archiveVersionTarget, setArchiveVersionTarget] = useState<TemplateVersion | null>(null);
  const [deleteVersionTarget, setDeleteVersionTarget] = useState<TemplateVersion | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [notice, setNotice] = useState<{ text: string; tone: "good" | "bad" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [snapshotExpanded, setSnapshotExpanded] = useState(false);

  const text = locale === "tr"
    ? {
      descriptionFallback: "Açıklama girilmedi",
      archiveLibrary: "Arşiv",
      compareVersions: "Sürümleri karşılaştır",
      openEditor: "Editörü aç",
      favorite: "Favoriye ekle",
      unfavorite: "Favoriden çıkar",
      favoriteAdded: "Favorilere eklendi",
      favoriteRemoved: "Favorilerden çıkarıldı",
      archivedMessage: "Bu şablon arşivde. Geri yüklenene kadar düzenleme ve yeni taslak oluşturma kapalı.",
      activeVersion: "Yayındaki sürüm",
      drafts: "Taslak",
      inReview: "İncelemede",
      archived: "Arşiv veya geçersiz",
      updatedAt: (date: string) => `Güncellendi ${date}`,
      category: "Kategori",
      versions: "Sürümler",
      versionsDescription: "Her sürüm değiştirilemez bir kayıttır",
      columns: { version: "Sürüm", status: "Durum", created: "Oluşturuldu", notes: "Notlar" },
      noVersions: "Sürüm yok",
      noVersionsDescription: "Bu şablonda henüz sürüm yok.",
      preview: "Önizle",
      print: "Yazdır",
      clone: "Klonla",
      compare: "Karşılaştır",
      edit: "Düzenle",
      submitReview: "İncelemeye gönder",
      createRevision: "Revizyon oluştur",
      review: "İncele",
      publish: "Yayınla",
      archive: "Arşivle",
      delete: "Sil",
      more: "Diğer işlemler",
      editableDraft: "Düzenlenebilir taslak",
      noDraftNotes: "Not girilmedi",
      openDraft: "Taslağı aç",
      compareToPublished: "Yayındakiyle karşılaştır",
      noEditableDraft: "Düzenlenebilir taslak yok",
      createDraft: "Taslak oluştur",
      productionDescription: "Baskıda bu sürüm kullanılır",
      noPublished: "Henüz yayında sürüm yok",
      activeVersionRequired: "Bu işlem için yayında bir sürüm gerekli",
      record: "Kayıt",
      created: "Oluşturuldu",
      updated: "Güncellendi",
      totalVersions: "Toplam sürüm",
      reviewTitle: (version: number) => `v${version} incelemesi`,
      reviewDescription: "Onaylanan sürüm yayınlanmaya hazır olur. Reddedilen sürüm taslağa döner.",
      reviewComment: "Yorum",
      reviewPlaceholder: "İnceleme notu",
      reject: "Reddet",
      approve: "Onayla",
      cancel: "Vazgeç",
      notFound: "Şablon bulunamadı",
      notFoundDescription: "Bu şablon yüklenemedi.",
      failedToPrepareDraft: "Düzenlenebilir taslak hazırlanamadı",
      jsonSnapshot: "Yerleşim verisi",
      jsonSnapshotDescription: "Kaydedilen yerleşimin JSON kaydı",
      expandSnapshot: "Yerleşim verisini göster",
      collapseSnapshot: "Yerleşim verisini gizle",
      publishedSnapshot: "Yayındaki sürüm",
      workingSnapshot: "Çalışma taslağı",
      snapshot: "Son sürüm",
      noLayout: "Yerleşim verisi yok",
      archiveVersionTitle: "Sürümü arşivle",
      archiveVersionDescription: (versionNumber: number) => `v${versionNumber} arşivlenecek ve sürüm listesinden çıkacak.`,
      archiveVersionConfirm: "Sürümü arşivle",
      deleteVersionTitle: "Sürümü sil",
      deleteVersionDescription: (versionNumber: number) => `v${versionNumber} taslağı kalıcı olarak silinecek.`,
      deleteVersionConfirm: "Sürümü sil",
    }
    : {
      descriptionFallback: "No description",
      archiveLibrary: "Archive",
      compareVersions: "Compare versions",
      openEditor: "Open editor",
      favorite: "Add to favorites",
      unfavorite: "Remove from favorites",
      favoriteAdded: "Added to favorites",
      favoriteRemoved: "Removed from favorites",
      archivedMessage: "This template is archived. Editing and new drafts are off until it is restored.",
      activeVersion: "Published version",
      drafts: "Drafts",
      inReview: "In review",
      archived: "Archived or deprecated",
      updatedAt: (date: string) => `Updated ${date}`,
      category: "Category",
      versions: "Versions",
      versionsDescription: "Every version is an immutable record",
      columns: { version: "Version", status: "Status", created: "Created", notes: "Notes" },
      noVersions: "No versions",
      noVersionsDescription: "This template has no versions yet.",
      preview: "Preview",
      print: "Print",
      clone: "Clone",
      compare: "Compare",
      edit: "Edit",
      submitReview: "Submit for review",
      createRevision: "Create revision",
      review: "Review",
      publish: "Publish",
      archive: "Archive",
      delete: "Delete",
      more: "More actions",
      editableDraft: "Editable draft",
      noDraftNotes: "No notes",
      openDraft: "Open draft",
      compareToPublished: "Compare to published",
      noEditableDraft: "No editable draft",
      createDraft: "Create draft",
      productionDescription: "This version is used for printing",
      noPublished: "No published version yet",
      activeVersionRequired: "A published version is required for this",
      record: "Record",
      created: "Created",
      updated: "Updated",
      totalVersions: "Total versions",
      reviewTitle: (version: number) => `Review v${version}`,
      reviewDescription: "An approved version is ready to publish. A rejected version goes back to draft.",
      reviewComment: "Comment",
      reviewPlaceholder: "Review note",
      reject: "Reject",
      approve: "Approve",
      cancel: "Cancel",
      notFound: "Template not found",
      notFoundDescription: "This template could not be loaded.",
      failedToPrepareDraft: "Could not prepare an editable draft",
      jsonSnapshot: "Layout data",
      jsonSnapshotDescription: "The stored layout as JSON",
      expandSnapshot: "Show layout data",
      collapseSnapshot: "Hide layout data",
      publishedSnapshot: "Published version",
      workingSnapshot: "Working draft",
      snapshot: "Latest version",
      noLayout: "No layout data",
      archiveVersionTitle: "Archive version",
      archiveVersionDescription: (versionNumber: number) => `v${versionNumber} will be archived and leave the version list.`,
      archiveVersionConfirm: "Archive version",
      deleteVersionTitle: "Delete version",
      deleteVersionDescription: (versionNumber: number) => `Draft v${versionNumber} will be permanently deleted.`,
      deleteVersionConfirm: "Delete version",
    };

  const setMessage = (value: string | null, tone: "good" | "bad" = "bad") => setNotice(value ? { text: value, tone } : null);

  async function load() {
    setLoading(true);
    const res = await apiFetch<LabelTemplate>(`/api/Templates/${id}`);
    if (res.success) {
      setTemplate(normalizeLabelTemplate(res.data));
      setMessage(null);
    } else {
      setMessage(res.error.message);
      setTemplate(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  const activeVersion = template?.currentActiveVersion || null;
  const editableDraft = useMemo(() => {
    const versions = template?.versions || [];
    return versions
      .filter((version) => version.status === "Draft")
      .sort((left, right) => right.versionNumber - left.versionNumber)[0] || null;
  }, [template]);
  const snapshotVersion = activeVersion || editableDraft || template?.versions?.[0] || null;
  const snapshotTitle = activeVersion ? text.publishedSnapshot : editableDraft ? text.workingSnapshot : text.snapshot;
  const formattedSnapshotJson = useMemo(() => {
    if (!snapshotVersion?.layoutJson) {
      return text.noLayout;
    }

    try {
      return JSON.stringify(JSON.parse(snapshotVersion.layoutJson), null, 2);
    } catch {
      return snapshotVersion.layoutJson;
    }
  }, [snapshotVersion?.layoutJson, text.noLayout]);

  const metrics = useMemo(() => {
    const versions = template?.versions || [];
    return {
      total: versions.length,
      drafts: versions.filter((version) => version.status === "Draft").length,
      inReview: versions.filter((version) => version.status === "InReview").length,
      archived: versions.filter((version) => version.status === "Archived" || version.status === "Deprecated").length,
    };
  }, [template]);

  async function handleEdit(sourceVersion?: TemplateVersion) {
    if (!template || template.isArchived) return;

    try {
      setBusy(true);
      const draft = await ensureEditableVersion(template, sourceVersion);
      router.push(`/templates/${template.id}/edit?versionId=${draft.id}`);
    } catch (error) {
      setMessage((error as Error).message || text.failedToPrepareDraft);
    } finally {
      setBusy(false);
    }
  }

  async function handleWorkflowAction(versionId: string, action: "request-approval" | "publish" | "review", payload?: Record<string, unknown>) {
    if (!template) return;

    let endpoint = "";
    if (action === "request-approval") endpoint = `/api/Templates/${template.id}/versions/${versionId}/request-approval`;
    if (action === "publish") endpoint = `/api/Templates/${template.id}/versions/${versionId}/publish`;
    if (action === "review") endpoint = `/api/Templates/${template.id}/versions/${versionId}/review`;

    setBusy(true);
    const res = await apiFetch(endpoint, {
      method: "POST",
      body: payload ? JSON.stringify(payload) : undefined,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
    });
    setBusy(false);

    if (!res.success) {
      setMessage(res.error.message);
      return;
    }

    setReviewModal(null);
    setReviewComments("");
    await load();
  }

  function handlePrint(version: TemplateVersion | null | undefined) {
    if (!template || !version) {
      setMessage(text.activeVersionRequired);
      return;
    }

    // Printing goes through the preview page: pick a product, check readiness, open a print request.
    router.push(`/templates/${template.id}/preview?versionId=${version.id}`);
  }

  async function handleToggleFavorite() {
    if (!template) return;

    const nextFavoriteState = !template.isFavorite;
    setTemplate({ ...template, isFavorite: nextFavoriteState });

    const res = await apiFetch(`/api/Templates/${template.id}/favorite`, {
      method: nextFavoriteState ? "POST" : "DELETE",
    });

    if (!res.success) {
      setTemplate({ ...template, isFavorite: !nextFavoriteState });
      setMessage(res.error.message);
      return;
    }

    setMessage(nextFavoriteState ? text.favoriteAdded : text.favoriteRemoved, "good");
  }

  async function handleArchiveVersion() {
    if (!template || !archiveVersionTarget) return;

    setBusy(true);
    const res = await apiFetch(`/api/Templates/${template.id}/versions/${archiveVersionTarget.id}/archive`, {
      method: "POST",
    });
    setBusy(false);

    if (!res.success) {
      setMessage(res.error.message);
      return;
    }

    setArchiveVersionTarget(null);
    await load();
  }

  async function handleDeleteVersion() {
    if (!template || !deleteVersionTarget) return;

    setBusy(true);
    const res = await apiFetch(`/api/Templates/${template.id}/versions/${deleteVersionTarget.id}`, {
      method: "DELETE",
    });
    setBusy(false);

    if (!res.success) {
      setMessage(res.error.message);
      return;
    }

    setDeleteVersionTarget(null);
    await load();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>;
  }

  if (!template) {
    return <EmptyState title={text.notFound} description={notice?.text || text.notFoundDescription} />;
  }

  const locked = busy || Boolean(template.isArchived);

  /** The one workflow step that moves a version forward, shown as a button in its row. */
  function primaryVersionAction(version: TemplateVersion): { label: string; onClick: () => void; disabled: boolean } | null {
    if (!template) return null;
    if ((version.status === "Draft" || version.status === "Rejected") && isAuthor) {
      return { label: text.submitReview, onClick: () => void handleWorkflowAction(version.id, "request-approval"), disabled: locked };
    }
    if (version.status === "InReview" && isReviewer) {
      return { label: text.review, onClick: () => setReviewModal({ versionId: version.id, versionNumber: version.versionNumber }), disabled: Boolean(template.isArchived) };
    }
    if (version.status === "Approved" && isReviewer) {
      return { label: text.publish, onClick: () => void handleWorkflowAction(version.id, "publish"), disabled: locked };
    }
    return null;
  }

  function versionMenuItems(version: TemplateVersion): RowMenuItem[] {
    if (!template) return [];
    const items: RowMenuItem[] = [
      { label: text.preview, href: `/templates/${template.id}/preview?versionId=${version.id}` },
      { label: text.print, onSelect: () => handlePrint(version) },
    ];
    if (isAuthor && (version.status === "Draft" || version.status === "Rejected")) {
      items.push({ label: text.edit, onSelect: () => void handleEdit(version), disabled: locked });
    }
    if (isAuthor && ["Rejected", "Approved", "Published", "Deprecated", "Archived"].includes(version.status)) {
      items.push({ label: text.createRevision, onSelect: () => void handleEdit(version), disabled: locked });
    }
    if (snapshotVersion && snapshotVersion.id !== version.id) {
      items.push({ label: text.compare, href: `/templates/${template.id}/compare?leftVersionId=${version.id}&rightVersionId=${snapshotVersion.id}` });
    }
    if (canCreate) items.push({ label: text.clone, onSelect: () => setCloneTarget(version) });
    const archivable = canArchive && canArchiveVersion(template, version);
    if (archivable) items.push({ label: text.archive, onSelect: () => setArchiveVersionTarget(version), disabled: busy, separated: true });
    if (canDelete && canDeleteVersion(template, version)) {
      items.push({ label: text.delete, onSelect: () => setDeleteVersionTarget(version), disabled: busy, tone: "danger", separated: !archivable });
    }
    return items;
  }

  return (
    <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <PageHeader
            title={template.name}
            description={template.description || text.descriptionFallback}
            actions={
              <>
                <button
                  type="button"
                  className={`plms-button-secondary w-9 px-0 ${template.isFavorite ? "text-accent" : "text-ink-2"}`}
                  onClick={handleToggleFavorite}
                  aria-pressed={Boolean(template.isFavorite)}
                  title={template.isFavorite ? text.unfavorite : text.favorite}
                  aria-label={template.isFavorite ? text.unfavorite : text.favorite}
                >
                  <Star size={16} weight={template.isFavorite ? "fill" : "regular"} />
                </button>
                <Link href="/templates/archived" className="plms-button-ghost">{text.archiveLibrary}</Link>
                <Link href={`/templates/${template.id}/compare`} className="plms-button-secondary">{text.compareVersions}</Link>
                <RoleGuard allowedRoles={["Admin", "Operator"]}>
                  <button className="plms-button-primary" onClick={() => handleEdit()} disabled={locked}>{text.openEditor}</button>
                </RoleGuard>
              </>
            }
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
            <span className="whitespace-nowrap font-mono text-ink-2">{template.code}</span>
            <StatusBadge label={template.isActive ? "Active" : "Inactive"} tone={template.isActive ? "success" : "danger"} />
            {template.templateCategoryName ? <span>{template.templateCategoryName}</span> : null}
            <span className="tabular">{text.updatedAt(formatDateTime(template.updatedAt))}</span>
          </div>
        </div>

        {notice ? (
          <div role="status" className={`rounded-lg px-3 py-2 text-sm ${notice.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{notice.text}</div>
        ) : null}
        {template.isArchived ? (
          <div className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{text.archivedMessage}</div>
        ) : null}

        <dl className="grid grid-cols-2 divide-line rounded-xl border border-line bg-surface sm:grid-cols-4 sm:divide-x">
          <Stat label={text.activeVersion}>
            <span className="flex items-center gap-3">
              <span>{template.currentActiveVersion ? `v${template.currentActiveVersion.versionNumber}` : "-"}</span>
              {template.currentActiveVersion ? <StatusBadge label={template.currentActiveVersion.status} tone={getTemplateTone(template.currentActiveVersion.status)} /> : null}
            </span>
          </Stat>
          <Stat label={text.drafts}>{metrics.drafts}</Stat>
          <Stat label={text.inReview}>{metrics.inReview}</Stat>
          <Stat label={text.archived}>{metrics.archived}</Stat>
        </dl>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className="overflow-hidden rounded-xl border border-line bg-surface">
              <header className="flex flex-col gap-0.5 border-b border-line px-5 py-4">
                <h2 className="text-md font-medium text-ink">{text.versions}</h2>
                <p className="text-sm text-ink-3">{text.versionsDescription}</p>
              </header>

              {(template.versions || []).length === 0 ? (
                <div className="p-5"><EmptyState title={text.noVersions} description={text.noVersionsDescription} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-ink-3">
                        <th className="h-10 whitespace-nowrap pl-5 pr-4 font-medium">{text.columns.version}</th>
                        <th className="h-10 whitespace-nowrap px-4 font-medium">{text.columns.status}</th>
                        <th className="h-10 whitespace-nowrap px-4 font-medium">{text.columns.created}</th>
                        <th className="h-10 whitespace-nowrap px-4 font-medium">{text.columns.notes}</th>
                        <th className="h-10 pl-2 pr-4"><span className="sr-only">{text.more}</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line border-t border-line">
                      {(template.versions || []).map((version) => {
                        const action = primaryVersionAction(version);
                        return (
                          <tr key={version.id} className="transition-colors hover:bg-raised">
                            <td className="tabular whitespace-nowrap py-2.5 pl-5 pr-4 font-mono text-sm text-ink">v{version.versionNumber}</td>
                            <td className="whitespace-nowrap px-4 py-2.5"><StatusBadge label={version.status} tone={getTemplateTone(version.status)} /></td>
                            <td className="whitespace-nowrap px-4 py-2.5">
                              <div className="tabular font-mono text-sm text-ink-2">{formatDateTime(version.createdAt)}</div>
                              <div className="text-sm text-ink-3">{version.createdBy}</div>
                            </td>
                            <td className="max-w-64 px-4 py-2.5 text-base text-ink-2">
                              <span className="line-clamp-2" title={version.changeNotes || undefined}>{version.changeNotes || <span className="text-ink-3">-</span>}</span>
                            </td>
                            <td className="w-px whitespace-nowrap py-2.5 pl-2 pr-4">
                              <div className="flex items-center justify-end gap-1">
                                {action ? (
                                  <button type="button" className="plms-button-compact" onClick={action.onClick} disabled={action.disabled}>{action.label}</button>
                                ) : (
                                  <Link href={`/templates/${template.id}/preview?versionId=${version.id}`} className="plms-button-compact">{text.preview}</Link>
                                )}
                                <TemplateRowMenu label={text.more} items={versionMenuItems(version)} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-line bg-surface">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left transition-colors hover:bg-raised"
                onClick={() => setSnapshotExpanded((current) => !current)}
                aria-expanded={snapshotExpanded}
                aria-label={snapshotExpanded ? text.collapseSnapshot : text.expandSnapshot}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-md font-medium text-ink">{text.jsonSnapshot}</span>
                  <span className="text-sm text-ink-3">{text.jsonSnapshotDescription}</span>
                </div>
                <span className="flex items-center gap-3 text-sm text-ink-3">
                  <span className="hidden sm:inline">{snapshotTitle}</span>
                  {snapshotVersion ? <span className="tabular font-mono">v{snapshotVersion.versionNumber}</span> : null}
                  {snapshotExpanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
                </span>
              </button>
              {snapshotExpanded ? (
                <pre className="max-h-96 overflow-auto whitespace-pre border-t border-line bg-raised px-5 py-4 font-mono text-xs leading-5 text-ink-2">{formattedSnapshotJson}</pre>
              ) : null}
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-md font-medium text-ink">{text.activeVersion}</h2>
                  <p className="text-sm text-ink-3">{activeVersion ? text.productionDescription : text.noPublished}</p>
                </div>
              </div>
              {snapshotVersion ? <TemplatePreviewCard template={template} version={activeVersion || snapshotVersion} /> : null}
              {activeVersion ? (
                <div className="flex flex-wrap gap-2">
                  <button className="plms-button-secondary" onClick={() => handlePrint(activeVersion)}>{text.print}</button>
                  <Link href={`/templates/${template.id}/preview?versionId=${activeVersion.id}`} className="plms-button-ghost">{text.preview}</Link>
                </div>
              ) : null}
            </section>

            <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-md font-medium text-ink">{text.editableDraft}</h2>
                {editableDraft ? (
                  <span className="flex items-center gap-3">
                    <StatusBadge label={editableDraft.status} tone={getTemplateTone(editableDraft.status)} />
                    <span className="tabular font-mono text-sm text-ink-2">v{editableDraft.versionNumber}</span>
                  </span>
                ) : null}
              </div>
              {editableDraft ? (
                <>
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-ink-2">{editableDraft.changeNotes || text.noDraftNotes}</span>
                    <span className="text-ink-3">
                      {editableDraft.createdBy} · <span className="tabular font-mono">{formatDateTime(editableDraft.createdAt)}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <RoleGuard allowedRoles={["Admin", "Operator"]}>
                      <button className="plms-button-secondary" onClick={() => handleEdit(editableDraft)} disabled={locked}>{text.openDraft}</button>
                    </RoleGuard>
                    <Link href={`/templates/${template.id}/preview?versionId=${editableDraft.id}`} className="plms-button-ghost">{text.preview}</Link>
                    {activeVersion ? <Link href={`/templates/${template.id}/compare?leftVersionId=${editableDraft.id}&rightVersionId=${activeVersion.id}`} className="plms-button-ghost" title={text.compareToPublished}>{text.compare}</Link> : null}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-3">{text.noEditableDraft}</p>
                  <RoleGuard allowedRoles={["Admin", "Operator"]}>
                    <button className="plms-button-secondary self-start" onClick={() => handleEdit()} disabled={locked}>{text.createDraft}</button>
                  </RoleGuard>
                </>
              )}
            </section>

            <section className="rounded-xl border border-line bg-surface px-5 py-4">
              <h2 className="text-md font-medium text-ink">{text.record}</h2>
              <dl className="mt-2 divide-y divide-line text-sm">
                <RecordRow label={text.created}>{formatDateTime(template.createdAt)}</RecordRow>
                <RecordRow label={text.updated}>{formatDateTime(template.updatedAt)}</RecordRow>
                <RecordRow label={text.totalVersions}>{metrics.total}</RecordRow>
              </dl>
            </section>
          </aside>
        </div>

        <TemplateCloneModal
          open={cloneTarget !== null}
          sourceTemplate={template}
          sourceVersion={cloneTarget}
          onClose={() => setCloneTarget(null)}
          onCloned={(templateId) => router.push(`/templates/${templateId}`)}
        />

        {reviewModal ? (
          <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
              <div role="dialog" aria-modal="true" aria-labelledby="review-modal-title" className="flex w-full max-w-lg flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-pop">
                <div className="flex flex-col gap-1.5">
                  <h2 id="review-modal-title" className="text-md font-medium text-ink">{text.reviewTitle(reviewModal.versionNumber)}</h2>
                  <p className="text-sm text-ink-2">{text.reviewDescription}</p>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="plms-label">{text.reviewComment}</span>
                  <textarea
                    className="plms-input min-h-32"
                    placeholder={text.reviewPlaceholder}
                    value={reviewComments}
                    onChange={(event) => setReviewComments(event.target.value)}
                    autoFocus
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button type="button" className="plms-button-ghost" onClick={() => setReviewModal(null)}>{text.cancel}</button>
                  <button type="button" className="plms-button-danger" onClick={() => handleWorkflowAction(reviewModal.versionId, "review", { approve: false, comments: reviewComments })} disabled={busy}>{text.reject}</button>
                  <button type="button" className="plms-button-primary" onClick={() => handleWorkflowAction(reviewModal.versionId, "review", { approve: true, comments: reviewComments })} disabled={busy}>{text.approve}</button>
                </div>
              </div>
            </div>
          </Portal>
        ) : null}

        <ConfirmModal
          open={archiveVersionTarget !== null}
          title={text.archiveVersionTitle}
          description={text.archiveVersionDescription(archiveVersionTarget?.versionNumber || 0)}
          confirmLabel={text.archiveVersionConfirm}
          tone="primary"
          onCancel={() => setArchiveVersionTarget(null)}
          onConfirm={() => void handleArchiveVersion()}
          loading={busy}
        />

        <ConfirmModal
          open={deleteVersionTarget !== null}
          title={text.deleteVersionTitle}
          description={text.deleteVersionDescription(deleteVersionTarget?.versionNumber || 0)}
          confirmLabel={text.deleteVersionConfirm}
          onCancel={() => setDeleteVersionTarget(null)}
          onConfirm={() => void handleDeleteVersion()}
          loading={busy}
        />
      </div>
    </RoleGuard>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="tabular text-lg font-medium text-ink">{children}</dd>
    </div>
  );
}

function RecordRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-ink-2">{label}</dt>
      <dd className="tabular font-mono text-ink">{children}</dd>
    </div>
  );
}
