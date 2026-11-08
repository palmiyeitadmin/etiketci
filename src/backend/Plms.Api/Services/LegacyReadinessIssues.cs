using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Models.Operational;

namespace Plms.Api.Services
{
    /// <summary>
    /// Print requests created before readiness results carried codes stored only English sentences.
    /// This converts those stored snapshots once, at startup, using the exact sentences this API used to
    /// write, so the UI never has to recognise English text. A sentence it does not know is kept as
    /// <c>legacy_message</c> with the text as a parameter.
    /// </summary>
    public static class LegacyReadinessIssues
    {
        private static readonly (Regex Pattern, string Code, string? Param)[] Known =
        {
            (new Regex(@"^Template version is in '([^']+)' state\. Only Approved or Published versions can be used for print intents\.$"), "version_not_printable", "status"),
            (new Regex(@"^Product context is missing\. Print intents require a specific product\.$"), "product_missing", null),
            (new Regex(@"^Product is not explicitly linked to this template in the catalog\.$"), "product_not_linked", null),
            (new Regex(@"^Missing required data for variable: (.+)$"), "variable_missing", "name"),
            (new Regex(@"^Unsupported variable placeholder: (.+)$"), "variable_unsupported", "name"),
        };

        public static CheckIssue FromMessage(string message, string severity)
        {
            foreach (var (pattern, code, param) in Known)
            {
                var match = pattern.Match(message);
                if (!match.Success) continue;
                var parameters = param == null ? new Dictionary<string, string>() : new Dictionary<string, string> { [param] = match.Groups[1].Value };
                return new CheckIssue { Code = code, Severity = severity, Params = parameters };
            }
            return new CheckIssue { Code = "legacy_message", Severity = severity, Params = new() { ["text"] = message } };
        }

        /// <summary>Adds Issues to stored snapshots that have messages but no codes. Safe to run on every start.</summary>
        public static async Task<int> BackfillAsync(ApplicationDbContext context)
        {
            var candidates = await context.PrintIntents
                .Where(pi => pi.ReadinessSnapshot != null && pi.ReadinessSnapshot != "" && !pi.ReadinessSnapshot.Contains("\"Issues\""))
                .ToListAsync();
            var changed = 0;
            foreach (var intent in candidates)
            {
                PreviewReadinessDto? snapshot;
                try
                {
                    snapshot = JsonSerializer.Deserialize<PreviewReadinessDto>(intent.ReadinessSnapshot!, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }
                catch (JsonException)
                {
                    continue;
                }
                if (snapshot == null) continue;

                snapshot.Issues = snapshot.Errors.Select(message => FromMessage(message, CheckIssue.Error))
                    .Concat(snapshot.Warnings.Select(message => FromMessage(message, CheckIssue.Warning)))
                    .ToList();
                intent.ReadinessSnapshot = JsonSerializer.Serialize(snapshot);
                changed++;
            }
            if (changed > 0) await context.SaveChangesAsync();
            return changed;
        }
    }
}
