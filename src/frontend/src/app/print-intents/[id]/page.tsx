"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { auditActionLabels } from "@/lib/dashboard-feed";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowSquareOut, Check, X } from "@phosphor-icons/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { openPdfDocument } from "@/lib/pdf-print";
import { buildTemplatePreviewFileUrl } from "@/lib/template-preview-url";
import { getPrintIntentStatusTone, normalizePrintIntentStatus } from "@/lib/print-intent-status";
import { PrintIntentDetailDto, PrintIntentStatus } from "@/types/operational";
import { AuditLogDto } from "@/types/audit";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

interface ReadinessSnapshot {
  status?: number;
  errors?: string[];
  warnings?: string[];
}

type StepState = "done" | "current" | "upcoming" | "failed" | "cancelled" | "skipped";

function StepMarker({ state, index }: { state: StepState; index: number }) {
  if (state === "done") {
    return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-ink-2"><Check size={16} /></span>;
  }
  if (state === "failed") {
    return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bad-soft text-bad"><X size={16} /></span>;
  }
  if (state === "cancelled") {
    return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-ink-3"><X size={16} /></span>;
  }
  if (state === "current") {
    return <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs text-accent-ink">{index + 1}</span>;
  }
  return <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-xs text-ink-3">{index + 1}</span>;
}

function Dot({ tone }: { tone: "bad" | "warn" | "good" | "neutral" }) {
  const color = { bad: "bg-bad", warn: "bg-warn", good: "bg-good", neutral: "bg-ink-3" }[tone];
  return <span aria-hidden className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />;
}

