"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RoleGuard } from "@/components/RoleGuard";
import { TemplateCloneModal } from "@/components/Templates/TemplateCloneModal";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { hasAnyPermission, permissions } from "@/lib/permissions";
import { openPdfDocument } from "@/lib/pdf-print";
import { buildTemplatePreviewFileUrl } from "@/lib/template-preview-url";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { ensureEditableVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Portal } from "@/components/ui/Portal";

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

export default function TemplateDetailPage() {
  const { data: session } = useSession();
  const { formatDateTime, t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const roles = ((session?.user as any)?.roles || []) as string[];
  const grantedPermissions = ((session?.user as any)?.permissions || []) as string[];
  const canCreate = roles.includes("Admin") || hasAnyPermission(grantedPermissions, [permissions.templatesCreate]);

  const [template, setTemplate] = useState<LabelTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ versionId: string; versionNumber: number } | null>(null);
  const [cloneTarget, setCloneTarget] = useState<TemplateVersion | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const archivedMessage = locale === "tr"
    ? "Bu sablon arsivde. Duzenleme ve yeni taslak olusturma islemleri geri yuklenene kadar kapatildi."
    : "This template is archived. Editing and new draft creation are disabled until it is restored.";

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

    const opened = openPdfDocument(buildTemplatePreviewFileUrl(template.id, version.id));
    if (!opened) {
      setMessage(t("templates.detailPage.printPopupBlocked"));
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>;
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
              <Link href="/templates/archived" className="plms-button-secondary">{t("templates.detailPage.archiveLibrary")}</Link>
              <Link href={`/templates/${template.id}/compare`} className="plms-button-secondary">{t("templates.detailPage.compareVersions")}</Link>
              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                <button className="plms-button-primary" onClick={() => handleEdit()} disabled={busy || template.isArchived}>{t("templates.detailPage.openEditor")}</button>
              </RoleGuard>
            </>
          }
        />

        {message ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">{message}</div>
        ) : null}
        {template.isArchived ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-200">{archivedMessage}</div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detailPage.activeVersion")}</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-3xl font-black tracking-[-0.05em] text-white">{template.currentActiveVersion ? `v${template.currentActiveVersion.versionNumber}` : "-"}</div>
              {template.currentActiveVersion ? <StatusBadge label={template.currentActiveVersion.status} tone={getTemplateTone(template.currentActiveVersion.status)} /> : null}
            </div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detailPage.drafts")}</div>
            <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">{metrics.drafts}</div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detailPage.inReview")}</div>
            <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">{metrics.inReview}</div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detailPage.archived")}</div>
            <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">{metrics.archived}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{template.code}</span>
                <StatusBadge label={template.isActive ? "Active" : "Inactive"} tone={template.isActive ? "success" : "danger"} />
                <div className="text-xs font-medium text-[color:var(--plms-text-subtle)]">{t("templates.detailPage.updatedAt", undefined, { date: formatDateTime(template.updatedAt) })}</div>
              </div>
              <div className="mt-6 rounded-[1.5rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{snapshotTitle}</div>
                  {snapshotVersion ? <StatusBadge label={snapshotVersion.status} tone={getTemplateTone(snapshotVersion.status)} /> : null}
                  {snapshotVersion ? <div className="text-xs font-medium text-[color:var(--plms-text-subtle)]">v{snapshotVersion.versionNumber}</div> : null}
                </div>
                <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-all rounded-2xl bg-slate-950 p-5 text-xs font-medium text-emerald-300">{snapshotVersion?.layoutJson || t("templates.detailPage.noLayout")}</pre>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="flex items-center justify-between">
                  <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detailPage.versionTimeline")}</div>
                  <div className="mt-1 text-sm font-medium text-[color:var(--plms-text-muted)]">{t("templates.detailPage.timelineDescription")}</div>
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
                        <td className="px-6 py-4 text-sm font-black text-white">v{version.versionNumber}</td>
                        <td className="px-6 py-4"><StatusBadge label={version.status} tone={getTemplateTone(version.status)} /></td>
                        <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-subtle)]">
                          {formatDateTime(version.createdAt)}<div className="mt-1 text-xs">{version.createdBy}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">{version.changeNotes || t("templates.detailPage.noNotesRecorded")}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/templates/${template.id}/preview?versionId=${version.id}`} className="plms-button-secondary">{t("templates.detailPage.preview")}</Link>
                            <button className="plms-button-secondary" onClick={() => handlePrint(version)}>{t("templates.detailPage.print")}</button>
                            {canCreate ? (
                              <button className="plms-button-secondary" onClick={() => setCloneTarget(version)}>
                                {t("templates.detailPage.clone")}
                              </button>
                            ) : null}
                            {snapshotVersion && snapshotVersion.id !== version.id ? (
                              <Link href={`/templates/${template.id}/compare?leftVersionId=${version.id}&rightVersionId=${snapshotVersion.id}`} className="plms-button-secondary">{t("templates.detailPage.compare")}</Link>
                            ) : null}
                            {(version.status === "Draft" || version.status === "Rejected") ? (
                              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <>
                                  <button className="plms-button-secondary" onClick={() => handleEdit(version)} disabled={busy || template.isArchived}>{t("templates.detailPage.edit")}</button>
                                  <button className="plms-button-primary" onClick={() => handleWorkflowAction(version.id, "request-approval")} disabled={busy || template.isArchived}>{t("templates.detailPage.submitReview")}</button>
                                </>
                              </RoleGuard>
                            ) : null}
                            {(version.status === "Rejected" || version.status === "Approved" || version.status === "Published" || version.status === "Deprecated" || version.status === "Archived") ? (
                              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <button className="plms-button-secondary" onClick={() => handleEdit(version)} disabled={busy || template.isArchived}>{t("templates.detailPage.createRevision")}</button>
                              </RoleGuard>
                            ) : null}
                            {version.status === "InReview" ? (
                              <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                <button className="plms-button-primary" onClick={() => setReviewModal({ versionId: version.id, versionNumber: version.versionNumber })} disabled={template.isArchived}>{t("templates.detailPage.review")}</button>
                              </RoleGuard>
                            ) : null}
                            {version.status === "Approved" ? (
                              <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                <button className="plms-button-primary" onClick={() => handleWorkflowAction(version.id, "publish")} disabled={busy || template.isArchived}>{t("templates.detailPage.publish")}</button>
                              </RoleGuard>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detailPage.editableDraft")}</div>
              {editableDraft ? (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-2xl font-black tracking-[-0.04em] text-white">v{editableDraft.versionNumber}</div>
                    <StatusBadge label={editableDraft.status} tone={getTemplateTone(editableDraft.status)} />
                  </div>
                  <div className="space-y-2 text-sm font-medium text-[color:var(--plms-text-muted)]">
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
                  <div className="text-sm font-medium text-[color:var(--plms-text-muted)]">{t("templates.detailPage.noEditableDraft")}</div>
                  <RoleGuard allowedRoles={["Admin", "Operator"]}>
                    <button className="plms-button-primary w-full" onClick={() => handleEdit()} disabled={busy || template.isArchived}>{t("templates.detailPage.createDraft")}</button>
                  </RoleGuard>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detailPage.productionEntry")}</div>
              {activeVersion ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-2xl font-black tracking-[-0.04em] text-white">v{activeVersion.versionNumber}</div>
                    <div className="mt-1 text-sm font-medium text-[color:var(--plms-text-muted)]">{t("templates.detailPage.productionDescription")}</div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link href={`/templates/${template.id}/preview?versionId=${activeVersion.id}`} className="plms-button-primary">{t("templates.detailPage.openProductionPreview")}</Link>
                    <button className="plms-button-secondary" onClick={() => handlePrint(activeVersion)}>{t("templates.detailPage.printActiveVersion")}</button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm font-medium text-[color:var(--plms-text-muted)]">{t("templates.detailPage.noPublished")}</div>
              )}
            </div>

            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detailPage.templateRecord")}</div>
              <div className="mt-4 space-y-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
                <div className="flex items-center justify-between"><span>{t("templates.detailPage.created")}</span><span className="text-white">{formatDateTime(template.createdAt)}</span></div>
                <div className="flex items-center justify-between"><span>{t("templates.detailPage.updated")}</span><span className="text-white">{formatDateTime(template.updatedAt)}</span></div>
                <div className="flex items-center justify-between"><span>{t("templates.detailPage.totalVersions")}</span><span className="text-white">{metrics.total}</span></div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{t("templates.detailPage.reviewerDecision")}</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">{t("templates.detailPage.reviewVersion", undefined, { version: reviewModal.versionNumber })}</h2>
              <textarea
                className="plms-input mt-5 min-h-36"
                placeholder={t("templates.detailPage.reviewPlaceholder")}
                value={reviewComments}
                onChange={(event) => setReviewComments(event.target.value)}
              />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <button className="plms-button-secondary" onClick={() => setReviewModal(null)}>{t("common.cancel")}</button>
                <button className="rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => handleWorkflowAction(reviewModal.versionId, "review", { approve: false, comments: reviewComments })} disabled={busy}>{t("templates.detailPage.reject")}</button>
                <button className="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => handleWorkflowAction(reviewModal.versionId, "review", { approve: true, comments: reviewComments })} disabled={busy}>{t("templates.detailPage.approve")}</button>
              </div>
            </div>
          </div>
          </Portal>
        ) : null}
      </div>
    </RoleGuard>
  );
}
