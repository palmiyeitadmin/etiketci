export interface AuditLogDto {
    id: string;
    timestamp: string;
    action: string;
    userId: string;
    details: string;
    correlationId: string;
}