export default function PrintIntentDetailPage() {
  const { formatDateTime, locale } = useI18n();
  const params = useParams();
  const id = String(params.id);
  const text = locale === "tr"
    ? {
      back: "Baskı talepleri", proof: "Prova PDF'ini aç", notFound: "Baskı talebi bulunamadı", notFoundDescription: "Baskı talebi yüklenemedi.",
      loading: "Yükleniyor", version: "Sürüm", pieces: "{n} adet",
      steps: "Baskı adımları", requested: "Talep oluşturuldu", waiting: "Bekliyor",
      readyStep: "Baskıya hazır", readyHint: "Güvenlik kontrolünü ve hazırlığı onaylayın.", confirmReadiness: "Hazırlığı onayla",
      notSafeHint: "Güvenlik kontrolünde sorun var; önce giderilmeli.",
      sentStep: "PDF açıldı", sentHint: "PDF'i açın ve yazıcıda %100 ölçekle basın.", dispatchPdf: "PDF'i aç",
      outcomeStep: "Basıldı", outcomeHint: "Baskı bittiğinde sonucu kaydedin.", failureReasonLabel: "Hata nedeni (isteğe bağlı)",
      failureReason: "Örneğin: etiket kaydı, renk hatası", markFailed: "Hatalı olarak işaretle", confirmPrinted: "Basıldı olarak onayla", cancelIntent: "Talebi iptal et",
      printConfirmed: "Baskı operatör tarafından onaylandı.", failedPrefix: "Baskı hatalı.", noFailureReason: "Neden kaydedilmedi.", cancelled: "Talep, PDF açılmadan iptal edildi.",
      details: "Ayrıntılar", product: "Ürün", template: "Şablon", quantity: "Adet", requestedBy: "Talep eden", createdAt: "Oluşturulma",
      checks: "Kontroller", finalSafety: "Son güvenlik kontrolü", safe: "Güvenli", attention: "Dikkat", noSafetyWarnings: "Güvenlik uyarısı yok",
      readinessSnapshot: "Talep anındaki hazırlık", noReadinessIssues: "Kayıtlı hata veya uyarı yok", readinessUnavailable: "Hazırlık kaydı yok",
      auditTrail: "Denetim kaydı", noAudit: "Bu talep için denetim kaydı yok.",
      popupBlocked: "PDF sekmesi açılamadı. Tarayıcıda açılır pencerelere izin verin veya prova PDF'ini açın.",
      status: {
        Pending: "Bekliyor", ReadyForPrint: "Baskıya hazır", SentToClient: "PDF açıldı", UserPrinted: "Basıldı", Failed: "Hatalı", Cancelled: "İptal edildi",
      } as Record<PrintIntentStatus, string>,
    }
    : {
      back: "Print requests", proof: "Open proof PDF", notFound: "Print request not found", notFoundDescription: "The print request could not be loaded.",
      loading: "Loading", version: "Version", pieces: "{n} pcs",
      steps: "Print steps", requested: "Request created", waiting: "Waiting",
      readyStep: "Ready to print", readyHint: "Confirm the safety check and readiness.", confirmReadiness: "Confirm readiness",
      notSafeHint: "The safety check found a problem; fix it first.",
      sentStep: "PDF opened", sentHint: "Open the PDF and print it at 100% scale.", dispatchPdf: "Open PDF",
      outcomeStep: "Printed", outcomeHint: "Record the result when printing is done.", failureReasonLabel: "Failure reason (optional)",
      failureReason: "For example: label misregistration, color error", markFailed: "Mark as failed", confirmPrinted: "Confirm printed", cancelIntent: "Cancel request",
      printConfirmed: "Print confirmed by the operator.", failedPrefix: "Print failed.", noFailureReason: "No reason recorded.", cancelled: "Request cancelled before the PDF was opened.",
      details: "Details", product: "Product", template: "Template", quantity: "Quantity", requestedBy: "Requested by", createdAt: "Created",
      checks: "Checks", finalSafety: "Final safety check", safe: "Safe", attention: "Attention", noSafetyWarnings: "No safety warnings",
      readinessSnapshot: "Readiness at request time", noReadinessIssues: "No recorded errors or warnings", readinessUnavailable: "No readiness record",
      auditTrail: "Audit log", noAudit: "No audit records for this request.",
      popupBlocked: "The PDF tab could not be opened. Allow popups or use the proof PDF action.",
      status: {
        Pending: "Pending", ReadyForPrint: "Ready to print", SentToClient: "PDF opened", UserPrinted: "Printed", Failed: "Failed", Cancelled: "Cancelled",
      } as Record<PrintIntentStatus, string>,
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

  function openProof() {
    if (!intent) return;
    if (!openPdfDocument(buildTemplatePreviewFileUrl(intent.templateId, intent.versionId, intent.productId))) {
      setMessage(text.popupBlocked);
    }
  }

  if (loading && !intent) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-ink-2">
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        {text.loading}
      </div>
    );
  }

  if (!intent) {
    return (
      <EmptyState
        title={text.notFound}
        description={message || text.notFoundDescription}
        action={<Link href="/print-intents" className="plms-button-secondary">{text.back}</Link>}
      />
    );
  }

  const isPending = intent.status === "Pending";
  const isReadyForPrint = intent.status === "ReadyForPrint";
  const isSentToClient = intent.status === "SentToClient";
  const isCancelled = intent.status === "Cancelled";
  const safetyMessages = intent.safetyCheck?.messages || [];
  const isSafe = intent.safetyCheck?.isSafe ?? false;
  const statusTone = isCancelled ? "neutral" : getPrintIntentStatusTone(intent.status);
  const readinessErrors = readiness?.errors || [];
  const readinessWarnings = readiness?.warnings || [];

  const who = (date?: string, user?: string): ReactNode =>
    date ? (
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="tabular whitespace-nowrap font-mono text-xs">{formatDateTime(date)}</span>
        {user ? <span className="text-sm">{user}</span> : null}
      </span>
    ) : null;

  const passed = (statuses: PrintIntentStatus[]) => statuses.includes(intent.status);

  const cancelButton = (
    <button type="button" className="plms-button-danger" onClick={() => runAction("cancel")} disabled={submitting}>
      {text.cancelIntent}
    </button>
  );

  const steps: { title: string; meta: ReactNode; state: StepState; body?: ReactNode }[] = [
    {
      title: text.requested,
      meta: who(intent.createdAt, intent.requestedBy),
      state: "done",
    },
    {
      title: text.readyStep,
      meta: who(intent.operatorReviewedAt, intent.operatorReviewedBy),
      state: isPending ? "current" : passed(["ReadyForPrint", "SentToClient", "UserPrinted", "Failed"]) || intent.operatorReviewedAt ? "done" : "skipped",
      body: isPending ? (
        <>
          <p className="text-sm text-ink-2">{text.readyHint}</p>
          {!isSafe ? <p className="flex gap-2 text-sm text-bad"><Dot tone="bad" />{text.notSafeHint}</p> : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className="plms-button-primary" onClick={() => runAction("handoff")} disabled={submitting || !isSafe}>
              {text.confirmReadiness}
            </button>
            {cancelButton}
          </div>
        </>
      ) : undefined,
    },
    {
      title: text.sentStep,
      meta: who(intent.dispatchedAt, intent.dispatchedBy),
      state: isReadyForPrint ? "current" : passed(["SentToClient", "UserPrinted", "Failed"]) ? "done" : isCancelled ? "skipped" : "upcoming",
      body: isReadyForPrint ? (
        <>
          <p className="text-sm text-ink-2">{text.sentHint}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className="plms-button-primary" onClick={dispatchPdf} disabled={submitting}>
              <ArrowSquareOut size={16} />
              {text.dispatchPdf}
            </button>
            {cancelButton}
          </div>
        </>
      ) : undefined,
    },
    {
      title: intent.status === "UserPrinted" || intent.status === "Failed" || isCancelled ? text.status[intent.status] : text.outcomeStep,
      meta: who(intent.completedAt, intent.completedBy),
      state: isSentToClient
        ? "current"
        : intent.status === "UserPrinted"
          ? "done"
          : intent.status === "Failed"
            ? "failed"
            : isCancelled
              ? "cancelled"
              : "upcoming",
      body: isSentToClient ? (
        <>
          <p className="text-sm text-ink-2">{text.outcomeHint}</p>
          <div className="flex flex-col gap-1.5 pt-2">
            <label htmlFor="failure-reason" className="plms-label">{text.failureReasonLabel}</label>
            <textarea
              id="failure-reason"
              className="plms-input min-h-20"
              placeholder={text.failureReason}
              value={failureReason}
              onChange={(event) => setFailureReason(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className="plms-button-primary" onClick={() => runAction("confirm-print")} disabled={submitting}>
              {text.confirmPrinted}
            </button>
            <button type="button" className="plms-button-danger" onClick={() => runAction("mark-failed")} disabled={submitting}>
              {text.markFailed}
            </button>
          </div>
        </>
      ) : intent.status === "UserPrinted" ? (
        <p className="text-sm text-ink-2">{text.printConfirmed}</p>
      ) : intent.status === "Failed" ? (
        <p className="text-sm text-bad">{text.failedPrefix} {intent.failureReason || text.noFailureReason}</p>
      ) : isCancelled ? (
        <p className="text-sm text-ink-2">{text.cancelled}</p>
      ) : undefined,
    },
  ];

  return (
    <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
      <div className="flex flex-col gap-6 pb-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <Link href="/print-intents" className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink">
              <ArrowLeft size={16} />
              {text.back}
            </Link>
            <h1 className="text-xl font-medium text-ink">{intent.productName}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
              <span>{intent.templateName}</span>
              <span className="whitespace-nowrap font-mono text-xs text-ink-3">v{intent.versionNumber}</span>
              <span className="tabular whitespace-nowrap">{text.pieces.replace("{n}", String(intent.quantity))}</span>
              <StatusBadge label={text.status[intent.status]} tone={statusTone} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="plms-button-secondary" onClick={openProof}>
              <ArrowSquareOut size={16} />
              {text.proof}
            </button>
          </div>
        </header>

        {message ? <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{message}</p> : null}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-base font-medium text-ink">{text.steps}</h2>
              <ol className="mt-5 flex flex-col">
                {steps.map((step, index) => {
                  const muted = step.state === "upcoming" || step.state === "skipped";
                  return (
                    <li key={index} className="relative flex gap-4 pb-6 last:pb-0" aria-current={step.state === "current" ? "step" : undefined}>
                      {index < steps.length - 1 ? <span aria-hidden className="absolute bottom-1 left-3 top-7 w-px bg-line" /> : null}
                      <StepMarker state={step.state} index={index} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                          <h3 className={`text-base font-medium ${muted ? "text-ink-3" : "text-ink"}`}>{step.title}</h3>
                          {step.meta ? (
                            <span className="text-ink-3">{step.meta}</span>
                          ) : step.state === "upcoming" ? (
                            <span className="text-sm text-ink-3">{text.waiting}</span>
                          ) : null}
                        </div>
                        {step.body}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="rounded-xl border border-line bg-surface">
              <div className="flex items-baseline justify-between gap-3 px-5 py-4">
                <h2 className="text-base font-medium text-ink">{text.auditTrail}</h2>
                {auditLogs.length > 0 ? <span className="tabular font-mono text-xs text-ink-3">{auditLogs.length}</span> : null}
              </div>
              {auditLogs.length === 0 ? (
                <p className="border-t border-line px-5 py-4 text-sm text-ink-3">{text.noAudit}</p>
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {auditLogs.map((log) => (
                    <li key={log.id} className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div className="min-w-0">
                        <div className="text-base text-ink">{auditActionLabels[locale][log.action] ?? log.action}</div>
                        {log.details ? <div className="text-sm text-ink-2">{log.details}</div> : null}
                      </div>
                      <div className="flex shrink-0 flex-col gap-0.5 sm:items-end">
                        <span className="tabular whitespace-nowrap font-mono text-xs text-ink-3">{formatDateTime(log.timestamp)}</span>
                        <span className="text-sm text-ink-3">{log.userId}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-base font-medium text-ink">{text.details}</h2>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex items-baseline justify-between gap-3"><dt className="text-ink-3">{text.product}</dt><dd className="text-right text-ink">{intent.productName}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="text-ink-3">{text.template}</dt><dd className="text-right text-ink">{intent.templateName}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="text-ink-3">{text.version}</dt><dd className="font-mono text-xs text-ink">v{intent.versionNumber}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="text-ink-3">{text.quantity}</dt><dd className="tabular font-mono text-xs text-ink">{intent.quantity}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="text-ink-3">{text.requestedBy}</dt><dd className="truncate text-ink">{intent.requestedBy}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="text-ink-3">{text.createdAt}</dt><dd className="tabular whitespace-nowrap font-mono text-xs text-ink">{formatDateTime(intent.createdAt)}</dd></div>
              </dl>
            </section>

            <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
              <h2 className="text-base font-medium text-ink">{text.checks}</h2>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-ink-2">{text.finalSafety}</h3>
                  <StatusBadge label={isSafe ? text.safe : text.attention} tone={isSafe ? "success" : "danger"} />
                </div>
                <ul className="flex flex-col gap-1.5 text-sm text-ink-2">
                  {safetyMessages.length > 0
                    ? safetyMessages.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2.5"><Dot tone={isSafe ? "warn" : "bad"} />{item}</li>)
                    : <li className="text-ink-3">{text.noSafetyWarnings}</li>}
                </ul>
              </div>
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                <h3 className="text-sm font-medium text-ink-2">{text.readinessSnapshot}</h3>
                {readiness ? (
                  <ul className="flex flex-col gap-1.5 text-sm text-ink-2">
                    {readinessErrors.map((item, index) => <li key={`e-${item}-${index}`} className="flex gap-2.5"><Dot tone="bad" />{item}</li>)}
                    {readinessWarnings.map((item, index) => <li key={`w-${item}-${index}`} className="flex gap-2.5"><Dot tone="warn" />{item}</li>)}
                    {readinessErrors.length === 0 && readinessWarnings.length === 0 ? <li className="text-ink-3">{text.noReadinessIssues}</li> : null}
                  </ul>
                ) : <p className="text-sm text-ink-3">{text.readinessUnavailable}</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
