using System.Text.Json.Serialization;

namespace Plms.Api.Domain.Enums
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum ImportSessionStatus
    {
        ValidationFailed,
        ReadyToImport,
        Imported
    }
}
