"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowCounterClockwise, Barcode, MagnifyingGlass, Printer, X } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LabelProof } from "@/components/ui/LabelProof";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PrintOutcomeDialog, type OutcomeTarget } from "@/components/Print/PrintOutcomeDialog";
import { ReprintDialog, type ReprintSource } from "@/components/Print/ReprintDialog";
import { apiFetch } from "@/lib/api-client";
import { useI18n, useText } from "@/lib/i18n";
import { openPendingTab } from "@/lib/pdf-print";
import { hasPermission, permissions } from "@/lib/permissions";
import { getPrintIntentStatusTone, normalizePrintIntentStatus } from "@/lib/print-intent-status";
import { buildPrintIntentPdfUrl, MAX_PRINT_COPIES, normalizeScan, parseQuantity, pickDefaultTemplate, printableTemplates } from "@/lib/print-station";
import { buildTemplatePreviewFileUrl } from "@/lib/template-preview-url";
import type { Product } from "@/types/product";
import type { PrintIntentDetailDto, PrintIntentDto, PrintIntentPage, ProductTemplateDto } from "@/types/operational";

type Notice = { tone: "bad" | "good" | "warn"; text: string } | null;

export default function PrintStationPage() {
    const text = useText("print");
    const { formatTime } = useI18n();
    const { data: session } = useSession();
    const userPermissions = ((session?.user as { permissions?: string[] } | undefined)?.permissions ?? []) as string[];
    const isAdmin = (((session?.user as { roles?: string[] } | undefined)?.roles) ?? []).includes("Admin");
    const can = (key: string) => isAdmin || hasPermission(userPermissions, key);
    const canPrint = can(permissions.printIntentsCreate) && can(permissions.printIntentsHandoff) && can(permissions.printIntentsDispatch);
    const canReprint = can(permissions.printIntentsReprint);
    const canRecord = can(permissions.printIntentsConfirm) && can(permissions.printIntentsFail);

    const searchRef = useRef<HTMLInputElement>(null);
    const quantityRef = useRef<HTMLInputElement>(null);

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [highlight, setHighlight] = useState(0);
    const [searching, setSearching] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);
    const [templates, setTemplates] = useState<ProductTemplateDto[]>([]);
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState("1");
    const [printing, setPrinting] = useState(false);
    const [notice, setNotice] = useState<Notice>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewState, setPreviewState] = useState<"idle" | "loading" | "failed">("idle");
    const [recent, setRecent] = useState<PrintIntentDto[]>([]);
    const [outcomeTarget, setOutcomeTarget] = useState<OutcomeTarget | null>(null);
    const [reprintSource, setReprintSource] = useState<ReprintSource | null>(null);

    const printable = useMemo(() => printableTemplates(templates), [templates]);
    const template = printable.find((item) => item.templateId === templateId) ?? null;
    const parsedQuantity = parseQuantity(quantity);

    const loadRecent = useCallback(async () => {
        const res = await apiFetch<PrintIntentPage>("/api/PrintIntents?mine=true&page=1&pageSize=8");
        if (res.success) setRecent(res.data.items);
    }, []);

    useEffect(() => {
        void loadRecent();
        searchRef.current?.focus();
    }, [loadRecent]);

    // Suggestions while typing; a scanner's Enter is handled separately with an exact SKU lookup.
    useEffect(() => {
        const term = normalizeScan(query);
        if (product || term.length < 2) {
            setSuggestions([]);
            return;
        }

        let cancelled = false;
        setSearching(true);
        const timer = window.setTimeout(async () => {
            const res = await apiFetch<{ items: Product[] }>(`/api/Products?search=${encodeURIComponent(term)}&active=true&page=1&pageSize=8`);
            if (cancelled) return;
            setSearching(false);
            setSuggestions(res.success ? res.data.items : []);
            setHighlight(0);
        }, 200);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [query, product]);

    // Label preview with the product's data (published version, no watermark).
    useEffect(() => {
        if (!product || !template?.publishedVersionId) {
            setPreviewUrl(null);
            setPreviewState("idle");
            return;
        }

        let objectUrl: string | null = null;
        let cancelled = false;
        setPreviewState("loading");
        fetch(buildTemplatePreviewFileUrl(template.templateId, template.publishedVersionId, product.id), { cache: "no-store" })
            .then(async (response) => {
                if (!response.ok) throw new Error(String(response.status));
                const blob = await response.blob();
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setPreviewUrl(objectUrl);
                setPreviewState("idle");
            })
            .catch(() => !cancelled && setPreviewState("failed"));

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [product, template]);

    async function selectProduct(next: Product) {
        setProduct(next);
        setQuery(next.sku);
        setSuggestions([]);
        setNotice(null);
        setQuantity("1");
        const res = await apiFetch<ProductTemplateDto[]>(`/api/Products/${next.id}/Templates`);
        const list = res.success ? res.data : [];
        setTemplates(list);
        setTemplateId(pickDefaultTemplate(list)?.templateId ?? null);
        window.setTimeout(() => quantityRef.current?.select(), 0);
    }

    function clear() {
        setProduct(null);
        setTemplates([]);
        setTemplateId(null);
        setQuery("");
        setQuantity("1");
        setSuggestions([]);
        searchRef.current?.focus();
    }

    async function handleSearchEnter() {
        const highlighted = suggestions[highlight];
        const term = normalizeScan(query);
        if (!term) return;

        // Scanners type the whole SKU and press Enter faster than suggestions arrive: try an exact match first.
        const exact = await apiFetch<Product>(`/api/Products/by-sku/${encodeURIComponent(term)}`);
        if (exact.success && exact.data.isActive) {
            await selectProduct(exact.data);
            return;
        }
        if (highlighted) {
            await selectProduct(highlighted);
            return;
        }
        setNotice({ tone: "warn", text: text.station.scanNotFound(term) });
    }

    async function print() {
        if (!product || !template || parsedQuantity == null || printing) return;
        setPrinting(true);
        setNotice(null);

        const tab = openPendingTab();
        const res = await apiFetch<PrintIntentDetailDto>("/api/PrintIntents/quick", {
            method: "POST",
            body: JSON.stringify({ productId: product.id, templateId: template.templateId, quantity: parsedQuantity }),
        });
        setPrinting(false);

        if (!res.success) {
            tab?.close();
            setNotice({ tone: "bad", text: res.error.message });
            return;
        }

        const opened = tab?.navigate(buildPrintIntentPdfUrl(res.data.id)) ?? false;
        if (!opened) setNotice({ tone: "warn", text: text.station.pdfBlocked });
        setOutcomeTarget({ id: res.data.id, quantity: res.data.quantity, productName: product.name });
        void loadRecent();
    }

    function onOutcomeRecorded(detail: PrintIntentDetailDto, outcome: "printed" | "failed") {
        setOutcomeTarget(null);
        setNotice(outcome === "printed"
            ? { tone: "good", text: text.outcome.savedPrinted(detail.quantity) }
            : { tone: "warn", text: text.outcome.savedFailed });
        void loadRecent();
        clear();
    }

    const noticeClass = notice?.tone === "bad" ? "bg-bad-soft text-bad" : notice?.tone === "good" ? "bg-good-soft text-good" : "bg-warn-soft text-warn";

    return (
        <PermissionGuard permissions={[permissions.printIntentsCreate]}>
            <div className="flex flex-col gap-6 pb-10">
                <PageHeader title={text.station.title} description={text.station.description} />

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5">
                        <div className="relative flex flex-col gap-1.5">
                            <label htmlFor="station-search" className="plms-label">{text.station.searchLabel}</label>
                            <div className="relative">
                                <Barcode size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                                <input
                                    id="station-search"
                                    ref={searchRef}
                                    className="plms-input h-12 pl-10 pr-10 text-md"
                                    placeholder={text.station.searchPlaceholder}
                                    autoComplete="off"
                                    value={query}
                                    disabled={!canPrint}
                                    onChange={(event) => {
                                        setQuery(event.target.value);
                                        if (product) {
                                            setProduct(null);
                                            setTemplates([]);
                                            setTemplateId(null);
                                        }
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            if (product) quantityRef.current?.select();
                                            else void handleSearchEnter();
                                        } else if (event.key === "Escape") {
                                            clear();
                                        } else if (event.key === "ArrowDown" && suggestions.length) {
                                            event.preventDefault();
                                            setHighlight((value) => Math.min(value + 1, suggestions.length - 1));
                                        } else if (event.key === "ArrowUp" && suggestions.length) {
                                            event.preventDefault();
                                            setHighlight((value) => Math.max(value - 1, 0));
                                        }
                                    }}
                                    role="combobox"
                                    aria-expanded={suggestions.length > 0}
                                    aria-controls="station-suggestions"
                                />
                                {query ? (
                                    <button type="button" className="plms-button-ghost absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 px-0" onClick={clear} aria-label={text.station.change}>
                                        <X size={16} />
                                    </button>
                                ) : null}
                            </div>

                            {suggestions.length > 0 && !product ? (
                                <ul id="station-suggestions" role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
                                    {suggestions.map((item, index) => (
                                        <li key={item.id} role="option" aria-selected={index === highlight}>
                                            <button
                                                type="button"
                                                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-base ${index === highlight ? "bg-raised" : "hover:bg-raised"}`}
                                                onMouseEnter={() => setHighlight(index)}
                                                onClick={() => void selectProduct(item)}
                                            >
                                                <span className="min-w-0 flex-1 truncate text-ink">{item.name}</span>
                                                <span className="font-mono text-xs text-ink-3">{item.sku}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                            {searching && !product && suggestions.length === 0 && normalizeScan(query).length >= 2 ? (
                                <p className="flex items-center gap-1.5 text-sm text-ink-3"><MagnifyingGlass size={14} />{text.station.searching}</p>
                            ) : null}
                        </div>

                        {product ? (
                            <div className="flex flex-col gap-5">
                                <div className="flex items-start justify-between gap-3 rounded-lg bg-raised px-4 py-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-md font-medium text-ink">{product.name}</div>
                                        <div className="font-mono text-xs text-ink-3">{product.sku}{product.categoryName ? ` · ${product.categoryName}` : ""}</div>
                                    </div>
                                    <button type="button" className="plms-button-ghost h-8" onClick={clear}>{text.station.change}</button>
                                </div>

                                {printable.length === 0 ? (
                                    <div className="flex flex-col gap-1 rounded-lg border border-dashed border-line-strong px-4 py-4">
                                        <p className="text-base text-ink">{text.station.noTemplates}</p>
                                        <p className="text-sm text-ink-2">{text.station.noTemplatesHint}</p>
                                        <Link href={`/products/${product.id}`} className="mt-1 self-start text-sm text-accent hover:underline">{product.name}</Link>
                                    </div>
                                ) : (
                                    <fieldset className="flex flex-col gap-1.5">
                                        <legend className="plms-label mb-1.5">{text.station.template}</legend>
                                        <div className="flex flex-col gap-1">
                                            {printable.map((item) => (
                                                <label
                                                    key={item.templateId}
                                                    className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${templateId === item.templateId ? "border-accent bg-accent-soft" : "border-line hover:bg-raised"}`}
                                                >
                                                    <input type="radio" name="station-template" className="accent-[rgb(var(--accent))]" checked={templateId === item.templateId} onChange={() => setTemplateId(item.templateId)} />
                                                    <span className="min-w-0 flex-1 truncate text-base text-ink">{item.templateName}</span>
                                                    {item.isDefault ? <span className="text-xs text-ink-3">{text.station.defaultTemplate}</span> : null}
                                                    <span className="tabular whitespace-nowrap font-mono text-xs text-ink-3">
                                                        {item.publishedVersionNumber ? text.station.version(item.publishedVersionNumber) : ""}
                                                        {item.widthMm && item.heightMm ? ` · ${text.station.sizeMm(item.widthMm, item.heightMm)}` : ""}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                )}

                                {printable.length > 0 ? (
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="station-quantity" className="plms-label">{text.station.quantity}</label>
                                            <input
                                                id="station-quantity"
                                                ref={quantityRef}
                                                inputMode="numeric"
                                                className="plms-input tabular h-12 w-36 text-md"
                                                value={quantity}
                                                aria-invalid={parsedQuantity == null}
                                                onChange={(event) => setQuantity(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        void print();
                                                    } else if (event.key === "Escape") {
                                                        clear();
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button type="button" className="plms-button-primary h-12 min-w-40 px-6 text-base" disabled={!canPrint || !template || parsedQuantity == null || printing} onClick={() => void print()}>
                                            <Printer size={18} />
                                            {printing ? text.station.printing : parsedQuantity ? `${text.station.print} · ${text.station.labels(parsedQuantity)}` : text.station.print}
                                        </button>
                                        <p className={`basis-full text-xs ${parsedQuantity == null ? "text-bad" : "text-ink-3"}`}>
                                            {parsedQuantity == null ? text.station.quantityHint(MAX_PRINT_COPIES) : text.station.keyboardHint}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <p className="text-sm text-ink-3">{text.station.keyboardHint}</p>
                        )}

                        {notice ? <p role="status" className={`rounded-lg px-3 py-2 text-sm ${noticeClass}`}>{notice.text}</p> : null}
                    </section>

                    <section className="flex flex-col rounded-xl border border-line bg-surface">
                        <div className="flex h-12 items-center border-b border-line px-5 text-base font-medium text-ink">{text.station.previewTitle}</div>
                        <div className="flex flex-1 items-center justify-center bg-sunken px-10 py-10">
                            {template?.widthMm && template?.heightMm && product ? (
                                <LabelProof widthMm={template.widthMm} heightMm={template.heightMm} caption={template.templateName} className="w-full max-w-[420px]">
                                    {previewUrl ? (
                                        <iframe title={text.station.previewTitle} src={`${previewUrl}#toolbar=0&navpanes=0&view=Fit`} className="h-full w-full border-0" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-ink-3">
                                            {previewState === "failed" ? text.station.previewFailed : text.station.previewLoading}
                                        </div>
                                    )}
                                </LabelProof>
                            ) : (
                                <Printer size={40} className="text-line-strong" aria-hidden />
                            )}
                        </div>
                    </section>
                </div>

                <section className="flex flex-col rounded-xl border border-line bg-surface">
                    <div className="flex h-12 items-center justify-between border-b border-line px-5">
                        <h2 className="text-base font-medium text-ink">{text.station.recentTitle}</h2>
                        <Link href="/print-intents" className="text-sm text-accent hover:underline">{text.station.history}</Link>
                    </div>
                    {recent.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-ink-3">{text.station.recentEmpty}</p>
                    ) : (
                        <ul className="divide-y divide-line">
                            {recent.map((item) => {
                                const status = normalizePrintIntentStatus(item.status);
                                return (
                                    <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5">
                                        <Link href={`/print-intents/${item.id}`} className="min-w-0 flex-1 hover:underline">
                                            <span className="block truncate text-base text-ink">{item.productName}</span>
                                            <span className="block font-mono text-xs text-ink-3">{item.productSku} · {item.templateName}</span>
                                        </Link>
                                        <span className="tabular w-20 text-right text-sm text-ink-2">{text.station.labels(item.quantity)}</span>
                                        <span className="w-36"><StatusBadge label={status} tone={getPrintIntentStatusTone(status)} /></span>
                                        <time className="tabular w-12 font-mono text-xs text-ink-3">{formatTime(item.createdAt, { hour: "2-digit", minute: "2-digit" })}</time>
                                        <span className="flex w-32 justify-end">
                                            {status === "SentToClient" && canRecord ? (
                                                <button type="button" className="plms-button-compact" onClick={() => setOutcomeTarget({ id: item.id, quantity: item.quantity, productName: item.productName })}>
                                                    {text.station.enterOutcome}
                                                </button>
                                            ) : (status === "UserPrinted" || status === "Failed") && canReprint ? (
                                                <button
                                                    type="button"
                                                    className="plms-button-compact"
                                                    onClick={() => setReprintSource({ id: item.id, quantity: item.quantity, productName: item.productName, hasPrintedPayload: item.hasPrintedPayload })}
                                                >
                                                    <ArrowCounterClockwise size={14} />
                                                    {text.station.reprint}
                                                </button>
                                            ) : null}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <PrintOutcomeDialog target={outcomeTarget} onClose={() => { setOutcomeTarget(null); void loadRecent(); searchRef.current?.focus(); }} onRecorded={onOutcomeRecorded} />
                <ReprintDialog
                    source={reprintSource}
                    onClose={() => setReprintSource(null)}
                    onStarted={(reprint, opened) => {
                        setReprintSource(null);
                        if (!opened) setNotice({ tone: "warn", text: text.station.pdfBlocked });
                        setOutcomeTarget({ id: reprint.id, quantity: reprint.quantity, productName: reprint.productName });
                        void loadRecent();
                    }}
                />
            </div>
        </PermissionGuard>
    );
}
