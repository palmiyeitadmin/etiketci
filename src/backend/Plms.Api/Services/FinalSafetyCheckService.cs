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
    }

    public class FinalSafetyCheckService : IFinalSafetyCheckService
    {
        public async Task<FinalSafetyCheckResult> EvaluateIntentSafetyAsync(PrintIntent intent)
        {
            var result = new FinalSafetyCheckResult { IsSafe = true, Status = ReadinessStatus.Ready };

            // 1. Validate intent completeness
            if (intent.Template == null || intent.Version == null || intent.Product == null)
            {
                result.IsSafe = false;
                result.Status = ReadinessStatus.Blocked;
                result.Messages.Add("Intent is missing critical context (Template, Version, or Product).");
                return result; // Fast fail
            }

            // 2. Validate template version immutability and status
            if (intent.Version.Status != TemplateStatus.Published && intent.Version.Status != TemplateStatus.Approved)
            {
                result.IsSafe = false;
                result.Status = ReadinessStatus.Blocked;
                result.Messages.Add($"Template version is in '{intent.Version.Status}' state. It must be Published or Approved.");
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
                            result.IsSafe = false;
                            result.Status = ReadinessStatus.Blocked;
                            result.Messages.Add("The original readiness snapshot indicated this intent was Blocked.");
                            foreach (var err in snapshot.Errors)
                            {
                                result.Messages.Add($"[Original Blocker] {err}");
                            }
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
                        }
                    }
                }
                catch
                {
                    result.IsSafe = false;
                    result.Status = ReadinessStatus.Blocked;
                    result.Messages.Add("Failed to parse the original readiness snapshot.");
                }
            }
            else
            {
                 result.IsSafe = false;
                 result.Status = ReadinessStatus.Blocked;
                 result.Messages.Add("No readiness snapshot found for this intent.");
            }

            return result;
        }
    }
}
