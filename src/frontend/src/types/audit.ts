export interface AuditLogDto {
    id: string;
    timestamp: string;
    action: string;
    entityId: string;
    entityType: string;
    details: string;
    userId: string;
    correlationId: string;
    metadata: string;
}

export interface AuditLogListResponse {
    items: AuditLogDto[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}
