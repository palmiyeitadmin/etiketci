"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { normalizeTemplateStatus } from "@/lib/template-status";
import { buildTemplatePreviewDownloadUrl, buildTemplatePreviewFileUrl } from "@/lib/template-preview-url";
import { Product } from "@/types/product";
import { useI18n } from "@/lib/i18n";

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
    requiredVariables: string[];
    hasProductContext: boolean;
    productName?: string;
    productSku?: string;
    readinessStatus: number; // 0=Ready, 1=Warning, 2=Blocked
    readinessErrors: string[];
    variableDetails: VariableResolutionDetail[];
}

export default function TemplatePreviewPage() {
    const { locale, formatDateTime, translateLabel } = useI18n();
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

    const text = locale === "tr"
        ? {
            metadataLoadError: "Onizleme metadata bilgisi yuklenemedi.",
            loadPreviewFailed: "Onizleme metadata bilgisi yuklenemedi.",
            pdfRenderError: "PDF onizlemesi olusturulamadi.",
            selectProduct: "Print intent olusturmak icin bir urun secin.",
            statusNotAllowed: "Yalnizca onayli veya yayindaki sablon surumleri baski talebi icin kullanilabilir.",
            readinessBlocked: "Baski talebi olusturmadan once hazirlik engellerini giderin.",
            quantityInvalid: "Miktar sifirdan buyuk olmalidir.",
            createIntentFailed: "Baski talebi olusturulamadi: {message}",
            createIntentError: "Baski talebi olusturulurken hata olustu.",
            allowPopups: "Yazdirma penceresini acmak icin popup izni verin.",
            printHint: "PDF yuklendiginde yazdirma penceresi otomatik acilmaya calisacak.",
            print: "Yazdir",
            loadingEngine: "PDF Motoru Hazirlaniyor",
            metadataContextLoss: "Metadata baglami kayboldu.",
            version: "Surum",
            productionBlocked: "Uretim Engelli",
            readyWithWarnings: "Uyarilar Var",
            readinessPass: "Uretime Hazir",
            downloadPdf: "PDF Indir",
            creatingIntent: "Baski Talebi Olusturuluyor...",
            createPrintIntent: "Baski Talebi Olustur",
            masterDiagnostic: "Ana Teshis",
            critical: "KRITIK",
            caution: "DIKKAT",
            verified: "DOGRULANDI",
            visualArtifacts: "Gorsel artifaktlar veya kritik olmayan eksik veriler tespit edildi.",
            layoutPass: "Layout motoru uretim degiskenleri icin %100 cozumleme raporluyor.",
            operationalContext: "Operasyonel Baglam",
            selectProductContext: "Urun baglami secin",
            quantity: "Miktar",
            productContextActive: "Urun baglami aktif. Onizleme ve baski talebi secilen urunu kullanacak.",
            selectProductToValidate: "Hazirlik durumunu dogrulamak ve baski talebi acmak icin bir urun secin.",
            previewAllowed: "Surum durumu {status}. Onizlemeye izin verilir, ancak baski talebi icin onayli veya yayindaki surum gerekir.",
            targetProduct: "Hedef Urun",
            noProductContext: "Aktif urun baglami yok",
            placeholdersRemain: "Degiskenler placeholder durumunda kalacak.",
            variableResolution: "Degisken Cozumleme",
            variablesFound: "{count} degisken",
            noVariables: "DEGISKEN YOK",
            staticLayout: "Statik yerlesim - Tanimli degisken yok.",
            resolved: "Cozuldu",
            missing: "Eksik",
            unsupported: "Desteklenmiyor",
            governanceSnapshot: "Yonetişim Ozeti",
            status: "Durum",
            actor: "Kaydi Olusturan",
            timestamp: "Kayit Zamani",
            draftOwner: "Taslagi olusturan",
            submittedBy: "Incelemeye gonderen",
            reviewedBy: "Inceleyen",
            publishedBy: "Yayina alan",
            loadingPdfPreview: "PDF onizlemesi yukleniyor",
            previewFailure: "Onizleme hatasi",
            pdfCouldNotRender: "PDF onizlemesi olusturulamadi.",
            retry: "Tekrar Dene",
            unusablePdf: "Onizleme servisi kullanilabilir bir PDF donmedi.",
            productionPdfStream: "Uretim PDF Akisi",
            awaitingPdf: "PDF akis yaniti bekleniyor...",
            missingProductContext: "Urun baglami eksik. Baski talebi icin belirli bir urun secilmesi gerekir.",
            versionStateBlocked: "Surum durumu {status}. Baski talebi icin yalnizca onayli veya yayindaki surumler kullanilabilir.",
            missingVariable: "Gerekli veri eksik: {name}",
            unsupportedVariable: "Desteklenmeyen degisken yer tutucusu: {name}",
            unlinkedProduct: "Secilen urun katalogda bu sablona acikca bagli degil.",
            barcodeWarning: "{name} barkod tipi PDF cikisinda tam desteklenmeyebilir.",
        }
        : {
            metadataLoadError: "Preview metadata could not be loaded.",
            loadPreviewFailed: "Failed to load preview metadata.",
            pdfRenderError: "PDF preview could not be rendered.",
            selectProduct: "Select a product to create a print intent.",
            statusNotAllowed: "Only approved or published template versions can be used for print intent creation.",
            readinessBlocked: "Resolve readiness blockers before creating a print intent.",
            quantityInvalid: "Quantity must be greater than zero.",
            createIntentFailed: "Failed to create print intent: {message}",
            createIntentError: "Error creating print intent.",
            allowPopups: "Allow popups to open the print dialog.",
            printHint: "When the PDF loads, the print dialog will try to open automatically.",
            print: "Print",
            loadingEngine: "Rendering PDF Engine",
            metadataContextLoss: "Metadata context loss.",
            version: "Version",
            productionBlocked: "Production Blocked",
            readyWithWarnings: "Warnings Present",
            readinessPass: "Ready for Production",
            downloadPdf: "Download PDF",
            creatingIntent: "Creating Intent...",
            createPrintIntent: "Create Print Intent",
            masterDiagnostic: "Master Diagnostic",
            critical: "CRITICAL",
            caution: "CAUTION",
            verified: "VERIFIED",
            visualArtifacts: "Visual artifacts or missing non-critical data detected.",
            layoutPass: "Layout engine reports 100% resolution for production variables.",
            operationalContext: "Operational Context",
            selectProductContext: "Select product context",
            quantity: "Quantity",
            productContextActive: "Product context is active. Preview and print intent will use the selected product.",
            selectProductToValidate: "Select a product to validate readiness and enable print intent creation.",
            previewAllowed: "Version status is {status}. Preview is allowed, but print intent creation requires an Approved or Published version.",
            targetProduct: "Target Product",
            noProductContext: "No Active Product Context",
            placeholdersRemain: "Variables will remain in placeholder state.",
            variableResolution: "Variable Resolution",
            variablesFound: "{count} variables",
            noVariables: "NO VARIABLES",
            staticLayout: "Static layout - No variables defined.",
            resolved: "Resolved",
            missing: "Missing",
            unsupported: "Unsupported",
            governanceSnapshot: "Governance Snapshot",
            status: "Status",
            actor: "Created By",
            timestamp: "Recorded At",
            draftOwner: "Draft Owner",
            submittedBy: "Submitted By",
            reviewedBy: "Reviewed By",
            publishedBy: "Published By",
            loadingPdfPreview: "Loading PDF preview",
            previewFailure: "Preview failure",
            pdfCouldNotRender: "PDF preview could not be rendered.",
            retry: "Retry",
            unusablePdf: "The preview service did not return a usable PDF.",
            productionPdfStream: "Production PDF Stream",
            awaitingPdf: "Awaiting PDF stream response...",
            missingProductContext: "Product context is missing. A specific product is required for print intent creation.",
            versionStateBlocked: "Version status is {status}. Only approved or published versions can be used for print intent creation.",
            missingVariable: "Required data is missing for: {name}",
            unsupportedVariable: "Unsupported variable placeholder: {name}",
            unlinkedProduct: "The selected product is not explicitly linked to this template in the catalog.",
            barcodeWarning: "Barcode type {name} may not render correctly in PDF output.",
        };

    function localizeReadinessMessage(message: string) {
        const statusMatch = message.match(/^Template version is in '([^']+)' state\. Only Approved or Published versions can be used for print intents\.$/i);
        if (statusMatch) {
            return text.versionStateBlocked.replace("{status}", translateLabel(normalizeTemplateStatus(statusMatch[1])));
        }

        if (/^Product context is missing\. Print intents require a specific product\.$/i.test(message)) {
            return text.missingProductContext;
        }

        const missingVariableMatch = message.match(/^Missing required data for variable: (.+)$/i);
        if (missingVariableMatch) {
            return text.missingVariable.replace("{name}", missingVariableMatch[1]);
        }

        const unsupportedVariableMatch = message.match(/^Unsupported variable placeholder: (.+)$/i);
        if (unsupportedVariableMatch) {
            return text.unsupportedVariable.replace("{name}", unsupportedVariableMatch[1]);
        }

        if (/^Product is not explicitly linked to this template in the catalog\.$/i.test(message)) {
            return text.unlinkedProduct;
        }

        const barcodeWarningMatch = message.match(/^Barcode type '([^']+)' may not render correctly in PDF \(only CODE_128 is fully supported\)\.$/i);
        if (barcodeWarningMatch) {
            return text.barcodeWarning.replace("{name}", barcodeWarningMatch[1]);
        }

        return message;
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
                setActionMessage(text.createIntentFailed.replace("{message}", res.error.message));
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
        const printSource = pdfObjectUrl || previewFileUrl;
        if (!printSource) return;

        const printWindow = window.open("", "plms-preview-print", "popup=yes,width=980,height=760");
        if (!printWindow) {
            setActionMessage(text.allowPopups);
            return;
        }

        const escapedUrl = JSON.stringify(printSource);
        printWindow.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>PLMS Print Preview</title>
              <style>
                body { margin: 0; font-family: Arial, sans-serif; background: #0f172a; color: #fff; }
                .toolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #111827; border-bottom: 1px solid rgba(255,255,255,0.08); }
                .hint { font-size: 12px; color: rgba(255,255,255,0.72); }
                button { border: 0; border-radius: 999px; padding: 10px 14px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: white; background: #2563eb; cursor: pointer; }
                iframe { width: 100%; height: calc(100vh - 58px); border: 0; background: white; }
              </style>
            </head>
            <body>
              <div class="toolbar">
                <div class="hint">${text.printHint}</div>
                <button onclick="triggerPrint()">${text.print}</button>
              </div>
              <iframe id="pdf-frame" src=${escapedUrl} title="PLMS PDF Preview"></iframe>
              <script>
                const frame = document.getElementById('pdf-frame');
                function triggerPrint() {
                  try {
                    if (frame && frame.contentWindow) {
                      frame.contentWindow.focus();
                      frame.contentWindow.print();
                      return;
                    }
                  } catch (error) {}
                  window.focus();
                  window.print();
                }
                frame.addEventListener('load', function () {
                  setTimeout(triggerPrint, 700);
                });
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
    }

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-4"></div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">{text.loadingEngine}</div>
            </div>
        </div>
    );

    if (!metadata) return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">{text.metadataContextLoss}</div>;

    const isBlocked = metadata.readinessStatus === 2;
    const hasWarnings = metadata.readinessStatus === 1 || metadata.warnings.length > 0;
    const canCreateIntent = (metadata.status === "Published" || metadata.status === "Approved") && !!selectedProductId && !isBlocked && quantity > 0;
    const localizedStatus = translateLabel(metadata.status);
    const localizedErrors = metadata.readinessErrors.map(localizeReadinessMessage);
    const localizedWarnings = metadata.warnings.map(localizeReadinessMessage);

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

    return (
        <RoleGuard allowedRoles={["Admin", "Operator", "Reviewer", "Viewer"]}>
            <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
                {/* Enterprise Header */}
                <div className="bg-slate-900 text-white border-b border-white/5 px-8 h-20 flex justify-between items-center shrink-0 shadow-2xl z-10">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all group"
                        >
                            <span className="text-white/50 group-hover:text-white transition-colors">←</span>
                        </button>
                        <div className="border-l border-white/10 pl-6">
                            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">{metadata.templateName}</h1>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">{metadata.templateCode}</span>
                                <span className="text-white/20 text-[10px]">|</span>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{text.version} {metadata.versionNumber}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] flex items-center space-x-2 ${
                            isBlocked ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                            hasWarnings ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                            "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isBlocked ? "bg-red-500" : hasWarnings ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                            <span>{isBlocked ? text.productionBlocked : hasWarnings ? text.readyWithWarnings : text.readinessPass}</span>
                        </div>

                        <div className="h-8 w-px bg-white/10 mx-2"></div>

                        <button
                            onClick={handlePrintPdf}
                            disabled={pdfStatus !== "ready"}
                            className="bg-white/5 text-white/70 px-4 py-2.5 rounded font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/10"
                        >
                            {text.print}
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={!downloadPdfUrl}
                            className="bg-white/5 text-white/70 px-4 py-2.5 rounded font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {text.downloadPdf}
                        </button>
                        <button
                            onClick={handleCreateIntent}
                            disabled={!canCreateIntent || creatingIntent}
                            className={`px-6 py-2.5 rounded font-black text-[11px] uppercase tracking-widest transition-all shadow-lg ${
                                !canCreateIntent || creatingIntent
                                ? "bg-slate-700 text-slate-500 cursor-not-allowed border border-white/5" 
                                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/40"
                            }`}
                        >
                            {creatingIntent ? text.creatingIntent : text.createPrintIntent}
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Industrial Sidebar */}
                    <div className="w-[400px] bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar shadow-inner select-none flex flex-col">
                        
                        {/* Status Guard Section */}
                        <div className={`p-8 border-b-2 flex flex-col space-y-4 ${
                            isBlocked ? "bg-red-50/50 border-red-100" :
                            hasWarnings ? "bg-amber-50/50 border-amber-100" :
                            "bg-emerald-50/50 border-emerald-100"
                        }`}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{text.masterDiagnostic}</h3>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                                    isBlocked ? "text-red-700 border-red-200 bg-red-100" :
                                    hasWarnings ? "text-amber-700 border-amber-200 bg-amber-100" :
                                    "text-emerald-700 border-emerald-200 bg-emerald-100"
                                }`}>
                                    {isBlocked ? text.critical : hasWarnings ? text.caution : text.verified}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {isBlocked && localizedErrors.map((err, i) => (
                                    <div key={i} className="flex space-x-3 items-start p-3 bg-red-100/50 rounded-lg border border-red-100">
                                        <span className="text-red-600 text-xs">✕</span>
                                        <p className="text-[11px] font-bold text-red-900 leading-tight">{err}</p>
                                    </div>
                                ))}
                                {!isBlocked && hasWarnings && (
                                    localizedWarnings.length > 0 ? localizedWarnings.map((warning, i) => (
                                        <div key={i} className="flex space-x-3 items-start p-3 bg-amber-100/50 rounded-lg border border-amber-100">
                                            <span className="text-amber-600 text-xs">!</span>
                                            <p className="text-[11px] font-bold text-amber-900 leading-tight">{warning}</p>
                                        </div>
                                    )) : (
                                        <div className="flex space-x-3 items-start p-3 bg-amber-100/50 rounded-lg border border-amber-100">
                                            <span className="text-amber-600 text-xs">!</span>
                                            <p className="text-[11px] font-bold text-amber-900 leading-tight">{text.visualArtifacts}</p>
                                        </div>
                                    )
                                )}
                                {!isBlocked && !hasWarnings && (
                                    <p className="text-[11px] font-medium text-emerald-800 italic">{text.layoutPass}</p>
                                )}
                            </div>
                        </div>

                        {/* Attribute Groups */}
                        <div className="p-8 space-y-10">
                            
                            {/* Product Context */}
                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
                                    {text.operationalContext}
                                </h4>
                                <div className="space-y-3">
                                    <select
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none"
                                        value={selectedProductId}
                                        onChange={(event) => {
                                            setSelectedProductId(event.target.value);
                                            setActionMessage(null);
                                        }}
                                    >
                                        <option value="">{text.selectProductContext}</option>
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.sku} - {product.name}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none"
                                        type="number"
                                        min={1}
                                        value={quantity}
                                        onChange={(event) => {
                                            setQuantity(Math.max(1, Number(event.target.value) || 1));
                                            setActionMessage(null);
                                        }}
                                        placeholder={text.quantity}
                                    />
                                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-[11px] font-medium text-slate-500">
                                        {(metadata.status === "Published" || metadata.status === "Approved")
                                            ? selectedProductId
                                                ? text.productContextActive
                                                : text.selectProductToValidate
                                            : text.previewAllowed.replace("{status}", localizedStatus)}
                                      </div>
                                    {actionMessage ? (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-900">
                                            {actionMessage}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="mt-4">
                                {metadata.hasProductContext ? (
                                    <div className="bg-slate-900 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                                        <div className="absolute right-[-10px] top-[-10px] font-black text-4xl text-white/5 italic select-none">DATA</div>
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{text.targetProduct}</div>
                                        <div className="text-lg font-black text-white uppercase tracking-tighter leading-tight">{metadata.productName}</div>
                                        <div className="mt-2 flex items-center space-x-2">
                                            <span className="text-[10px] font-mono text-white/40 tracking-widest">SKU_REF:</span>
                                            <span className="text-[10px] font-mono text-emerald-400 font-bold">{metadata.productSku}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{text.noProductContext}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{text.placeholdersRemain}</p>
                                    </div>
                                )}
                                </div>
                            </section>

                            {/* Variable Resolution */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                                        {text.variableResolution}
                                    </h4>
                                    <span className="text-[9px] font-black text-slate-300">
                                        {metadata.variableDetails.length > 0
                                            ? text.variablesFound.replace("{count}", String(metadata.variableDetails.length))
                                            : text.noVariables}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {metadata.variableDetails.length === 0 ? (
                                        <div className="text-[11px] text-slate-400 italic font-medium p-4 bg-slate-50 rounded-lg">{text.staticLayout}</div>
                                    ) : (
                                        metadata.variableDetails.map(varDetail => (
                                            <div key={varDetail.name} className={`p-3 rounded-lg border transition-all ${
                                                varDetail.status === 0 ? "bg-white border-slate-200 hover:border-emerald-200" :
                                                "bg-red-50 border-red-100"
                                            }`}>
                                                <div className="flex items-start justify-between mb-1.5">
                                                    <span className="font-mono text-[10px] font-black text-slate-900">{"{{"}{varDetail.name}{"}}"}</span>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                                                        varDetail.status === 0 ? "text-emerald-700 border-emerald-100 bg-emerald-50" :
                                                        "text-red-700 border-red-100 bg-red-100"
                                                    }`}>
                                                        {varDetail.status === 0 ? text.resolved : varDetail.status === 2 ? text.unsupported : text.missing}
                                                    </span>
                                                </div>
                                                {varDetail.status === 0 ? (
                                                    <div className="text-[10px] font-bold text-slate-500 bg-slate-50 p-2 rounded truncate border border-slate-100">
                                                        {varDetail.resolvedValue}
                                                    </div>
                                                ) : (
                                                    <div className="text-[9px] font-black text-red-600 uppercase tracking-widest italic decoration-red-300 decoration-wavy underline">
                                                        {varDetail.status === 2 ? text.unsupported : text.missing}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>

                            {/* System Governance */}
                            <section className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4">{text.governanceSnapshot}</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{text.status}</span>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                            metadata.status === 'Published' || metadata.status === 'Approved' ? 'bg-emerald-900 text-white' : 'bg-slate-200 text-slate-600'
                                          }`}>
                                            {localizedStatus}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="font-bold text-slate-500 uppercase">{governanceSnapshot.actorLabel}</span>
                                        <span className="font-black text-slate-900">{governanceSnapshot.actor}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="font-bold text-slate-500 uppercase">{text.timestamp}</span>
                                        <span className="font-black text-slate-900">{formatDateTime(governanceSnapshot.timestamp)}</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* PDF Engine Canvas */}
                    <div className="flex-1 bg-slate-200 relative overflow-hidden flex items-center justify-center p-12">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                        {pdfStatus === "loading" ? (
                            <div className="flex w-full max-w-5xl flex-col items-center justify-center rounded-sm border border-slate-300 bg-white/80 p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)]">
                                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-700" />
                                <div className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{text.loadingPdfPreview}</div>
                            </div>
                        ) : null}

                        {pdfStatus === "error" ? (
                            <div className="w-full max-w-3xl rounded-[2rem] border border-red-200 bg-white p-10 text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)]">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-500">{text.previewFailure}</div>
                                <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-900">{text.pdfCouldNotRender}</h3>
                                <p className="mt-3 text-sm font-medium text-slate-500">{pdfErrorMessage || text.unusablePdf}</p>
                                <div className="mt-6 flex items-center justify-center gap-3">
                                    <button className="plms-button-secondary" onClick={handleRetryPdf}>{text.retry}</button>
                                    <button className="plms-button-secondary" onClick={handleDownloadPdf} disabled={!downloadPdfUrl}>{text.downloadPdf}</button>
                                </div>
                            </div>
                        ) : null}

                        {pdfStatus === "ready" && pdfObjectUrl ? (
                            <div className="w-full max-w-5xl h-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] bg-white rounded-sm overflow-hidden border border-slate-400">
                                <iframe
                                    src={pdfObjectUrl}
                                    className="w-full h-full"
                                    title={text.productionPdfStream}
                                />
                            </div>
                        ) : null}

                        {pdfStatus === "idle" ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <div className="w-64 h-80 bg-slate-300 rounded-lg mb-6 shadow-inner"></div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{text.awaitingPdf}</div>
                            </div>
                        ) : null}

                        {/* Zoom/Floating Controls could go here */}
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}

