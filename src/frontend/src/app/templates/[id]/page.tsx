"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { normalizeLabelTemplate } from "@/lib/template-status";
import { ensureEditableVersion } from "@/lib/template-versioning";
import { LabelTemplate, TemplateVersion } from "@/types/template";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

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
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [template, setTemplate] = useState<LabelTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ versionId: string; versionNumber: number } | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
  const snapshotTitle = activeVersion ? "Published Layout Snapshot" : editableDraft ? "Working Layout Snapshot" : "Layout Snapshot";

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
    if (!template) return;

    try {
      setBusy(true);
      const draft = await ensureEditableVersion(template, sourceVersion);
      router.push(`/templates/${template.id}/edit?versionId=${draft.id}`);
    } catch (error) {
      setMessage((error as Error).message || "Failed to prepare editable draft.");
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

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>;
  }

  if (!template) {
    return <EmptyState title="Template not found" description={message || "The requested template could not be loaded."} />;
  }

  return (
    <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Template governance"
          title={template.name}
          description={template.description || "Lifecycle, versioning and publication controls for this template."}
          actions={
            <>
              <Link href="/templates/archived" className="plms-button-secondary">Archive Library</Link>
              <Link href={`/templates/${template.id}/compare`} className="plms-button-secondary">Compare Versions</Link>
              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                <button className="plms-button-primary" onClick={() => handleEdit()} disabled={busy}>Open Editor</button>
              </RoleGuard>
            </>
          }
        />

        {message ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">{message}</div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Active Version</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-3xl font-black tracking-[-0.05em] text-white">{template.currentActiveVersion ? `v${template.currentActiveVersion.versionNumber}` : "-"}</div>
              {template.currentActiveVersion ? <StatusBadge label={template.currentActiveVersion.status} tone={getTemplateTone(template.currentActiveVersion.status)} /> : null}
            </div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Drafts</div>
            <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">{metrics.drafts}</div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">In Review</div>
            <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">{metrics.inReview}</div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Archived / Deprecated</div>
            <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">{metrics.archived}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-2 py-1 font-mono text-xs font-black text-blue-300">{template.code}</span>
                <StatusBadge label={template.isActive ? "Active" : "Inactive"} tone={template.isActive ? "success" : "danger"} />
                <div className="text-xs font-medium text-[color:var(--plms-text-subtle)]">Updated {new Date(template.updatedAt).toLocaleString()}</div>
              </div>
              <div className="mt-6 rounded-[1.5rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">{snapshotTitle}</div>
                  {snapshotVersion ? <StatusBadge label={snapshotVersion.status} tone={getTemplateTone(snapshotVersion.status)} /> : null}
                  {snapshotVersion ? <div className="text-xs font-medium text-[color:var(--plms-text-subtle)]">v{snapshotVersion.versionNumber}</div> : null}
                </div>
                <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-all rounded-2xl bg-slate-950 p-5 text-xs font-medium text-emerald-300">{snapshotVersion?.layoutJson || "No layout JSON available."}</pre>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Version Timeline</div>
                  <div className="mt-1 text-sm font-medium text-[color:var(--plms-text-muted)]">All immutable revisions and their current governance state.</div>
                </div>
                <RoleGuard allowedRoles={["Admin", "Operator"]}>
                  <button className="plms-button-secondary" onClick={() => handleEdit()} disabled={busy}>Create / Open Draft</button>
                </RoleGuard>
              </div>

              {(template.versions || []).length === 0 ? (
                <div className="mt-6"><EmptyState title="No versions" description="This template does not contain any versions yet." /></div>
              ) : (
                <div className="mt-6">
                  <DataTable columns={["Version", "Status", "Created", "Notes", "Actions"]}>
                    {(template.versions || []).map((version) => (
                      <tr key={version.id} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4 text-sm font-black text-white">v{version.versionNumber}</td>
                        <td className="px-6 py-4"><StatusBadge label={version.status} tone={getTemplateTone(version.status)} /></td>
                        <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-subtle)]">
                          {new Date(version.createdAt).toLocaleString()}<div className="mt-1 text-xs">{version.createdBy}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-[color:var(--plms-text-muted)]">{version.changeNotes || "No notes recorded."}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/templates/${template.id}/preview?versionId=${version.id}`} className="plms-button-secondary">Preview</Link>
                            {snapshotVersion && snapshotVersion.id !== version.id ? (
                              <Link href={`/templates/${template.id}/compare?leftVersionId=${version.id}&rightVersionId=${snapshotVersion.id}`} className="plms-button-secondary">Compare</Link>
                            ) : null}
                            {(version.status === "Draft" || version.status === "Rejected") ? (
                              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <>
                                  <button className="plms-button-secondary" onClick={() => handleEdit(version)} disabled={busy}>Edit</button>
                                  <button className="plms-button-primary" onClick={() => handleWorkflowAction(version.id, "request-approval")} disabled={busy}>Submit Review</button>
                                </>
                              </RoleGuard>
                            ) : null}
                            {(version.status === "Rejected" || version.status === "Approved" || version.status === "Published" || version.status === "Deprecated" || version.status === "Archived") ? (
                              <RoleGuard allowedRoles={["Admin", "Operator"]}>
                                <button className="plms-button-secondary" onClick={() => handleEdit(version)} disabled={busy}>Create Revision</button>
                              </RoleGuard>
                            ) : null}
                            {version.status === "InReview" ? (
                              <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                <button className="plms-button-primary" onClick={() => setReviewModal({ versionId: version.id, versionNumber: version.versionNumber })}>Review</button>
                              </RoleGuard>
                            ) : null}
                            {version.status === "Approved" ? (
                              <RoleGuard allowedRoles={["Admin", "Reviewer"]}>
                                <button className="plms-button-primary" onClick={() => handleWorkflowAction(version.id, "publish")} disabled={busy}>Publish</button>
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
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Editable Draft</div>
              {editableDraft ? (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-2xl font-black tracking-[-0.04em] text-white">v{editableDraft.versionNumber}</div>
                    <StatusBadge label={editableDraft.status} tone={getTemplateTone(editableDraft.status)} />
                  </div>
                  <div className="space-y-2 text-sm font-medium text-[color:var(--plms-text-muted)]">
                    <div>Created {new Date(editableDraft.createdAt).toLocaleString()} by {editableDraft.createdBy}</div>
                    <div>{editableDraft.changeNotes || "No draft notes recorded yet."}</div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <RoleGuard allowedRoles={["Admin", "Operator"]}>
                      <button className="plms-button-primary" onClick={() => handleEdit(editableDraft)} disabled={busy}>Open Draft</button>
                    </RoleGuard>
                    <Link href={`/templates/${template.id}/preview?versionId=${editableDraft.id}`} className="plms-button-secondary">Preview Draft</Link>
                    {activeVersion ? <Link href={`/templates/${template.id}/compare?leftVersionId=${editableDraft.id}&rightVersionId=${activeVersion.id}`} className="plms-button-secondary">Compare to Published</Link> : null}
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="text-sm font-medium text-[color:var(--plms-text-muted)]">No editable draft exists yet.</div>
                  <RoleGuard allowedRoles={["Admin", "Operator"]}>
                    <button className="plms-button-primary w-full" onClick={() => handleEdit()} disabled={busy}>Create Draft</button>
                  </RoleGuard>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Production Entry</div>
              {activeVersion ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-2xl font-black tracking-[-0.04em] text-white">v{activeVersion.versionNumber}</div>
                    <div className="mt-1 text-sm font-medium text-[color:var(--plms-text-muted)]">Published version used for production proof and print intent generation.</div>
                  </div>
                  <Link href={`/templates/${template.id}/preview?versionId=${activeVersion.id}`} className="plms-button-primary w-full">Open Production Preview</Link>
                </div>
              ) : (
                <div className="mt-4 text-sm font-medium text-[color:var(--plms-text-muted)]">No published version exists yet.</div>
              )}
            </div>

            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Template Record</div>
              <div className="mt-4 space-y-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
                <div className="flex items-center justify-between"><span>Created</span><span className="text-white">{new Date(template.createdAt).toLocaleString()}</span></div>
                <div className="flex items-center justify-between"><span>Updated</span><span className="text-white">{new Date(template.updatedAt).toLocaleString()}</span></div>
                <div className="flex items-center justify-between"><span>Total Versions</span><span className="text-white">{metrics.total}</span></div>
              </div>
            </div>
          </div>
        </div>

        {reviewModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Reviewer Decision</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">Review v{reviewModal.versionNumber}</h2>
              <textarea
                className="plms-input mt-5 min-h-36"
                placeholder="Enter review comments..."
                value={reviewComments}
                onChange={(event) => setReviewComments(event.target.value)}
              />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <button className="plms-button-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
                <button className="rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => handleWorkflowAction(reviewModal.versionId, "review", { approve: false, comments: reviewComments })} disabled={busy}>Reject</button>
                <button className="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => handleWorkflowAction(reviewModal.versionId, "review", { approve: true, comments: reviewComments })} disabled={busy}>Approve</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </RoleGuard>
  );
}
