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
