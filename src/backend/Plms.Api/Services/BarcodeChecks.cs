using System.Text.RegularExpressions;
using Plms.Api.Models.Canonical;
using Plms.Api.Models.Operational;

namespace Plms.Api.Services
{
    /// <summary>
    /// Barcodes the PDF renderer cannot draw. The renderer supports CODE_128, EAN_13 and CODE_39 and leaves a
    /// barcode out when its content does not fit the symbology, so the preview warns before that happens.
    /// Content that still holds a {{placeholder}} is not checked: it is only known once a product is chosen.
    /// </summary>
    public static class BarcodeChecks
    {
        private static readonly Regex Ean13 = new(@"^\d{12,13}$");
        private static readonly Regex Code39 = new(@"^[0-9A-Z \-.$/+%]+$");

        public static IEnumerable<CheckIssue> Check(IEnumerable<LabelElement> elements)
        {
            foreach (var element in elements.Where(el => string.Equals(el.Type, "barcode", StringComparison.OrdinalIgnoreCase)))
            {
                var type = (element.BarcodeType ?? "CODE_128").ToUpperInvariant();
                var content = element.Content ?? string.Empty;
                if (type is not ("CODE_128" or "EAN_13" or "CODE_39"))
                {
                    yield return Issue("barcode_unsupported", type, content);
                    continue;
                }
                if (content.Contains("{{")) continue;

                var fits = type switch
                {
                    "EAN_13" => Ean13.IsMatch(content),
                    "CODE_39" => Code39.IsMatch(content),
                    _ => content.Length > 0 && content.All(c => c < 128),
                };
                if (!fits) yield return Issue("barcode_invalid_content", type, content);
            }
        }

        private static CheckIssue Issue(string code, string type, string value) => new()
        {
            Code = code,
            Severity = CheckIssue.Warning,
            Params = new() { ["type"] = type, ["value"] = value },
        };
    }
}
