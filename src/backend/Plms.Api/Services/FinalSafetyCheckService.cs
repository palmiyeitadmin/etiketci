using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.Models.Operational;
using System.Text.Json;

namespace Plms.Api.Services
{
    public interface IFinalSafetyCheckService
    {
        Task<FinalSafetyCheckResult> EvaluateIntentSafetyAsync(PrintIntent intent);
    }

    public class FinalSafetyCheckResult
    {
        public bool IsSafe { get; set; }
        public ReadinessStatus Status { get; set; }
        public List<string> Messages { get; set; } = new();
        public List<CheckIssue> Issues { get; set; } = new();

        public void Block(string code, string message, Dictionary<string, string>? parameters = null)
        {
            IsSafe = false;
            Status = ReadinessStatus.Blocked;
            Messages.Add(message);
            Issues.Add(new CheckIssue { Code = code, Params = parameters ?? new() });
        }
    }

    public class FinalSafetyCheckService : IFinalSafetyCheckService
    {
        public Task<FinalSafetyCheckResult> EvaluateIntentSafetyAsync(PrintIntent intent)
        {
            var result = new FinalSafetyCheckResult { IsSafe = true, Status = ReadinessStatus.Ready };

            // 1. Validate intent completeness
            if (intent.Template == null || intent.Version == null || intent.Product == null)
            {
                result.Block("intent_context_missing", "Intent is missing critical context (Template, Version, or Product).");
                return Task.FromResult(result); // Fast fail
            }

            // 2. Validate template version immutability and status
            if (intent.Version.Status != TemplateStatus.Published && intent.Version.Status != TemplateStatus.Approved)
            {
                result.Block("version_not_printable", $"Template version is in '{intent.Version.Status}' state. It must be Approved or Published.",
                    new() { ["status"] = intent.Version.Status.ToString() });
            }

            // 3. Re-evaluate readiness snapshot for any critical warnings recorded at creation
            if (!string.IsNullOrEmpty(intent.ReadinessSnapshot))
            {
                try
                {
                    var snapshot = JsonSerializer.Deserialize<PreviewReadinessDto>(intent.ReadinessSnapshot, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (snapshot != null)
                    {
                        if (snapshot.Status == ReadinessStatus.Blocked)
                        {
                            result.Block("snapshot_blocked", "The original readiness snapshot indicated this intent was Blocked.");
                            foreach (var err in snapshot.Errors)
                            {
                                result.Messages.Add($"[Original Blocker] {err}");
                            }
                            result.Issues.AddRange(snapshot.Issues.Where(issue => issue.Severity == CheckIssue.Error).Select(issue => { issue.FromSnapshot = true; return issue; }));
                        }
                        else if (snapshot.Status == ReadinessStatus.Warning)
                        {
                            if (result.Status != ReadinessStatus.Blocked)
                            {
                                result.Status = ReadinessStatus.Warning;
                            }
                            foreach (var warn in snapshot.Warnings)
                            {
                                result.Messages.Add($"[Original Warning] {warn}");
                            }
                            result.Issues.AddRange(snapshot.Issues.Where(issue => issue.Severity == CheckIssue.Warning).Select(issue => { issue.FromSnapshot = true; return issue; }));
                        }
                    }
                }
                catch
                {
                    result.Block("snapshot_unreadable", "Failed to parse the original readiness snapshot.");
                }
            }
            else
            {
                result.Block("snapshot_missing", "No readiness snapshot found for this intent.");
            }

            return Task.FromResult(result);
        }
    }
}
