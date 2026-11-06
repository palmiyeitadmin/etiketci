using System.Linq;

namespace Plms.Api.Domain.Enums
{
    public static class PrintIntentStatuses
    {
        public const string Pending = "Pending";
        public const string ReadyForPrint = "ReadyForPrint";
        public const string SentToClient = "SentToClient";
        public const string UserPrinted = "UserPrinted";
        public const string Failed = "Failed";
        public const string Cancelled = "Cancelled";

        /// <summary>Statuses that still need an operator action. Use this array inside EF queries; IsOpen cannot be translated to SQL.</summary>
        public static readonly string[] OpenStatuses = { Pending, ReadyForPrint, SentToClient };

        public static bool IsOpen(string? status)
        {
            return status != null && OpenStatuses.Contains(status);
        }
    }
}
