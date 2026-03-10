using System;

namespace Plms.Api.Domain.Entities
{
    public class AuditLog
    {
        public Guid Id { get; set; }
        public DateTime Timestamp { get; set; }
        public string Action { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
    }
}
