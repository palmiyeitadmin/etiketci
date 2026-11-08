using System.Text.Json;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;

namespace Plms.Api.Services
{
    /// <summary>
    /// Adds audit entries with structured parameters. <c>Details</c> stays a readable English sentence for
    /// operators of the database; <c>Metadata</c> carries the same facts as JSON so the UI can phrase them
    /// in the user's language.
    /// </summary>
    public static class AuditWriter
    {
        private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        public static AuditLog Add(
            ApplicationDbContext context,
            string action,
            string entityType,
            object entityId,
            string userId,
            string correlationId,
            string details,
            object? parameters = null)
        {
            var entry = new AuditLog
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTime.UtcNow,
                Action = action,
                EntityType = entityType,
                EntityId = entityId.ToString() ?? string.Empty,
                UserId = userId,
                CorrelationId = correlationId,
                Details = details,
                Metadata = parameters == null ? string.Empty : JsonSerializer.Serialize(parameters, JsonOptions),
            };
            context.AuditLogs.Add(entry);
            return entry;
        }
    }
}
