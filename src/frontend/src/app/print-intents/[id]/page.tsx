"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { openPdfDocument } from "@/lib/pdf-print";
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
  const { formatDateTime, locale } = useI18n();
  const params = useParams();
  const id = String(params.id);
  const text = locale === "tr"
    ? {
      back: "Kuyruğa Dön", proof: "Prova PDF'ini aç", notFound: "Baskı talebi bulunamadı", notFoundDescription: "Baskı talebi yüklenemedi.",
      status: "Durum", requestedBy: "Talep Eden", quantity: "Adet", safety: "Güvenlik", safe: "Güvenli", attention: "Dikkat",
      safetyReadiness: "Güvenlik ve Hazırlık", finalSafety: "Son Güvenlik Kontrolü", noSafetyWarnings: "Aktif güvenlik uyarısı yok.",
      readinessSnapshot: "Orijinal Hazırlık Anlık Görüntüsü", noReadinessIssues: "Kayıtlı engel veya uyarı yok.", readinessUnavailable: "Hazırlık anlık görüntüsü yok.",
      operationalTimeline: "Operasyon Zaman Çizelgesi", requested: "Talep Edildi", operatorReview: "Operatör İncelemesi", notCompleted: "Tamamlanmadı",
      pdfDispatch: "PDF Gönderimi", notDispatched: "Gönderilmedi", completion: "Tamamlama", awaitingOutcome: "Sonuç bekleniyor", auditTrail: "Denetim İzi",
      noAudit: "Bu talep için denetim kaydı yok.", lifecycleActions: "Yaşam Döngüsü İşlemleri", confirmReadiness: "Hazırlığı Onayla", dispatchPdf: "PDF'yi Tarayıcıya Gönder",
      failureReason: "Başarısız baskı için isteğe bağlı neden...", markFailed: "Başarısız Olarak İşle", confirmPrinted: "Yazdırıldı Olarak Onayla", cancelIntent: "Talebi iptal et",
      printConfirmed: "Baskı operatör tarafından onaylandı.", noFailureReason: "Neden kaydedilmedi.", cancelled: "Talep, PDF gönderilmeden iptal edildi.", recordContext: "Kayıt Bağlamı",
      template: "Şablon", version: "Sürüm", product: "Ürün", popupBlocked: "PDF sekmesi açılamadı. Tarayıcıda açılır pencerelere izin verin veya prova PDF'ini açın.",
    }
    : {
      back: "Back to Queue", proof: "Open Proof PDF", notFound: "Print intent not found", notFoundDescription: "The requested print intent could not be loaded.",
      status: "Status", requestedBy: "Requested By", quantity: "Quantity", safety: "Safety", safe: "Safe", attention: "Attention",
      safetyReadiness: "Safety and Readiness", finalSafety: "Final Safety Check", noSafetyWarnings: "No active safety warnings.",
      readinessSnapshot: "Original Readiness Snapshot", noReadinessIssues: "No recorded blockers or warnings.", readinessUnavailable: "Readiness snapshot unavailable.",
      operationalTimeline: "Operational Timeline", requested: "Requested", operatorReview: "Operator Review", notCompleted: "Not completed",
      pdfDispatch: "PDF Dispatch", notDispatched: "Not dispatched", completion: "Completion", awaitingOutcome: "Awaiting outcome", auditTrail: "Audit Trail",
      noAudit: "No audit records found for this intent.", lifecycleActions: "Lifecycle Actions", confirmReadiness: "Confirm Readiness", dispatchPdf: "Dispatch PDF To Browser",
      failureReason: "Optional failure reason for a failed print...", markFailed: "Mark Failed", confirmPrinted: "Confirm Printed", cancelIntent: "Cancel Intent",
      printConfirmed: "Print confirmed by operator.", noFailureReason: "No reason recorded.", cancelled: "Intent cancelled before dispatch.", recordContext: "Record Context",
      template: "Template", version: "Version", product: "Product", popupBlocked: "The PDF tab could not be opened. Allow popups or use the Proof PDF action.",
    };

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

    const dispatched = await runAction("dispatch-pdf");
    if (dispatched && !openPdfDocument(buildTemplatePreviewFileUrl(intent.templateId, intent.versionId, intent.productId))) {
      setMessage(text.popupBlocked);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent/30" /></div>;
  }

  if (!intent) {
    return <EmptyState title={text.notFound} description={message || text.notFoundDescription} />;
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
              <button className="plms-button-secondary" onClick={() => {
                if (!openPdfDocument(buildTemplatePreviewFileUrl(intent.templateId, intent.versionId, intent.productId))) {
                  setMessage(text.popupBlocked);
                }
              }}>{text.proof}</button>
            </>
          }
        />

        {message ? <div className="rounded-lg border border-warn/20 bg-warn/10 p-4 text-sm font-medium text-warn">{message}</div> : null}

        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{text.status}</div>
            <div className="mt-3"><StatusBadge label={getPrintIntentStatusLabel(intent.status)} tone={getPrintIntentStatusTone(intent.status)} /></div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{text.requestedBy}</div>
            <div className="mt-3 text-lg font-medium text-ink">{intent.requestedBy}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{text.quantity}</div>
            <div className="mt-3 text-3xl font-medium text-ink">{intent.quantity}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="text-xs font-medium text-ink-3">{text.safety}</div>
            <div className="mt-3"><StatusBadge label={isSafe ? text.safe : text.attention} tone={isSafe ? "success" : "danger"} /></div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{text.safetyReadiness}</div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-line bg-raised p-5">
                  <div className="text-xs font-medium text-ink">{text.finalSafety}</div>
                  {safetyMessages.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm font-medium text-ink-2">
                      {safetyMessages.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                    </ul>
                  ) : <div className="mt-4 text-sm font-medium text-ink-2">{text.noSafetyWarnings}</div>}
                </div>
                <div className="rounded-xl border border-line bg-raised p-5">
                  <div className="text-xs font-medium text-ink">{text.readinessSnapshot}</div>
                  {readiness ? (
                    <div className="mt-4 space-y-2 text-sm font-medium text-ink-2">
                      {(readiness.errors || []).length > 0 ? (readiness.errors || []).map((item, index) => <div key={`${item}-${index}`}>{item}</div>) : null}
                      {(readiness.warnings || []).length > 0 ? (readiness.warnings || []).map((item, index) => <div key={`${item}-${index}`}>{item}</div>) : null}
                      {(readiness.errors || []).length === 0 && (readiness.warnings || []).length === 0 ? <div>{text.noReadinessIssues}</div> : null}
                    </div>
                  ) : <div className="mt-4 text-sm font-medium text-ink-2">{text.readinessUnavailable}</div>}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{text.operationalTimeline}</div>
              <div className="mt-5 space-y-3 text-sm font-medium text-ink-2">
                <div className="flex items-center justify-between rounded-lg border border-line bg-raised px-4 py-3"><span>{text.requested}</span><span className="text-ink">{formatDateTime(intent.createdAt)}</span></div>
                <div className="flex items-center justify-between rounded-lg border border-line bg-raised px-4 py-3"><span>{text.operatorReview}</span><span className="text-ink">{intent.operatorReviewedAt ? `${formatDateTime(intent.operatorReviewedAt)} · ${intent.operatorReviewedBy}` : text.notCompleted}</span></div>
                <div className="flex items-center justify-between rounded-lg border border-line bg-raised px-4 py-3"><span>{text.pdfDispatch}</span><span className="text-ink">{intent.dispatchedAt ? `${formatDateTime(intent.dispatchedAt)} · ${intent.dispatchedBy}` : text.notDispatched}</span></div>
                <div className="flex items-center justify-between rounded-lg border border-line bg-raised px-4 py-3"><span>{text.completion}</span><span className="text-ink">{intent.completedAt ? `${formatDateTime(intent.completedAt)} · ${intent.completedBy}` : text.awaitingOutcome}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{text.auditTrail}</div>
              {auditLogs.length === 0 ? (
                <div className="mt-5 text-sm font-medium text-ink-2">{text.noAudit}</div>
              ) : (
                <div className="mt-5 space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-line bg-raised p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium text-ink">{log.action}</div>
                        <div className="text-xs font-medium text-ink-3">{formatDateTime(log.timestamp)}</div>
                      </div>
                      <div className="mt-2 text-sm font-medium text-ink-2">{log.details}</div>
                      <div className="mt-3 text-xs font-medium text-accent">{log.userId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{text.lifecycleActions}</div>
              <div className="mt-5 space-y-3">
                {isPending ? (
                  <button className="plms-button-primary w-full" onClick={() => runAction("handoff")} disabled={submitting || !isSafe}>{text.confirmReadiness}</button>
                ) : null}
                {isReadyForPrint ? (
                  <button className="plms-button-primary w-full" onClick={dispatchPdf} disabled={submitting}>{text.dispatchPdf}</button>
                ) : null}
                {isSentToClient ? (
                  <>
                    <textarea className="plms-input min-h-28" placeholder={text.failureReason} value={failureReason} onChange={(event) => setFailureReason(event.target.value)} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <button className="rounded-lg bg-bad px-4 py-3 text-xs font-medium text-white" onClick={() => runAction("mark-failed")} disabled={submitting}>{text.markFailed}</button>
                      <button className="rounded-lg bg-good px-4 py-3 text-xs font-medium text-white" onClick={() => runAction("confirm-print")} disabled={submitting}>{text.confirmPrinted}</button>
                    </div>
                  </>
                ) : null}
                {(isPending || isReadyForPrint) ? (
                  <button className="plms-button-secondary w-full" onClick={() => runAction("cancel")} disabled={submitting}>{text.cancelIntent}</button>
                ) : null}
                {isTerminal ? (
                  <div className="rounded-lg border border-line bg-raised p-4 text-sm font-medium text-ink-2">
                    {intent.status === "UserPrinted" ? text.printConfirmed : intent.status === "Failed" ? `Print failed. ${intent.failureReason || text.noFailureReason}` : text.cancelled}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="text-xs font-medium text-ink-3">{text.recordContext}</div>
              <div className="mt-4 space-y-3 text-sm font-medium text-ink-2">
                <div className="flex items-center justify-between"><span>{text.template}</span><span className="text-ink">{intent.templateName}</span></div>
                <div className="flex items-center justify-between"><span>{text.version}</span><span className="text-ink">v{intent.versionNumber}</span></div>
                <div className="flex items-center justify-between"><span>{text.product}</span><span className="text-ink">{intent.productName}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
