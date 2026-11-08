using System.Collections;
using System.Globalization;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Plms.Api.Services;

namespace Plms.Api.Controllers
{
    /// <summary>
    /// The body of a failed API response: <c>{ success: false, error, code, params }</c>.
    /// <c>code</c> is stable and is what the UI translates; <c>error</c> stays English for logs and as a fallback.
    /// </summary>
    public sealed class ApiErrorBody
    {
        [JsonPropertyName("success")]
        public bool Success => false;

        [JsonPropertyName("error")]
        public string Error { get; init; } = string.Empty;

        [JsonPropertyName("code")]
        public string Code { get; init; } = string.Empty;

        /// <summary>Values the translated text needs (camelCase keys, string values). Omitted when empty.</summary>
        [JsonPropertyName("params")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public IReadOnlyDictionary<string, string>? Params { get; init; }

        /// <summary>ASP.NET Identity errors, one per failed rule (only for <c>identity_error</c>).</summary>
        [JsonPropertyName("errors")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public IReadOnlyList<ApiIdentityError>? Errors { get; init; }

        /// <summary>Reads like the anonymous objects this replaced, so logs and older tests still see the English message.</summary>
        public override string ToString() => $"{{ success = False, error = {Error}, code = {Code} }}";
    }

    public sealed class ApiIdentityError
    {
        [JsonPropertyName("code")]
        public string Code { get; init; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; init; } = string.Empty;

        /// <summary>Values found in the description: <c>value</c> (the quoted name or email) and <c>n</c> (a number such as the minimum length).</summary>
        [JsonPropertyName("params")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public IReadOnlyDictionary<string, string>? Params { get; init; }
    }

    /// <summary>
    /// Builds failed-response bodies with a stable code.
    /// <example><c>return NotFound(ApiError.Of("print_intent_not_found", "Print intent not found."));</c></example>
    /// <example><c>ApiError.Of("intent_cannot_confirm", $"... '{pi.Status}' ...", new { status = pi.Status })</c></example>
    /// </summary>
    public static class ApiError
    {
        public const string IdentityErrorCode = "identity_error";

        /// <param name="code">Stable snake_case code the UI translates.</param>
        /// <param name="message">English text, kept for logs and as a fallback.</param>
        /// <param name="parameters">Anonymous object or dictionary; values become strings (lists are joined with ", ").</param>
        public static ApiErrorBody Of(string code, string message, object? parameters = null) => new()
        {
            Code = code,
            Error = message,
            Params = ToParams(parameters),
        };

        /// <summary>A service error raised as <see cref="ApiErrorException"/>; any other exception gets <paramref name="fallbackCode"/>.</summary>
        public static ApiErrorBody From(Exception exception, string fallbackCode) => exception is ApiErrorException coded
            ? new ApiErrorBody { Code = coded.Code, Error = coded.Message, Params = coded.Params.Count > 0 ? coded.Params : null }
            : Of(fallbackCode, exception.Message);

        /// <summary>Failed ASP.NET Identity result: the descriptions joined as <c>error</c>, each rule under <c>errors</c>.</summary>
        public static ApiErrorBody Identity(IEnumerable<IdentityError> errors)
        {
            var list = errors.Select(error => new ApiIdentityError
            {
                Code = error.Code,
                Description = error.Description,
                Params = IdentityParams(error.Description),
            }).ToList();

            return new ApiErrorBody
            {
                Code = IdentityErrorCode,
                Error = string.Join(" ", list.Select(error => error.Description)),
                Errors = list,
            };
        }

        internal static IReadOnlyDictionary<string, string>? ToParams(object? parameters)
        {
            if (parameters == null)
            {
                return null;
            }

            var result = new Dictionary<string, string>();
            if (parameters is IDictionary dictionary)
            {
                foreach (DictionaryEntry entry in dictionary)
                {
                    result[CamelCase(Convert.ToString(entry.Key, CultureInfo.InvariantCulture) ?? string.Empty)] = Format(entry.Value);
                }
            }
            else
            {
                foreach (var property in parameters.GetType().GetProperties())
                {
                    result[CamelCase(property.Name)] = Format(property.GetValue(parameters));
                }
            }

            return result.Count > 0 ? result : null;
        }

        private static string Format(object? value) => value switch
        {
            null => string.Empty,
            string text => text,
            IEnumerable items => string.Join(", ", items.Cast<object?>().Select(Format)),
            _ => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty,
        };

        private static string CamelCase(string name) =>
            string.IsNullOrEmpty(name) || char.IsLower(name[0]) ? name : char.ToLowerInvariant(name[0]) + name[1..];

        private static readonly Regex QuotedValue = new("'([^']*)'", RegexOptions.Compiled);
        private static readonly Regex Number = new(@"\d+", RegexOptions.Compiled);

        private static IReadOnlyDictionary<string, string>? IdentityParams(string description)
        {
            var result = new Dictionary<string, string>();
            var quoted = QuotedValue.Match(description);
            if (quoted.Success) result["value"] = quoted.Groups[1].Value;
            var number = Number.Match(description);
            if (number.Success) result["n"] = number.Value;
            return result.Count > 0 ? result : null;
        }
    }
}
