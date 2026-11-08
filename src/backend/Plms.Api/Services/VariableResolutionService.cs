using System.Text.Json;
using System.Text.RegularExpressions;
using Plms.Api.Domain.Entities;
using Plms.Api.DTOs.Template;
using Plms.Api.Models.Canonical;

namespace Plms.Api.Services
{
    public class VariableResolutionService : IVariableResolutionService
    {
        private static readonly Regex VariableRegex = new Regex(@"\{\{([^}]+)\}\}", RegexOptions.Compiled);

        public IEnumerable<string> GetRequiredVariables(string layoutJson)
        {
            var matches = VariableRegex.Matches(layoutJson);
            return matches.Cast<Match>().Select(m => m.Groups[1].Value.Trim()).Distinct();
        }

        public string ResolveVariables(string layoutJson, Product product)
        {
            try 
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var model = JsonSerializer.Deserialize<CanonicalLabelModel>(layoutJson, options);
                if (model == null) return layoutJson;

                var resolvedModel = ResolveVariables(model, product);
                return JsonSerializer.Serialize(resolvedModel, options);
            }
            catch
            {
                return layoutJson;
            }
        }

        public CanonicalLabelModel ResolveVariables(CanonicalLabelModel model, Product product)
        {
            foreach (var element in model.Elements)
            {
                if (string.IsNullOrEmpty(element.Content)) continue;

                element.Content = VariableRegex.Replace(element.Content, match =>
                {
                    var variablePath = match.Groups[1].Value.Trim();
                    return ResolveValue(variablePath, product);
                });
            }

            return model;
        }

        public VariableCatalogResponseDto GetVariableCatalog()
        {
            return new VariableCatalogResponseDto
            {
                Items =
                [
                    new VariableCatalogItemDto
                    {
                        Key = "product.sku",
                        Label = "Product SKU",
                        Description = "Resolved from the linked product SKU.",
                        SampleValue = "ZYT-0500-SZM",
                        SupportedElementTypes = ["text", "barcode", "qr"]
                    },
                    new VariableCatalogItemDto
                    {
                        Key = "product.name",
                        Label = "Product Name",
                        Description = "Resolved from the linked product name.",
                        SampleValue = "Sızma zeytinyağı 500 ml",
                        SupportedElementTypes = ["text", "barcode", "qr"]
                    },
                    new VariableCatalogItemDto
                    {
                        Key = "product.category",
                        Label = "Product Category",
                        Description = "Resolved from the linked product category.",
                        SampleValue = "Zeytinyağı",
                        SupportedElementTypes = ["text", "barcode", "qr"]
                    },
                    new VariableCatalogItemDto
                    {
                        Key = "product.vendor",
                        Label = "Product Vendor",
                        Description = "Resolved from the linked product vendor.",
                        SampleValue = "Palmiye Gıda",
                        SupportedElementTypes = ["text", "barcode", "qr"]
                    }
                ]
            };
        }

        private string ResolveValue(string path, Product product)
        {
            // Simple mapping for MVP
            return path.ToLower() switch
            {
                "product.sku" => product.Sku,
                "product.name" => product.Name,
                "product.category" => product.Category?.Name ?? string.Empty,
                "product.vendor" => product.Vendor?.Name ?? string.Empty,
                _ => $"{{{{UNRESOLVED:{path}}}}}"
            };
        }
    }
}
