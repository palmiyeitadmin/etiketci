"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api-client";
import { openPdfDocument } from "@/lib/pdf-print";
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
    pageWidthMm: number;
    pageHeightMm: number;
    orientation: "portrait" | "landscape";
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
            metadataLoadError: "Önizleme metadata bilgisi yüklenemedi.",
            loadPreviewFailed: "Önizleme metadata bilgisi yüklenemedi.",
            pdfRenderError: "PDF önizlemesi oluşturulamadı.",
            selectProduct: "Baskı talebi oluşturmak için bir ürün seçin.",
            statusNotAllowed: "Yalnızca onaylı veya yayındaki şablon sürümleri baskı talebi için kullanılabilir.",
            readinessBlocked: "Baskı talebi oluşturmadan önce hazırlık engellerini giderin.",
            quantityInvalid: "Miktar sıfırdan büyük olmalıdır.",
            createIntentFailed: "Baskı talebi oluşturulamadı: {message}",
            createIntentError: "Baskı talebi oluşturulurken hata oluştu.",
            allowPopups: "PDF sekmesini açmak için popup izni verin.",
            print: "Yazdır",
            loadingEngine: "PDF Motoru Hazırlanıyor",
            metadataContextLoss: "Şablon bilgileri yüklenemedi.",
            version: "Sürüm",
            productionBlocked: "Üretim Engelli",
            readyWithWarnings: "Uyarılar Var",
            readinessPass: "Üretime Hazır",
            downloadPdf: "PDF İndir",
            creatingIntent: "Baskı Talebi Oluşturuluyor...",
            createPrintIntent: "Baskı Talebi Oluştur",
            masterDiagnostic: "Hazırlık kontrolü",
            critical: "KRİTİK",
            caution: "DİKKAT",
            verified: "DOĞRULANDI",
            visualArtifacts: "Görsel artifaktlar veya kritik olmayan eksik veriler tespit edildi.",
            layoutPass: "Tüm değişkenler ürün verisiyle dolduruldu.",
            operationalContext: "Operasyonel Bağlam",
            selectProductContext: "Ürün bağlamı seçin",
            quantity: "Miktar",
            productContextActive: "Ürün bağlamı aktif. Önizleme ve baskı talebi seçilen ürünü kullanacak.",
            selectProductToValidate: "Hazırlık durumunu doğrulamak ve baskı talebi açmak için bir ürün seçin.",
            previewAllowed: "Sürüm durumu {status}. Önizlemeye izin verilir, ancak baskı talebi için onaylı veya yayındaki sürüm gerekir.",
            targetProduct: "Hedef Ürün",
            noProductContext: "Aktif ürün bağlamı yok",
            placeholdersRemain: "Değişkenler placeholder durumunda kalacak.",
            variableResolution: "Değişken Çözümleme",
            variablesFound: "{count} değişken",
            noVariables: "DEĞİŞKEN YOK",
            staticLayout: "Statik yerleşim - Tanımlı değişken yok.",
            resolved: "Çözüldü",
            missing: "Eksik",
            unsupported: "Desteklenmiyor",
            governanceSnapshot: "Yonetişim Özeti",
            status: "Durum",
            actor: "Kaydı Oluşturan",
            timestamp: "Kayıt Zamanı",
            draftOwner: "Taslağı oluşturan",
            submittedBy: "İncelemeye gönderen",
            reviewedBy: "İnceleyen",
            publishedBy: "Yayına alan",
            loadingPdfPreview: "PDF önizlemesi yükleniyor",
            previewFailure: "Önizleme hatası",
            pdfCouldNotRender: "PDF önizlemesi oluşturulamadı.",
            retry: "Tekrar Dene",
            unusablePdf: "Önizleme servisi kullanılabilir bir PDF dönmedi.",
            productionPdfStream: "Üretim PDF Akışı",
            awaitingPdf: "PDF akış yanıtı bekleniyor...",
            printSetup: "Yazdırma Kurulumu",
            stockSize: "Etiket Boyutu",
            orientation: "Yön",
            landscape: "Yatay",
            portrait: "Dikey",
            printGuideTitle: "Yazdırma Notları",
            printGuideScale: "Yazdırırken ölçek 100% / Gerçek boyut olmalı.",
            printGuidePaper: "Kağıt boyutu şablon boyutuyla aynı olmalı.",
            printGuideViewer: "Yazdırma doğrudan PDF sekmesinden yapılır; iframe wrapper kullanılmaz.",
            missingProductContext: "Ürün bağlamı eksik. Baskı talebi için belirli bir ürün seçilmesi gerekir.",
            versionStateBlocked: "Sürüm durumu {status}. Baskı talebi için yalnızca onaylı veya yayındaki sürümler kullanılabilir.",
            missingVariable: "Gerekli veri eksik: {name}",
            unsupportedVariable: "Desteklenmeyen değişken yer tutucusu: {name}",
            unlinkedProduct: "Seçilen ürün katalogda bu şablona açıkça bağlı değil.",
            barcodeWarning: "{name} barkod tipi PDF çıkışında tam desteklenmeyebilir.",
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
            allowPopups: "Allow popups to open the PDF tab.",
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
            printSetup: "Print Setup",
            stockSize: "Label Stock",
            orientation: "Orientation",
            landscape: "Landscape",
            portrait: "Portrait",
            printGuideTitle: "Print Notes",
            printGuideScale: "Use 100% / Actual size when printing.",
            printGuidePaper: "Paper size must match the template stock exactly.",
            printGuideViewer: "Printing now opens the real PDF document instead of an iframe wrapper.",
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
        if (!openPdfDocument(previewFileUrl)) {
            setActionMessage(text.allowPopups);
        }
    }

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-surface text-ink">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-good/30 mb-4"></div>
                <div className="text-xs font-medium text-good">{text.loadingEngine}</div>
            </div>
        </div>
    );

    if (!metadata) return <div className="p-8 text-center text-ink-3 font-medium">{text.metadataContextLoss}</div>;

    const isBlocked = metadata.readinessStatus === 2;
    const hasWarnings = metadata.readinessStatus === 1 || metadata.warnings.length > 0;
    const canCreateIntent = (metadata.status === "Published" || metadata.status === "Approved") && !!selectedProductId && !isBlocked && quantity > 0;
    const localizedStatus = translateLabel(metadata.status);
    const localizedErrors = metadata.readinessErrors.map(localizeReadinessMessage);
    const localizedWarnings = metadata.warnings.map(localizeReadinessMessage);
    const localizedOrientation = metadata.orientation === "landscape" ? text.landscape : text.portrait;

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
            <div className="h-screen flex flex-col bg-raised overflow-hidden">
                {/* Enterprise Header */}
                <div className="bg-surface text-ink border-b border-line px-8 h-20 flex justify-between items-center shrink-0 shadow-pop z-10">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-raised hover:bg-raised transition-colors group"
                        >
                            <span className="text-ink-2 group-hover:text-ink transition-colors">←</span>
                        </button>
                        <div className="border-l border-line pl-6">
                            <h1 className="text-xl font-medium leading-none">{metadata.templateName}</h1>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs font-mono text-good font-medium">{metadata.templateCode}</span>
                                <span className="text-ink-2 text-xs">|</span>
                                <span className="text-xs font-medium text-ink-2">{text.version} {metadata.versionNumber}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center space-x-2 ${
                            isBlocked ? "bg-bad/20 text-bad border border-bad/30" :
                            hasWarnings ? "bg-warn/20 text-warn border border-warn/30" :
                            "bg-good/20 text-good border border-good/30"
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isBlocked ? "bg-bad" : hasWarnings ? "bg-warn" : "bg-good"}`}></span>
                            <span>{isBlocked ? text.productionBlocked : hasWarnings ? text.readyWithWarnings : text.readinessPass}</span>
                        </div>

                        <div className="h-8 w-px bg-raised mx-2"></div>

                        <button
                            onClick={handlePrintPdf}
                            disabled={pdfStatus !== "ready"}
                            className="bg-raised text-ink-2 px-4 py-2.5 rounded font-medium text-xs hover:bg-raised hover:text-ink transition-colors border border-line"
                        >
                            {text.print}
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={!downloadPdfUrl}
                            className="bg-raised text-ink-2 px-4 py-2.5 rounded font-medium text-xs hover:bg-raised hover:text-ink transition-colors border border-line disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {text.downloadPdf}
                        </button>
                        <button
                            onClick={handleCreateIntent}
                            disabled={!canCreateIntent || creatingIntent}
                            className={`px-6 py-2.5 rounded font-medium text-xs transition-colors shadow-pop ${
                                !canCreateIntent || creatingIntent
                                ? "bg-raised text-ink-3 cursor-not-allowed border border-line" 
                                : "bg-good text-white hover:bg-good"
                            }`}
                        >
                            {creatingIntent ? text.creatingIntent : text.createPrintIntent}
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Industrial Sidebar */}
                    <div className="w-[400px] bg-white border-r border-line overflow-y-auto custom-scrollbar select-none flex flex-col">
                        
                        {/* Status Guard Section */}
                        <div className={`p-8 border-b-2 flex flex-col space-y-4 ${
                            isBlocked ? "bg-bad/50 border-bad/30" :
                            hasWarnings ? "bg-warn/50 border-warn/30" :
                            "bg-good/50 border-good/30"
                        }`}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-medium text-ink-2">{text.masterDiagnostic}</h3>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                                    isBlocked ? "text-bad border-bad/30 bg-bad-soft" :
                                    hasWarnings ? "text-warn border-warn/30 bg-warn-soft" :
                                    "text-good border-good/30 bg-good-soft"
                                }`}>
                                    {isBlocked ? text.critical : hasWarnings ? text.caution : text.verified}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {isBlocked && localizedErrors.map((err, i) => (
                                    <div key={i} className="flex space-x-3 items-start p-3 bg-bad/50 rounded-lg border border-bad/30">
                                        <span className="text-bad text-xs">✕</span>
                                        <p className="text-xs font-medium text-bad leading-tight">{err}</p>
                                    </div>
                                ))}
                                {!isBlocked && hasWarnings && (
                                    localizedWarnings.length > 0 ? localizedWarnings.map((warning, i) => (
                                        <div key={i} className="flex space-x-3 items-start p-3 bg-warn/50 rounded-lg border border-warn/30">
                                            <span className="text-warn text-xs">!</span>
                                            <p className="text-xs font-medium text-warn leading-tight">{warning}</p>
                                        </div>
                                    )) : (
                                        <div className="flex space-x-3 items-start p-3 bg-warn/50 rounded-lg border border-warn/30">
                                            <span className="text-warn text-xs">!</span>
                                            <p className="text-xs font-medium text-warn leading-tight">{text.visualArtifacts}</p>
                                        </div>
                                    )
                                )}
                                {!isBlocked && !hasWarnings && (
                                    <p className="text-xs font-medium text-good">{text.layoutPass}</p>
                                )}
                            </div>
                        </div>

                        {/* Attribute Groups */}
                        <div className="p-8 space-y-10">
                            
                            {/* Product Context */}
                            <section>
                                <h4 className="text-xs font-medium text-ink-2 mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent mr-2"></span>
                                    {text.operationalContext}
                                </h4>
                                <div className="space-y-3">
                                    <select
                                        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink outline-none"
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
                                        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink outline-none"
                                        type="number"
                                        min={1}
                                        value={quantity}
                                        onChange={(event) => {
                                            setQuantity(Math.max(1, Number(event.target.value) || 1));
                                            setActionMessage(null);
                                        }}
                                        placeholder={text.quantity}
                                    />
                            <div className="rounded-lg border border-line bg-white px-4 py-3 text-xs font-medium text-ink-3">
                                        {(metadata.status === "Published" || metadata.status === "Approved")
                                            ? selectedProductId
                                                ? text.productContextActive
                                                : text.selectProductToValidate
                                            : text.previewAllowed.replace("{status}", localizedStatus)}
                                      </div>
                                    {actionMessage ? (
                                        <div className="rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-xs font-medium text-warn">
                                            {actionMessage}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="mt-4">
                                {metadata.hasProductContext ? (
                                    <div className="bg-surface rounded-xl p-5 shadow-pop relative overflow-hidden group">
                                        <div className="absolute right-[-10px] top-[-10px] font-medium text-4xl text-ink-2 select-none">DATA</div>
                                        <div className="text-xs font-medium text-accent mb-1">{text.targetProduct}</div>
                                        <div className="text-lg font-medium text-ink leading-tight">{metadata.productName}</div>
                                        <div className="mt-2 flex items-center space-x-2">
                                            <span className="text-xs font-mono text-ink-2">SKU_REF:</span>
                                            <span className="text-xs font-mono text-good font-medium">{metadata.productSku}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-5 border-2 border-dashed border-line rounded-xl bg-raised text-center">
                                        <p className="text-xs font-medium text-ink-2">{text.noProductContext}</p>
                                        <p className="text-xs text-ink-2 mt-1">{text.placeholdersRemain}</p>
                                    </div>
                                )}
                                </div>
                            </section>

                            <section>
                                <h4 className="text-xs font-medium text-ink-2 mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-line mr-2"></span>
                                    {text.printSetup}
                                </h4>
                                <div className="space-y-3">
                                    <div className="rounded-xl border border-line bg-white p-4">
                                        <div className="flex items-center justify-between text-xs font-medium text-ink-3">
                                            <span>{text.stockSize}</span>
                                            <span className="font-mono text-ink">
                                                {metadata.pageWidthMm} x {metadata.pageHeightMm} mm
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-xs font-medium text-ink-3">
                                            <span>{text.orientation}</span>
                                            <span className="font-medium text-ink">{localizedOrientation}</span>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-accent/30 bg-accent-soft p-4 text-xs font-medium text-accent">
                                        <div className="text-xs font-medium text-accent">{text.printGuideTitle}</div>
                                        <ul className="mt-3 space-y-2 list-disc pl-4">
                                            <li>{text.printGuideScale}</li>
                                            <li>{text.printGuidePaper}</li>
                                            <li>{text.printGuideViewer}</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            {/* Variable Resolution */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-medium text-ink-2 flex items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-good mr-2"></span>
                                        {text.variableResolution}
                                    </h4>
                                    <span className="text-xs font-medium text-ink-2">
                                        {metadata.variableDetails.length > 0
                                            ? text.variablesFound.replace("{count}", String(metadata.variableDetails.length))
                                            : text.noVariables}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {metadata.variableDetails.length === 0 ? (
                                        <div className="text-xs text-ink-2 font-medium p-4 bg-raised rounded-lg">{text.staticLayout}</div>
                                    ) : (
                                        metadata.variableDetails.map(varDetail => (
                                            <div key={varDetail.name} className={`p-3 rounded-lg border transition-colors ${
                                                varDetail.status === 0 ? "bg-white border-line hover:border-good/30" :
                                                "bg-bad-soft border-bad/30"
                                            }`}>
                                                <div className="flex items-start justify-between mb-1.5">
                                                    <span className="font-mono text-xs font-medium text-ink">{"{{"}{varDetail.name}{"}}"}</span>
                                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${
                                                        varDetail.status === 0 ? "text-good border-good/30 bg-good-soft" :
                                                        "text-bad border-bad/30 bg-bad-soft"
                                                    }`}>
                                                        {varDetail.status === 0 ? text.resolved : varDetail.status === 2 ? text.unsupported : text.missing}
                                                    </span>
                                                </div>
                                                {varDetail.status === 0 ? (
                                                    <div className="text-xs font-medium text-ink-3 bg-raised p-2 rounded truncate border border-line">
                                                        {varDetail.resolvedValue}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs font-medium text-bad decoration-red-300 decoration-wavy underline">
                                                        {varDetail.status === 2 ? text.unsupported : text.missing}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>

                            {/* System Governance */}
                            <section className="bg-raised rounded-xl p-6 border border-line">
                                <h4 className="text-xs font-medium text-ink-2 mb-4">{text.governanceSnapshot}</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-ink-3">{text.status}</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                            metadata.status === 'Published' || metadata.status === 'Approved' ? 'bg-good text-white' : 'bg-line text-ink-3'
                                          }`}>
                                            {localizedStatus}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-ink-3">{governanceSnapshot.actorLabel}</span>
                                        <span className="font-medium text-ink">{governanceSnapshot.actor}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-ink-3">{text.timestamp}</span>
                                        <span className="font-medium text-ink">{formatDateTime(governanceSnapshot.timestamp)}</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* PDF Engine Canvas */}
                    <div className="flex-1 bg-line relative overflow-hidden flex items-center justify-center p-12">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                        {pdfStatus === "loading" ? (
                            <div className="flex w-full max-w-5xl flex-col items-center justify-center rounded-sm border border-line bg-raised p-12">
                                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-line" />
                                <div className="mt-6 text-xs font-medium text-ink-3">{text.loadingPdfPreview}</div>
                            </div>
                        ) : null}

                        {pdfStatus === "error" ? (
                            <div className="w-full max-w-3xl rounded-xl border border-bad/30 bg-white p-10 text-center">
                                <div className="text-xs font-medium text-bad">{text.previewFailure}</div>
                                <h3 className="mt-3 text-2xl font-medium text-ink">{text.pdfCouldNotRender}</h3>
                                <p className="mt-3 text-sm font-medium text-ink-3">{pdfErrorMessage || text.unusablePdf}</p>
                                <div className="mt-6 flex items-center justify-center gap-3">
                                    <button className="plms-button-secondary" onClick={handleRetryPdf}>{text.retry}</button>
                                    <button className="plms-button-secondary" onClick={handleDownloadPdf} disabled={!downloadPdfUrl}>{text.downloadPdf}</button>
                                </div>
                            </div>
                        ) : null}

                        {pdfStatus === "ready" && pdfObjectUrl ? (
                            <div className="w-full max-w-5xl h-full bg-white rounded-sm overflow-hidden border border-line">
                                <iframe
                                    src={pdfObjectUrl}
                                    className="w-full h-full"
                                    title={text.productionPdfStream}
                                />
                            </div>
                        ) : null}

                        {pdfStatus === "idle" ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <div className="w-64 h-80 bg-line rounded-lg mb-6"></div>
                                <div className="text-xs font-medium text-ink-2">{text.awaitingPdf}</div>
                            </div>
                        ) : null}

                        {/* Zoom/Floating Controls could go here */}
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}

