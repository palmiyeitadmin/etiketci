using System.Text.Json.Serialization;

namespace Plms.Api.Domain.Enums
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum RestorationRequestStatus
    {
        Pending,
        Approved,
        Rejected
    }
}
