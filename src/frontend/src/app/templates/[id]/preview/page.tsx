"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowSquareOut, DownloadSimple, Printer } from "@phosphor-icons/react";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { openPdfDocument } from "@/lib/pdf-print";
import { normalizeTemplateStatus } from "@/lib/template-status";
import { buildTemplatePreviewDownloadUrl, buildTemplatePreviewFileUrl } from "@/lib/template-preview-url";
import { Product } from "@/types/product";
import { useI18n, useText } from "@/lib/i18n";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { LabelProof } from "@/components/ui/LabelProof";
import { EmptyState } from "@/components/ui/EmptyState";
import { checkIssueText, type CheckIssue } from "@/lib/backend-text";

interface VariableResolutionDetail {
    name: string;
    status: number; // 0=Resolved, 1=Missing, 2=Unsupported
    resolvedValue?: string;
}

interface TemplatePreviewMetadata {
    templateId: string;
    templateName: string;
    templateCode: string;
    versionId: string;
    versionNumber: number;
    status: string;
    createdAt: string;
    createdBy: string;
    submittedForReviewAt?: string;
    submittedForReviewBy?: string;
    reviewedAt?: string;
    reviewedBy?: string;
    publishedAt?: string;
    publishedBy?: string;
    warnings: string[];
    /** The same warnings as codes (barcode checks and readiness warnings). */
    warningIssues?: CheckIssue[];
    requiredVariables: string[];
    hasProductContext: boolean;
    productName?: string;
    productSku?: string;
    pageWidthMm: number;
    pageHeightMm: number;
    orientation: "portrait" | "landscape";
    readinessStatus: number; // 0=Ready, 1=Warning, 2=Blocked
    readinessErrors: string[];
    /** The same findings as codes; translated here instead of matching the English text. */
    readinessIssues?: CheckIssue[];
    variableDetails: VariableResolutionDetail[];
}

const templateStatusTone: Record<string, StatusTone> = {
    Published: "success",
    Approved: "success",
    InReview: "info",
    Draft: "warning",
    Rejected: "danger",
    Archived: "neutral",
    Deprecated: "neutral",
};

/** Findings the server reports while no product is chosen; that is the normal start state, not an error. */
const productDependentCodes = ["product_missing", "variable_missing"];

/** Tallest the label preview may get on screen, in px; wide labels use the full column width. */
const PREVIEW_MAX_HEIGHT = 520;

function Dot({ tone }: { tone: "bad" | "warn" | "good" | "neutral" }) {
    const color = { bad: "bg-bad", warn: "bg-warn", good: "bg-good", neutral: "bg-ink-3" }[tone];
    return <span aria-hidden className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />;
}

