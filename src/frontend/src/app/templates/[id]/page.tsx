"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretDown, CaretRight, Star } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RoleGuard } from "@/components/RoleGuard";
import { TemplateCloneModal } from "@/components/Templates/TemplateCloneModal";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { hasAnyPermission, permissions } from "@/lib/permissions";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { ensureEditableVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
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

function getActionButtonClass(tone: "neutral" | "info" | "warning" | "danger" | "primary" | "success" = "neutral") {
  switch (tone) {
    case "info":
      return "inline-flex items-center justify-center rounded-lg border border-accent/25 bg-accent/10 px-4 py-3 text-xs font-medium text-accent transition-colors hover:bg-accent/20";
    case "warning":
      return "inline-flex items-center justify-center rounded-lg border border-warn/25 bg-warn/10 px-4 py-3 text-xs font-medium text-warn transition-colors hover:bg-warn/20";
    case "danger":
      return "inline-flex items-center justify-center rounded-lg border border-bad/20 bg-bad/10 px-4 py-3 text-xs font-medium text-bad transition-colors hover:bg-bad/20";
    case "primary":
      return "inline-flex items-center justify-center rounded-lg bg-accent px-4 py-3 text-xs font-medium text-white transition-colors hover:bg-accent-hover";
    case "success":
      return "inline-flex items-center justify-center rounded-lg border border-good/25 bg-good/10 px-4 py-3 text-xs font-medium text-good transition-colors hover:bg-good/20";
    default:
      return "inline-flex items-center justify-center rounded-lg border border-line bg-raised px-4 py-3 text-xs font-medium text-ink-2 transition-colors hover:bg-raised hover:text-ink";
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
  const { formatDateTime, t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const roles = ((session?.user as any)?.roles || []) as string[];
  const grantedPermissions = ((session?.user as any)?.permissions || []) as string[];
  const canCreate = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.templatesCreate]);
  const favoriteButtonClass = "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-raised text-ink-2 transition-colors hover:bg-raised";

  const [template, setTemplate] = useState<LabelTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ versionId: string; versionNumber: number } | null>(null);
  const [cloneTarget, setCloneTarget] = useState<TemplateVersion | null>(null);
  const [archiveVersionTarget, setArchiveVersionTarget] = useState<TemplateVersion | null>(null);
  const [deleteVersionTarget, setDeleteVersionTarget] = useState<TemplateVersion | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [snapshotExpanded, setSnapshotExpanded] = useState(false);
  const archivedMessage = locale === "tr"
    ? "Bu şablon arşivde. Düzenleme ve yeni taslak oluşturma işlemleri geri yüklenene kadar kapatıldı."
    : "This template is archived. Editing and new draft creation are disabled until it is restored.";
  const detailText = locale === "tr"
    ? {
      archiveVersionTitle: "Sürümü arşivle",
      archiveVersionDescription: (versionNumber: number) => `v${versionNumber} sürümü arşivlenecek ve aktif zaman çizelgesinden kaldırılacak.`,
      archiveVersionConfirm: "Sürümü Arşivle",
      deleteVersionTitle: "Sürümü sil",
      deleteVersionDescription: (versionNumber: number) => `v${versionNumber} taslağı kalıcı olarak silinecek.`,
      deleteVersionConfirm: "Sürümü Sil",
      archiveVersion: "Arşivle",
      deleteVersion: "Sil",
      jsonSnapshot: "Yerleşim JSON Görünümü",
      jsonSnapshotDescription: "Kaydedilen canonical yerleşim JSON kaydı.",
      expandSnapshot: "JSON görünümünü aç",
      collapseSnapshot: "JSON görünümünü kapat",
    }
    : {
      archiveVersionTitle: "Archive version",
      archiveVersionDescription: (versionNumber: number) => `Version v${versionNumber} will be archived and removed from the active timeline flow.`,
      archiveVersionConfirm: "Archive Version",
      deleteVersionTitle: "Delete version",
      deleteVersionDescription: (versionNumber: number) => `Draft version v${versionNumber} will be permanently deleted.`,
      deleteVersionConfirm: "Delete Version",
      archiveVersion: "Archive",
      deleteVersion: "Delete",
      jsonSnapshot: "Layout JSON View",
      jsonSnapshotDescription: "Stored canonical layout JSON record.",
      expandSnapshot: "Expand JSON view",
      collapseSnapshot: "Collapse JSON view",
    };

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
  const snapshotTitle = activeVersion ? t("templates.detailPage.publishedSnapshot") : editableDraft ? t("templates.detailPage.workingSnapshot") : t("templates.detailPage.snapshot");
  const formattedSnapshotJson = useMemo(() => {
    if (!snapshotVersion?.layoutJson) {
      return t("templates.detailPage.noLayout");
    }

    try {
      return JSON.stringify(JSON.parse(snapshotVersion.layoutJson), null, 2);
    } catch {
      return snapshotVersion.layoutJson;
    }
  }, [snapshotVersion?.layoutJson, t]);

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
      setMessage((error as Error).message || t("templates.detailPage.failedToPrepareDraft"));
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
      setMessage(t("templates.detailPage.activeVersionRequired"));
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

    setMessage(nextFavoriteState ? t("templates.favoriteAdded") : t("templates.favoriteRemoved"));
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
    return <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" /></div>;
  }

  if (!template) {
    return <EmptyState title={t("templates.detailPage.notFound")} description={message || t("templates.detailPage.notFoundDescription")} />;
  }

  return (
    <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow={t("templates.detailPage.eyebrow")}
          title={template.name}
          description={template.description || t("templates.detailPage.descriptionFallback")}
          actions={
            <>
              <button
                type="button"
                className={`${favoriteButtonClass} ${template.isFavorite ? "border-warn/40 bg-warn/15 text-warn" : ""}`}
                onClick={handleToggleFavorite}
                title={template.isFavorite ? t("templates.unfavorite") : t("templates.favorite")}
                aria-label={template.isFavorite ? t("templates.unfavorite") : t("templates.favorite")}
              >
                <Star size={18} weight={template.isFavorite ? "fill" : "regular"} />
              </button>
              <Link href="/templates/archived" className="plms-button-secondary">{t("templates.detailPage.archiveLibrary")}</Link>
              <Link href={`/templates/${template.id}/compare`} className="plms-button-secondary">{t("templates.detailPage.compareVersions")}</Link>
              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                <button className="plms-button-primary" onClick={() => handleEdit()} disabled={busy || template.isArchived}>{t("templates.detailPage.openEditor")}</button>
              </RoleGuard>
            </>
          }
        />

        {message ? (
          <div className="rounded-lg border border-warn/20 bg-warn/10 p-4 text-sm font-medium text-warn">{message}</div>
        ) : null}
        {template.isArchived ? (
          <div className="rounded-lg border border-bad/20 bg-bad/10 p-4 text-sm font-medium text-bad">{archivedMessage}</div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{t("templates.detailPage.activeVersion")}</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-3xl font-medium text-ink">{template.currentActiveVersion ? `v${template.currentActiveVersion.versionNumber}` : "-"}</div>
              {template.currentActiveVersion ? <StatusBadge label={template.currentActiveVersion.status} tone={getTemplateTone(template.currentActiveVersion.status)} /> : null}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{t("templates.detailPage.drafts")}</div>
            <div className="mt-3 text-3xl font-medium text-ink">{metrics.drafts}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{t("templates.detailPage.inReview")}</div>
            <div className="mt-3 text-3xl font-medium text-ink">{metrics.inReview}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{t("templates.detailPage.archived")}</div>
            <div className="mt-3 text-3xl font-medium text-ink">{metrics.archived}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-xl border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-xs font-medium text-accent">{template.code}</span>
                <StatusBadge label={template.isActive ? "Active" : "Inactive"} tone={template.isActive ? "success" : "danger"} />
                <div className="text-xs font-medium text-ink-3">{t("templates.detailPage.updatedAt", undefined, { date: formatDateTime(template.updatedAt) })}</div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="flex items-center justify-between">
                  <div>
                  <div className="text-xs font-medium text-ink-3">{t("templates.detailPage.versionTimeline")}</div>
                  <div className="mt-1 text-sm font-medium text-ink-2">{t("templates.detailPage.timelineDescription")}</div>
                </div>
                <RoleGuard allowedRoles={["Admin", "Operator"]}>
                  <button className="plms-button-secondary" onClick={() => handleEdit()} disabled={busy || template.isArchived}>{t("templates.detailPage.createOrOpenDraft")}</button>
                </RoleGuard>
              </div>

              {(template.versions || []).length === 0 ? (
                <div className="mt-6"><EmptyState title={t("templates.detailPage.noVersions")} description={t("templates.detailPage.noVersionsDescription")} /></div>
              ) : (
                <div className="mt-6">
                  <DataTable columns={[t("templates.detailPage.version"), t("templates.detailPage.status"), t("templates.detailPage.created"), t("templates.detailPage.notes"), t("templates.detailPage.actions")]}>
                    {(template.versions || []).map((version) => (
                      <tr key={version.id} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4 text-sm font-medium text-ink">v{version.versionNumber}</td>
                        <td className="px-6 py-4"><StatusBadge label={version.status} tone={getTemplateTone(version.status)} /></td>
                        <td className="px-6 py-4 text-sm font-medium text-ink-3">
                          {formatDateTime(version.createdAt)}<div className="mt-1 text-xs">{version.createdBy}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-ink-2">{version.changeNotes || t("templates.detailPage.noNotesRecorded")}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/templates/${template.id}/preview?versionId=${version.id}`} className={getActionButtonClass()}>{t("templates.detailPage.preview")}</Link>
                            <button className={getActionButtonClass("info")} onClick={() => handlePrint(version)}>{t("templates.detailPage.print")}</button>
                            {canCreate ? (
                              <button className={getActionButtonClass()} onClick={() => setCloneTarget(version)}>
                                {t("templates.detailPage.clone")}
                              </button>
                            ) : null}
                            {snapshotVersion && snapshotVersion.id !== version.id ? (
                              <Link href={`/templates/${template.id}/compare?leftVersionId=${version.id}&rightVersionId=${snapshotVersion.id}`} className={getActionButtonClass()}>{t("templates.detailPage.compare")}</Link>
                            ) : null}
                            {(version.status === "Draft" || version.status === "Rejected") ? (
                              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <>
                                  <button className={getActionButtonClass("primary")} onClick={() => handleEdit(version)} disabled={busy || template.isArchived}>{t("templates.detailPage.edit")}</button>
                                  <button className={getActionButtonClass("primary")} onClick={() => handleWorkflowAction(version.id, "request-approval")} disabled={busy || template.isArchived}>{t("templates.detailPage.submitReview")}</button>
                                </>
                              </RoleGuard>
                            ) : null}
                            {(version.status === "Rejected" || version.status === "Approved" || version.status === "Published" || version.status === "Deprecated" || version.status === "Archived") ? (
                              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <button className={getActionButtonClass("primary")} onClick={() => handleEdit(version)} disabled={busy || template.isArchived}>{t("templates.detailPage.createRevision")}</button>
                              </RoleGuard>
                            ) : null}
                            {version.status === "InReview" ? (
                              <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                <button className={getActionButtonClass("warning")} onClick={() => setReviewModal({ versionId: version.id, versionNumber: version.versionNumber })} disabled={template.isArchived}>{t("templates.detailPage.review")}</button>
                              </RoleGuard>
                            ) : null}
                            {version.status === "Approved" ? (
                              <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                <button className={getActionButtonClass("success")} onClick={() => handleWorkflowAction(version.id, "publish")} disabled={busy || template.isArchived}>{t("templates.detailPage.publish")}</button>
                              </RoleGuard>
                            ) : null}
                            {hasAnyPermission(grantedPermissions, [permissions.templatesArchive]) || roles.includes("Admin") ? (
                              canArchiveVersion(template, version) ? (
                                <button className={getActionButtonClass("warning")} onClick={() => setArchiveVersionTarget(version)} disabled={busy}>
                                  {detailText.archiveVersion}
                                </button>
                              ) : null
                            ) : null}
                            {hasAnyPermission(grantedPermissions, [permissions.templatesDelete]) || roles.includes("Admin") ? (
                              canDeleteVersion(template, version) ? (
                                <button className={getActionButtonClass("danger")} onClick={() => setDeleteVersionTarget(version)} disabled={busy}>
                                  {detailText.deleteVersion}
                                </button>
                              ) : null
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <div
                className="flex cursor-pointer items-center justify-between gap-4"
                onClick={() => setSnapshotExpanded((current) => !current)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSnapshotExpanded((current) => !current);
                  }
                }}
                aria-expanded={snapshotExpanded}
                aria-label={snapshotExpanded ? detailText.collapseSnapshot : detailText.expandSnapshot}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-xs font-medium text-ink-3">{detailText.jsonSnapshot}</div>
                    {snapshotVersion ? <StatusBadge label={snapshotVersion.status} tone={getTemplateTone(snapshotVersion.status)} /> : null}
                    {snapshotVersion ? <div className="text-xs font-medium text-ink-3">v{snapshotVersion.versionNumber}</div> : null}
                  </div>
                  <div className="mt-2 text-sm font-medium text-ink-2">{detailText.jsonSnapshotDescription}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-ink-3">{snapshotTitle}</span>
                  {snapshotExpanded ? <CaretDown size={18} weight="bold" className="text-ink-3" /> : <CaretRight size={18} weight="bold" className="text-ink-3" />}
                </div>
              </div>
              {snapshotExpanded ? (
                <pre className="mt-5 max-h-[420px] overflow-auto whitespace-pre rounded-lg bg-surface p-5 text-xs font-medium leading-6 text-good">{formattedSnapshotJson}</pre>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{t("templates.detailPage.editableDraft")}</div>
              {editableDraft ? (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-2xl font-medium text-ink">v{editableDraft.versionNumber}</div>
                    <StatusBadge label={editableDraft.status} tone={getTemplateTone(editableDraft.status)} />
                  </div>
                  <div className="space-y-2 text-sm font-medium text-ink-2">
                    <div>{t("templates.detailPage.createdBy", undefined, { date: formatDateTime(editableDraft.createdAt), user: editableDraft.createdBy })}</div>
                    <div>{editableDraft.changeNotes || t("templates.detailPage.noDraftNotes")}</div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <RoleGuard allowedRoles={["Admin", "Operator"]}>
                      <button className="plms-button-primary" onClick={() => handleEdit(editableDraft)} disabled={busy || template.isArchived}>{t("templates.detailPage.openDraft")}</button>
                    </RoleGuard>
                    <Link href={`/templates/${template.id}/preview?versionId=${editableDraft.id}`} className="plms-button-secondary">{t("templates.detailPage.previewDraft")}</Link>
                    {activeVersion ? <Link href={`/templates/${template.id}/compare?leftVersionId=${editableDraft.id}&rightVersionId=${activeVersion.id}`} className="plms-button-secondary">{t("templates.detailPage.compareToPublished")}</Link> : null}
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="text-sm font-medium text-ink-2">{t("templates.detailPage.noEditableDraft")}</div>
                  <RoleGuard allowedRoles={["Admin", "Operator"]}>
                    <button className="plms-button-primary w-full" onClick={() => handleEdit()} disabled={busy || template.isArchived}>{t("templates.detailPage.createDraft")}</button>
                  </RoleGuard>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{t("templates.detailPage.productionEntry")}</div>
              {activeVersion ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-2xl font-medium text-ink">v{activeVersion.versionNumber}</div>
                    <div className="mt-1 text-sm font-medium text-ink-2">{t("templates.detailPage.productionDescription")}</div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link href={`/templates/${template.id}/preview?versionId=${activeVersion.id}`} className="plms-button-primary">{t("templates.detailPage.openProductionPreview")}</Link>
                    <button className="plms-button-secondary" onClick={() => handlePrint(activeVersion)}>{t("templates.detailPage.printActiveVersion")}</button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm font-medium text-ink-2">{t("templates.detailPage.noPublished")}</div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{t("templates.detailPage.templateRecord")}</div>
              <div className="mt-4 space-y-3 text-sm font-medium text-ink-2">
                <div className="flex items-center justify-between"><span>{t("templates.detailPage.created")}</span><span className="text-ink">{formatDateTime(template.createdAt)}</span></div>
                <div className="flex items-center justify-between"><span>{t("templates.detailPage.updated")}</span><span className="text-ink">{formatDateTime(template.updatedAt)}</span></div>
                <div className="flex items-center justify-between"><span>{t("templates.detailPage.totalVersions")}</span><span className="text-ink">{metrics.total}</span></div>
              </div>
            </div>
          </div>
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
            <div className="w-full max-w-xl rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{t("templates.detailPage.reviewerDecision")}</div>
              <h2 className="mt-2 text-2xl font-medium text-ink">{t("templates.detailPage.reviewVersion", undefined, { version: reviewModal.versionNumber })}</h2>
              <textarea
                className="plms-input mt-5 min-h-36"
                placeholder={t("templates.detailPage.reviewPlaceholder")}
                value={reviewComments}
                onChange={(event) => setReviewComments(event.target.value)}
              />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <button className="plms-button-secondary" onClick={() => setReviewModal(null)}>{t("common.cancel")}</button>
                <button className="rounded-lg bg-bad px-4 py-3 text-xs font-medium text-white" onClick={() => handleWorkflowAction(reviewModal.versionId, "review", { approve: false, comments: reviewComments })} disabled={busy}>{t("templates.detailPage.reject")}</button>
                <button className="rounded-lg bg-good px-4 py-3 text-xs font-medium text-white" onClick={() => handleWorkflowAction(reviewModal.versionId, "review", { approve: true, comments: reviewComments })} disabled={busy}>{t("templates.detailPage.approve")}</button>
              </div>
            </div>
          </div>
          </Portal>
        ) : null}

        <ConfirmModal
          open={archiveVersionTarget !== null}
          title={detailText.archiveVersionTitle}
          description={detailText.archiveVersionDescription(archiveVersionTarget?.versionNumber || 0)}
          confirmLabel={detailText.archiveVersionConfirm}
          tone="primary"
          onCancel={() => setArchiveVersionTarget(null)}
          onConfirm={() => void handleArchiveVersion()}
          loading={busy}
        />

        <ConfirmModal
          open={deleteVersionTarget !== null}
          title={detailText.deleteVersionTitle}
          description={detailText.deleteVersionDescription(deleteVersionTarget?.versionNumber || 0)}
          confirmLabel={detailText.deleteVersionConfirm}
          onCancel={() => setDeleteVersionTarget(null)}
          onConfirm={() => void handleDeleteVersion()}
          loading={busy}
        />
      </div>
    </RoleGuard>
  );
}
