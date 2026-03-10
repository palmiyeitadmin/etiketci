namespace Plms.Api.Models.Operational
{
    public enum ReadinessStatus
    {
        Ready,
        Warning,
        Blocked
    }

    public class PreviewReadinessDto
    {
        public ReadinessStatus Status { get; set; }
        public List<string> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    public class VariableResolutionDetail
    {
        public string Name { get; set; } = string.Empty;
        public VariableStatus Status { get; set; }
        public string? ResolvedValue { get; set; }
    }

    public enum VariableStatus
    {
        Resolved,
        Missing,
        Unsupported
    }
}