export default function TemplatePreviewPage() {
    const { formatDateTime, translateLabel, locale } = useI18n();
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const versionId = searchParams.get("versionId");
    const initialProductId = searchParams.get("productId");

    const [metadata, setMetadata] = useState<TemplatePreviewMetadata | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState(initialProductId || "");
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [creatingIntent, setCreatingIntent] = useState(false);
    const [pdfStatus, setPdfStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);
    const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
    const [pdfReloadKey, setPdfReloadKey] = useState(0);

    const text = useText("templateDetail").preview;

    function localizeReadinessIssue(issue: CheckIssue) {
        if (issue.code === "version_not_printable") {
            return text.versionStateBlocked(translateLabel(normalizeTemplateStatus(issue.params.status ?? "")));
        }
        return checkIssueText(locale, issue);
    }


    useEffect(() => {
        setSelectedProductId(initialProductId || "");
    }, [initialProductId]);

    const previewFileUrl = useMemo(() => {
        if (!id || !versionId) return null;
        return buildTemplatePreviewFileUrl(String(id), versionId, selectedProductId || undefined);
    }, [id, versionId, selectedProductId]);

    const downloadPdfUrl = useMemo(() => {
        if (!id || !versionId) return null;
        return buildTemplatePreviewDownloadUrl(String(id), versionId, selectedProductId || undefined);
    }, [id, versionId, selectedProductId]);

    useEffect(() => {
        if (!id || !versionId) return;

        const load = async () => {
            try {
                setLoading(true);
                const query = selectedProductId ? `?productId=${selectedProductId}` : "";
                const [metadataRes, productsRes] = await Promise.all([
                    apiFetch<TemplatePreviewMetadata>(`/api/Templates/${id}/versions/${versionId}/preview-metadata${query}`),
                    apiFetch<Product[]>(`/api/Products`)
                ]);

                if (metadataRes.success && metadataRes.data) {
                    setMetadata({
                        ...metadataRes.data,
                        status: normalizeTemplateStatus(metadataRes.data.status),
                    });
                } else {
                    setMetadata(null);
                    setActionMessage(metadataRes.success ? text.metadataLoadError : metadataRes.error.message);
                }

                if (productsRes.success && Array.isArray(productsRes.data)) {
                    setProducts(productsRes.data.filter((product) => product.isActive));
                }
            } catch (err) {
                console.error("Failed to load preview metadata", err);
                setActionMessage((err as Error).message || text.loadPreviewFailed);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id, versionId, selectedProductId]);

    useEffect(() => {
        if (!previewFileUrl) return;
        const previewUrl = previewFileUrl;

        const controller = new AbortController();
        let nextObjectUrl: string | null = null;

        async function loadPdf() {
            setPdfStatus("loading");
            setPdfErrorMessage(null);

            try {
                const response = await fetch(previewUrl, {
                    method: "GET",
                    cache: "no-store",
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(body || text.pdfRenderError);
                }

                const blob = await response.blob();
                nextObjectUrl = URL.createObjectURL(blob);
                setPdfObjectUrl((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return nextObjectUrl;
                });
                setPdfStatus("ready");
            } catch (error) {
                if (controller.signal.aborted) return;
                setPdfObjectUrl((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return null;
                });
                setPdfStatus("error");
                setPdfErrorMessage((error as Error).message || text.pdfRenderError);
            }
        }

        loadPdf();

        return () => {
            controller.abort();
            if (nextObjectUrl) {
                URL.revokeObjectURL(nextObjectUrl);
            }
        };
    }, [previewFileUrl, pdfReloadKey]);

    const handleCreateIntent = async () => {
        if (!metadata) return;

        if (!selectedProductId) {
            setActionMessage(text.selectProduct);
            return;
        }

        if (metadata.status !== "Published" && metadata.status !== "Approved") {
            setActionMessage(text.statusNotAllowed);
            return;
        }

        if (metadata.readinessStatus === 2) {
            setActionMessage(text.readinessBlocked);
            return;
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            setActionMessage(text.quantityInvalid);
            return;
        }

        try {
            setCreatingIntent(true);
            const res = await apiFetch<{ id: string }>(`/api/PrintIntents`, {
                method: 'POST',
                body: JSON.stringify({
                    productId: selectedProductId,
                    templateId: id,
                    versionId: versionId,
                    quantity
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.success) {
                router.push(`/print-intents/${res.data.id}`);
            } else {
                setActionMessage(text.createIntentFailed(res.error.message));
            }
        } catch (err) {
            console.error("Error creating print intent", err);
            setActionMessage((err as Error).message || text.createIntentError);
        } finally {
            setCreatingIntent(false);
        }
    };

    function handleRetryPdf() {
        setPdfReloadKey((current) => current + 1);
    }

    function handleDownloadPdf() {
        if (!downloadPdfUrl) return;
        window.open(downloadPdfUrl, "_blank");
    }

    function handlePrintPdf() {
        if (!openPdfDocument(previewFileUrl)) {
            setActionMessage(text.allowPopups);
        }
    }

    if (loading && !metadata) return (
        <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-ink-2">
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
            {text.loading}
        </div>
    );

    if (!metadata) return (
        <EmptyState
            title={text.metadataContextLoss}
            description={actionMessage || text.metadataContextLossDescription}
            action={<Link href="/templates" className="plms-button-secondary">{text.backToTemplates}</Link>}
        />
    );

    const isBlocked = metadata.readinessStatus === 2;
    const hasWarnings = metadata.readinessStatus === 1 || metadata.warnings.length > 0;
    const canCreateIntent = (metadata.status === "Published" || metadata.status === "Approved") && !!selectedProductId && !isBlocked && quantity > 0;
    const hasProduct = !!selectedProductId;
    // Without a product the server reports the missing product and every unfilled field; those are the start state.
    const readinessIssues = (metadata.readinessIssues ?? []).filter((issue) => issue.severity === "error");
    const visibleErrors = readinessIssues
        .filter((issue) => hasProduct || !productDependentCodes.includes(issue.code))
        .map(localizeReadinessIssue);
    const localizedWarnings = (metadata.warningIssues ?? []).map(localizeReadinessIssue);
    const localizedOrientation = metadata.orientation === "landscape" ? text.landscape : text.portrait;

    const readinessState: { label: string; tone: StatusTone } = visibleErrors.length > 0 || (hasProduct && isBlocked)
        ? { label: text.readinessBlockedLabel, tone: "danger" }
        : !hasProduct
            ? { label: text.readinessIdle, tone: "neutral" }
            : hasWarnings
                ? { label: text.readinessWarningLabel, tone: "warning" }
                : { label: text.readinessReadyLabel, tone: "success" };

    const governanceSnapshot = (() => {
        if (metadata.status === "Published" && metadata.publishedBy && metadata.publishedAt) {
            return {
                actorLabel: text.publishedBy,
                actor: metadata.publishedBy,
                timestamp: metadata.publishedAt,
            };
        }

        if (metadata.status === "Approved" && metadata.reviewedBy && metadata.reviewedAt) {
            return {
                actorLabel: text.reviewedBy,
                actor: metadata.reviewedBy,
                timestamp: metadata.reviewedAt,
            };
        }

        if (metadata.status === "InReview" && metadata.submittedForReviewBy && metadata.submittedForReviewAt) {
            return {
                actorLabel: text.submittedBy,
                actor: metadata.submittedForReviewBy,
                timestamp: metadata.submittedForReviewAt,
            };
        }

        return {
            actorLabel: text.draftOwner,
            actor: metadata.createdBy,
            timestamp: metadata.createdAt,
        };
    })();

    // Size the proof to the label: full column width, but never taller than PREVIEW_MAX_HEIGHT.
    const widthMm = metadata.pageWidthMm || 1;
    const heightMm = metadata.pageHeightMm || 1;
    const proofMaxWidth = Math.round((PREVIEW_MAX_HEIGHT * widthMm) / heightMm);

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="flex flex-col gap-6 pb-10">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-1">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink"
                        >
                            <ArrowLeft size={16} />
                            {text.back}
                        </button>
                        <h1 className="text-xl font-medium text-ink">{metadata.templateName}</h1>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
                            <span className="whitespace-nowrap font-mono text-sm text-ink-3">{metadata.templateCode}</span>
                            <span className="tabular whitespace-nowrap">{text.version} {metadata.versionNumber}</span>
                            <StatusBadge label={metadata.status} tone={templateStatusTone[metadata.status] ?? "neutral"} />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={handleDownloadPdf} disabled={!downloadPdfUrl} className="plms-button-secondary">
                            <DownloadSimple size={16} />
                            {text.downloadPdf}
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateIntent}
                            disabled={!canCreateIntent || creatingIntent}
                            className="plms-button-primary"
                        >
                            <Printer size={16} />
                            {creatingIntent ? text.creatingIntent : text.createPrintIntent}
                        </button>
                    </div>
                </header>

                {actionMessage ? (
                    <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{actionMessage}</p>
                ) : null}

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                    <aside className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
                        <section className="flex flex-col gap-4 p-5">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="preview-product" className="plms-label">{text.product}</label>
                                <select
                                    id="preview-product"
                                    className="plms-select w-full"
                                    value={selectedProductId}
                                    onChange={(event) => {
                                        setSelectedProductId(event.target.value);
                                        setActionMessage(null);
                                    }}
                                >
                                    <option value="">{text.selectProductOption}</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.sku} - {product.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-sm text-ink-3">
                                    {metadata.hasProductContext ? text.previewWithProduct : text.previewWithoutProduct}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="preview-quantity" className="plms-label">{text.quantity}</label>
                                <input
                                    id="preview-quantity"
                                    className="plms-input tabular w-32"
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={(event) => {
                                        setQuantity(Math.max(1, Number(event.target.value) || 1));
                                        setActionMessage(null);
                                    }}
                                />
                            </div>
                        </section>

                        <section className="flex flex-col gap-3 p-5">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-base font-medium text-ink">{text.readiness}</h2>
                                <StatusBadge label={readinessState.label} tone={readinessState.tone} />
                            </div>
                            <ul className="flex flex-col gap-2 text-sm text-ink-2">
                                {!hasProduct ? (
                                    <li className="flex gap-2.5"><Dot tone="neutral" />{text.selectProductToValidate}</li>
                                ) : null}
                                {visibleErrors.map((message, index) => (
                                    <li key={`error-${index}`} className="flex gap-2.5 text-ink"><Dot tone="bad" />{message}</li>
                                ))}
                                {hasProduct && !isBlocked && hasWarnings ? (
                                    localizedWarnings.length > 0
                                        ? localizedWarnings.map((warning, index) => (
                                            <li key={`warning-${index}`} className="flex gap-2.5"><Dot tone="warn" />{warning}</li>
                                        ))
                                        : <li className="flex gap-2.5"><Dot tone="warn" />{text.warningsGeneric}</li>
                                ) : null}
                                {hasProduct && !isBlocked && !hasWarnings && visibleErrors.length === 0 ? (
                                    <li className="flex gap-2.5"><Dot tone="good" />{text.allResolved}</li>
                                ) : null}
                            </ul>
                        </section>

                        <section className="flex flex-col gap-2 p-5">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-base font-medium text-ink">{text.variables}</h2>
                                {metadata.variableDetails.length > 0 ? (
                                    <span className="tabular font-mono text-xs text-ink-3">{metadata.variableDetails.length}</span>
                                ) : null}
                            </div>
                            {metadata.variableDetails.length === 0 ? (
                                <p className="text-sm text-ink-3">{text.noVariables}</p>
                            ) : (
                                <ul className="flex flex-col">
                                    {metadata.variableDetails.map((variable) => (
                                        <li key={variable.name} className="flex min-h-8 items-center justify-between gap-3 text-sm">
                                            <span className="truncate font-mono text-xs text-ink-2">{`{{${variable.name}}}`}</span>
                                            {variable.status === 0 ? (
                                                <span className="truncate text-ink" title={variable.resolvedValue}>{variable.resolvedValue}</span>
                                            ) : !hasProduct ? (
                                                <span className="text-ink-3">—</span>
                                            ) : (
                                                <span className="inline-flex shrink-0 items-center gap-1.5 text-bad">
                                                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-bad" />
                                                    {variable.status === 2 ? text.unsupported : text.missing}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="flex flex-col gap-2 p-5">
                            <h2 className="text-base font-medium text-ink">{text.printSetup}</h2>
                            <ul className="flex flex-col gap-1 text-sm text-ink-2">
                                <li>{text.printGuideScale}</li>
                                <li>{text.printGuidePaper}</li>
                                <li>{text.printGuideViewer}</li>
                            </ul>
                        </section>

                        <section className="flex flex-col gap-2 p-5">
                            <h2 className="text-base font-medium text-ink">{text.record}</h2>
                            <dl className="flex flex-col gap-1.5 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-ink-3">{governanceSnapshot.actorLabel}</dt>
                                    <dd className="truncate text-ink">{governanceSnapshot.actor}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-ink-3">{text.timestamp}</dt>
                                    <dd className="tabular whitespace-nowrap font-mono text-xs text-ink-2">{formatDateTime(governanceSnapshot.timestamp)}</dd>
                                </div>
                            </dl>
                        </section>
                    </aside>

                    <section className="flex min-w-0 flex-col rounded-xl max-lg:order-first lg:sticky lg:top-20 border border-line bg-surface">
                        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                            <h2 className="text-base font-medium text-ink">{text.preview}</h2>
                            <button
                                type="button"
                                onClick={handlePrintPdf}
                                disabled={pdfStatus !== "ready"}
                                className="plms-button-ghost -mr-2.5 h-8 px-2.5"
                            >
                                <ArrowSquareOut size={16} />
                                {text.openInTab}
                            </button>
                        </div>

                        <div className="flex flex-1 items-center justify-center rounded-b-xl bg-sunken px-10 py-12">
                            {pdfStatus === "error" ? (
                                <div className="flex max-w-md flex-col items-center gap-2 text-center">
                                    <h3 className="text-md font-medium text-ink">{text.pdfCouldNotRender}</h3>
                                    <p className="text-sm text-ink-2">{pdfErrorMessage || text.unusablePdf}</p>
                                    <div className="flex items-center gap-2 pt-2">
                                        <button type="button" className="plms-button-secondary" onClick={handleRetryPdf}>{text.retry}</button>
                                        <button type="button" className="plms-button-ghost" onClick={handleDownloadPdf} disabled={!downloadPdfUrl}>{text.downloadPdf}</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full" style={{ maxWidth: proofMaxWidth }}>
                                    <LabelProof widthMm={metadata.pageWidthMm} heightMm={metadata.pageHeightMm} caption={localizedOrientation}>
                                        {pdfStatus === "ready" && pdfObjectUrl ? (
                                            <iframe
                                                src={`${pdfObjectUrl}#toolbar=0&navpanes=0&view=Fit`}
                                                className="h-full w-full border-0"
                                                title={text.iframeTitle}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center gap-3 text-sm text-ink-3">
                                                {pdfStatus === "loading" ? (
                                                    <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
                                                ) : null}
                                                {pdfStatus === "loading" ? text.loadingPdfPreview : text.awaitingPdf}
                                            </div>
                                        )}
                                    </LabelProof>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </RoleGuard>
    );
}
