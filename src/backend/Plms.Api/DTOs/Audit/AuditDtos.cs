namespace Plms.Api.DTOs.Audit
{
    public class AuditLogListItemDto
    {
        public Guid Id { get; set; }
        public DateTime Timestamp { get; set; }
        public string Action { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string CorrelationId { get; set; } = string.Empty;
        public string Metadata { get; set; } = string.Empty;
    }

    public class PagedResultDto<T>
    {
        public List<T> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
    }
}
