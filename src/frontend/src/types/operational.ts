import { TemplateStatus } from "./template";

export interface ProductTemplateDto {
    id: string;
    productId: string;
    productName: string;
    templateId: string;
    templateName: string;
    templateCode: string;
    isDefault: boolean;
    isActive: boolean;
}

export interface PrintIntentDto {
    id: string;
    productId: string;
    productName: string;
    templateId: string;
    templateName: string;
    versionId: string;
    versionNumber: number;
    quantity: number;
    status: string;
    requestedBy: string;
    createdAt: string;
    readinessSnapshot?: string;
}

export interface FinalSafetyCheckResult {
    isSafe: boolean;
    status: number; // 0=Ready, 1=Warning, 2=Blocked
    messages: string[];
}

export interface PrintIntentDetailDto extends PrintIntentDto {
    operatorReviewedAt?: string;
    operatorReviewedBy?: string;
    safetyCheck?: FinalSafetyCheckResult;
}
