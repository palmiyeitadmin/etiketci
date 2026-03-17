using System.Text.Json.Serialization;

namespace Plms.Api.Domain.Enums
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum TemplateStatus
    {
        Draft,
        InReview,
        Approved,
        Rejected,
        Published,
        Deprecated,
        Archived
    }
}
