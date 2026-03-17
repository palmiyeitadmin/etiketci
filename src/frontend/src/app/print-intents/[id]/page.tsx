"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { buildTemplatePreviewFileUrl } from "@/lib/template-preview-url";
import { getPrintIntentStatusLabel, getPrintIntentStatusTone, normalizePrintIntentStatus } from "@/lib/print-intent-status";
import { PrintIntentDetailDto } from "@/types/operational";
import { AuditLogDto } from "@/types/audit";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

interface ReadinessSnapshot {
  status?: number;
  errors?: string[];
  warnings?: string[];
}

export default function PrintIntentDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const [intent, setIntent] = useState<PrintIntentDetailDto | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadIntent() {
    setLoading(true);
    const [intentRes, auditRes] = await Promise.all([
      apiFetch<PrintIntentDetailDto>(`/api/PrintIntents/${id}`),
      apiFetch<AuditLogDto[]>(`/api/PrintIntents/${id}/audit`),
    ]);

    if (intentRes.success) {
      const normalized = { ...intentRes.data, status: normalizePrintIntentStatus(intentRes.data.status) };
      setIntent(normalized);
      setFailureReason(normalized.failureReason || "");
      setMessage(null);
    } else {
      setMessage(intentRes.error.message);
      setIntent(null);
    }

    if (auditRes.success) {
      setAuditLogs(auditRes.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadIntent();
  }, [id]);

  const readiness = useMemo<ReadinessSnapshot | null>(() => {
    if (!intent?.readinessSnapshot) return null;
    try {
      return JSON.parse(intent.readinessSnapshot) as ReadinessSnapshot;
    } catch {
      return null;
    }
  }, [intent]);

  async function runAction(action: "handoff" | "dispatch-pdf" | "confirm-print" | "mark-failed" | "cancel") {
    if (!intent) return false;

    setSubmitting(true);
    const body = action === "mark-failed" ? JSON.stringify({ reason: failureReason }) : undefined;
    const response = await apiFetch<PrintIntentDetailDto>(`/api/PrintIntents/${intent.id}/${action}`, {
      method: "POST",
      body,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
    setSubmitting(false);

    if (!response.success) {
      setMessage(response.error.message);
      return false;
    }

    if (response.data) {
      setIntent({ ...response.data, status: normalizePrintIntentStatus(response.data.status) });
    }
    setMessage(null);
    await loadIntent();
    return true;
  }

  async function dispatchPdf() {
    if (!intent) return;

    const proofWindow = window.open("about:blank", "_blank");
    const dispatched = await runAction("dispatch-pdf");
    if (proofWindow && dispatched) {
      proofWindow.location.href = buildTemplatePreviewFileUrl(intent.templateId, intent.versionId, intent.productId);
    } else if (proofWindow && !dispatched) {
      proofWindow.close();
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" /></div>;
  }

  if (!intent) {
    return <EmptyState title="Print intent not found" description={message || "The requested print intent could not be loaded."} />;
  }

  const isPending = intent.status === "Pending";
  const isReadyForPrint = intent.status === "ReadyForPrint";
  const isSentToClient = intent.status === "SentToClient";
  const isTerminal = intent.status === "UserPrinted" || intent.status === "Failed" || intent.status === "Cancelled";
  const safetyMessages = intent.safetyCheck?.messages || [];
  const isSafe = intent.safetyCheck?.isSafe ?? false;

  return (
    <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Print lifecycle"
          title={intent.productName}
          description={`Template ${intent.templateName} · version ${intent.versionNumber} · quantity ${intent.quantity}`}
          actions={
            <>
              <Link href="/print-intents" className="plms-button-secondary">Back to Queue</Link>
              <button className="plms-button-secondary" onClick={() => window.open(buildTemplatePreviewFileUrl(intent.templateId, intent.versionId, intent.productId), "_blank")}>Open Proof PDF</button>
            </>
          }
        />

        {message ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-200">{message}</div> : null}

        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Status</div>
            <div className="mt-3"><StatusBadge label={getPrintIntentStatusLabel(intent.status)} tone={getPrintIntentStatusTone(intent.status)} /></div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Requested By</div>
            <div className="mt-3 text-lg font-black tracking-[-0.04em] text-white">{intent.requestedBy}</div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Quantity</div>
            <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">{intent.quantity}</div>
          </div>
          <div className="rounded-3xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Safety</div>
            <div className="mt-3"><StatusBadge label={isSafe ? "Safe" : "Attention"} tone={isSafe ? "success" : "danger"} /></div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Safety and Readiness</div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-white">Final Safety Check</div>
                  {safetyMessages.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm font-medium text-[color:var(--plms-text-muted)]">
                      {safetyMessages.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                    </ul>
                  ) : <div className="mt-4 text-sm font-medium text-[color:var(--plms-text-muted)]">No active safety warnings.</div>}
                </div>
                <div className="rounded-[1.5rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-5">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-white">Original Readiness Snapshot</div>
                  {readiness ? (
                    <div className="mt-4 space-y-2 text-sm font-medium text-[color:var(--plms-text-muted)]">
                      {(readiness.errors || []).length > 0 ? (readiness.errors || []).map((item, index) => <div key={`${item}-${index}`}>{item}</div>) : null}
                      {(readiness.warnings || []).length > 0 ? (readiness.warnings || []).map((item, index) => <div key={`${item}-${index}`}>{item}</div>) : null}
                      {(readiness.errors || []).length === 0 && (readiness.warnings || []).length === 0 ? <div>No recorded blockers or warnings.</div> : null}
                    </div>
                  ) : <div className="mt-4 text-sm font-medium text-[color:var(--plms-text-muted)]">Readiness snapshot unavailable.</div>}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Operational Timeline</div>
              <div className="mt-5 space-y-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
                <div className="flex items-center justify-between rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-3"><span>Requested</span><span className="text-white">{new Date(intent.createdAt).toLocaleString()}</span></div>
                <div className="flex items-center justify-between rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-3"><span>Operator Review</span><span className="text-white">{intent.operatorReviewedAt ? `${new Date(intent.operatorReviewedAt).toLocaleString()} · ${intent.operatorReviewedBy}` : "Not completed"}</span></div>
                <div className="flex items-center justify-between rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-3"><span>PDF Dispatch</span><span className="text-white">{intent.dispatchedAt ? `${new Date(intent.dispatchedAt).toLocaleString()} · ${intent.dispatchedBy}` : "Not dispatched"}</span></div>
                <div className="flex items-center justify-between rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] px-4 py-3"><span>Completion</span><span className="text-white">{intent.completedAt ? `${new Date(intent.completedAt).toLocaleString()} · ${intent.completedBy}` : "Awaiting outcome"}</span></div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Audit Trail</div>
              {auditLogs.length === 0 ? (
                <div className="mt-5 text-sm font-medium text-[color:var(--plms-text-muted)]">No audit records found for this intent.</div>
              ) : (
                <div className="mt-5 space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-black text-white">{log.action}</div>
                        <div className="text-xs font-medium text-[color:var(--plms-text-subtle)]">{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="mt-2 text-sm font-medium text-[color:var(--plms-text-muted)]">{log.details}</div>
                      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">{log.userId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Lifecycle Actions</div>
              <div className="mt-5 space-y-3">
                {isPending ? (
                  <button className="plms-button-primary w-full" onClick={() => runAction("handoff")} disabled={submitting || !isSafe}>Confirm Readiness</button>
                ) : null}
                {isReadyForPrint ? (
                  <button className="plms-button-primary w-full" onClick={dispatchPdf} disabled={submitting}>Dispatch PDF To Browser</button>
                ) : null}
                {isSentToClient ? (
                  <>
                    <textarea className="plms-input min-h-28" placeholder="Optional failure reason for a failed print..." value={failureReason} onChange={(event) => setFailureReason(event.target.value)} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <button className="rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => runAction("mark-failed")} disabled={submitting}>Mark Failed</button>
                      <button className="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white" onClick={() => runAction("confirm-print")} disabled={submitting}>Confirm Printed</button>
                    </div>
                  </>
                ) : null}
                {(isPending || isReadyForPrint) ? (
                  <button className="plms-button-secondary w-full" onClick={() => runAction("cancel")} disabled={submitting}>Cancel Intent</button>
                ) : null}
                {isTerminal ? (
                  <div className="rounded-2xl border border-[color:var(--plms-border)] bg-[color:var(--plms-panel-2)] p-4 text-sm font-medium text-[color:var(--plms-text-muted)]">
                    {intent.status === "UserPrinted" ? "Print confirmed by operator." : intent.status === "Failed" ? `Print failed. ${intent.failureReason || "No reason recorded."}` : "Intent cancelled before dispatch."}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[color:var(--plms-border)] bg-[color:var(--plms-panel)] p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--plms-text-subtle)]">Record Context</div>
              <div className="mt-4 space-y-3 text-sm font-medium text-[color:var(--plms-text-muted)]">
                <div className="flex items-center justify-between"><span>Template</span><span className="text-white">{intent.templateName}</span></div>
                <div className="flex items-center justify-between"><span>Version</span><span className="text-white">v{intent.versionNumber}</span></div>
                <div className="flex items-center justify-between"><span>Product</span><span className="text-white">{intent.productName}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
