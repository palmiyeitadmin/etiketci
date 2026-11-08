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

        /// <summary>The same findings as <see cref="Errors"/> and <see cref="Warnings"/>, as codes the UI translates.</summary>
        public List<CheckIssue> Issues { get; set; } = new();

        public void AddError(string code, string message, Dictionary<string, string>? parameters = null)
        {
            Errors.Add(message);
            Issues.Add(new CheckIssue { Code = code, Severity = CheckIssue.Error, Params = parameters ?? new() });
        }

        public void AddWarning(string code, string message, Dictionary<string, string>? parameters = null)
        {
            Warnings.Add(message);
            Issues.Add(new CheckIssue { Code = code, Severity = CheckIssue.Warning, Params = parameters ?? new() });
        }
    }

    /// <summary>
    /// A readiness or safety finding the UI phrases in the user's language. Codes:
    /// version_not_printable {status}, product_missing, product_not_linked, variable_missing {name},
    /// variable_unsupported {name}, intent_context_missing, snapshot_blocked, snapshot_unreadable, snapshot_missing.
    /// </summary>
    public class CheckIssue
    {
        public const string Error = "error";
        public const string Warning = "warning";

        public string Code { get; set; } = string.Empty;
        public string Severity { get; set; } = Error;
        public Dictionary<string, string> Params { get; set; } = new();

        /// <summary>True when the finding was recorded when the request was created, not found now.</summary>
        public bool FromSnapshot { get; set; }
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
