export type TemplateStatus = 'Draft' | 'InReview' | 'Approved' | 'Rejected' | 'Published' | 'Deprecated' | 'Archived';

export interface TemplateVersion {
    id: string;
    versionNumber: number;
    status: TemplateStatus;
    layoutJson: string;
    changeNotes?: string;
    createdAt: string;
    createdBy: string;
}

export interface LabelTemplate {
    id: string;
    name: string;
    code: string;
    description?: string;
    isActive: boolean;
    currentActiveVersionId?: string;
    currentActiveVersion?: TemplateVersion;
    createdAt: string;
    updatedAt: string;
    versions?: TemplateVersion[];
}
