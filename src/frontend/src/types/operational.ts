export type PrintIntentStatus =
    | "Pending"
    | "ReadyForPrint"
    | "SentToClient"
    | "UserPrinted"
    | "Failed"
    | "Cancelled";

export interface ProductTemplateDto {
    id: string;
    productId: string;
    productName: string;
    templateId: string;
    templateName: string;
    templateCode: string;
    isDefault: boolean;
    isActive: boolean;
    /** The template's published version; only published versions can be printed. */
    publishedVersionId?: string | null;
    publishedVersionNumber?: number | null;
    widthMm?: number | null;
    heightMm?: number | null;
}

export type PrintFailureCategory = "paper_jam" | "color" | "alignment" | "barcode" | "wrong_data" | "printer_error" | "other";
export type ReprintReason = "damaged" | "lost" | "extra" | "other";

export interface PrintIntentDto {
    id: string;
    productId: string;
    productName: string;
    templateId: string;
    templateName: string;
    versionId: string;
    versionNumber: number;
    quantity: number;
    status: PrintIntentStatus;
    requestedBy: string;
    createdAt: string;
    readinessSnapshot?: string;
    operatorReviewedAt?: string;
    operatorReviewedBy?: string;
    dispatchedAt?: string;
    dispatchedBy?: string;
    completedAt?: string;
    completedBy?: string;
    failureReason?: string;
    productSku?: string;
    templateCode?: string;
    hasPrintedPayload?: boolean;
    reprintOfId?: string | null;
    reprintReason?: ReprintReason | null;
    reprintNote?: string | null;
    failureCategory?: PrintFailureCategory | null;
    printedQuantity?: number | null;
    channel?: "station" | null;
}

export interface PrintIntentReprintDto {
    id: string;
    quantity: number;
    status: PrintIntentStatus;
    reprintReason?: ReprintReason | null;
    requestedBy: string;
    createdAt: string;
}

export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

export interface PrintIntentPage extends PagedResult<PrintIntentDto> {
    counts: Partial<Record<PrintIntentStatus, number>>;
}

export interface FinalSafetyCheckResult {
    isSafe: boolean;
    status: number; // 0=Ready, 1=Warning, 2=Blocked
    messages: string[];
}

export interface PrintIntentDetailDto extends PrintIntentDto {
    safetyCheck?: FinalSafetyCheckResult;
    reprints?: PrintIntentReprintDto[];
}
