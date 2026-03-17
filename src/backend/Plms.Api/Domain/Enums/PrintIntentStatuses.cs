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

        public static bool IsOpen(string? status)
        {
            return status == Pending || status == ReadyForPrint || status == SentToClient;
        }
    }
}
