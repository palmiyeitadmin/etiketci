export type TemplateStatus = 'Draft' | 'InReview' | 'Approved' | 'Rejected' | 'Published' | 'Deprecated' | 'Archived';

export interface TemplateVersion {
    id: string;
    versionNumber: number;
    status: TemplateStatus;
    layoutJson: string;
    changeNotes?: string;
    createdAt: string;
    createdBy: string;
    submittedForReviewAt?: string;
    submittedForReviewBy?: string;
    reviewedAt?: string;
    reviewedBy?: string;
    reviewDecision?: string;
    reviewComment?: string;
    publishedAt?: string;
    publishedBy?: string;
    sourceVersionId?: string;
}

export interface LabelTemplate {
    id: string;
    name: string;
    code: string;
    description?: string;
    isActive: boolean;
    currentActiveVersionId?: string;
    currentActiveVersion?: TemplateVersion;
    latestVersion?: TemplateVersion;
    linkedProductCount?: number;
    draftCount?: number;
    inReviewCount?: number;
    publishedCount?: number;
    lastUpdatedBy?: string;
    createdAt: string;
    updatedAt: string;
    versions?: TemplateVersion[];
}

export interface TemplateComparisonElementChange {
    elementId: string;
    elementType: string;
    changeType: string;
    summary: string;
}

export interface TemplateComparison {
    templateId: string;
    leftVersionId: string;
    rightVersionId: string;
    leftVersionNumber: number;
    rightVersionNumber: number;
    addedElements: TemplateComparisonElementChange[];
    removedElements: TemplateComparisonElementChange[];
    changedElements: TemplateComparisonElementChange[];
}

export interface TemplateRestorationRequest {
    id: string;
    templateId: string;
    templateName: string;
    templateCode: string;
    templateVersionId: string;
    templateVersionNumber: number;
    templateVersionStatus: TemplateStatus;
    businessJustification: string;
    targetEnvironment?: string;
    requestedUntil?: string;
    requestedBy: string;
    requestedAt: string;
    status: string;
    reviewComments?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    restoredVersionId?: string;
}
