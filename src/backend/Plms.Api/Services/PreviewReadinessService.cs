using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.Models.Operational;

namespace Plms.Api.Services
{
    public class PreviewReadinessService : IPreviewReadinessService
    {
        private readonly IVariableResolutionService _variableService;
        private readonly ApplicationDbContext _context;

        public PreviewReadinessService(IVariableResolutionService variableService, ApplicationDbContext context)
        {
            _variableService = variableService;
            _context = context;
        }

        public async Task<PreviewReadinessDto> EvaluateReadinessAsync(LabelTemplateVersion version, Product? product)
        {
            var readiness = new PreviewReadinessDto();

            // 1. Lifecycle Check
            if (version.Status != TemplateStatus.Published && version.Status != TemplateStatus.Approved)
            {
                readiness.AddError("version_not_printable", $"Template version is in '{version.Status}' state. Only Approved or Published versions can be used for print intents.", new() { ["status"] = version.Status.ToString() });
            }

            // 2. Product Context Check
            if (product == null)
            {
                readiness.AddError("product_missing", "Product context is missing. Print intents require a specific product.");
            }
            else
            {
                // Verify link if required (In this architecture, we check if linked)
                var isLinked = await _context.ProductTemplates.AnyAsync(pt => pt.ProductId == product.Id && pt.TemplateId == version.TemplateId);
                if (!isLinked)
                {
                    readiness.AddWarning("product_not_linked", "Product is not explicitly linked to this template in the catalog.");
                }
            }

            // 3. Variable Resolution Check
            var variables = GetVariableDetails(version.LayoutJson, product);
            foreach (var v in variables)
            {
                if (v.Status == VariableStatus.Missing)
                {
                    readiness.AddError("variable_missing", $"Missing required data for variable: {v.Name}", new() { ["name"] = v.Name });
                }
                else if (v.Status == VariableStatus.Unsupported)
                {
                    readiness.AddError("variable_unsupported", $"Unsupported variable placeholder: {v.Name}", new() { ["name"] = v.Name });
                }
            }

            // Final Status Determination
            if (readiness.Errors.Any())
            {
                readiness.Status = ReadinessStatus.Blocked;
            }
            else if (readiness.Warnings.Any())
            {
                readiness.Status = ReadinessStatus.Warning;
            }
            else
            {
                readiness.Status = ReadinessStatus.Ready;
            }

            return readiness;
        }

        public List<VariableResolutionDetail> GetVariableDetails(string layoutJson, Product? product)
        {
            var details = new List<VariableResolutionDetail>();
            var required = _variableService.GetRequiredVariables(layoutJson);

            foreach (var v in required)
            {
                var detail = new VariableResolutionDetail { Name = v };
                
                if (product == null)
                {
                    detail.Status = VariableStatus.Missing;
                }
                else
                {
                    var resolvedValue = ResolveValueForDetail(v, product);
                    if (resolvedValue != null && !resolvedValue.StartsWith("{{UNRESOLVED"))
                    {
                        detail.Status = VariableStatus.Resolved;
                        detail.ResolvedValue = resolvedValue;
                    }
                    else if (resolvedValue != null && resolvedValue.Contains("UNRESOLVED"))
                    {
                        detail.Status = VariableStatus.Unsupported;
                    }
                    else
                    {
                        detail.Status = VariableStatus.Missing;
                    }
                }
                details.Add(detail);
            }

            return details;
        }

        private string? ResolveValueForDetail(string path, Product product)
        {
            // Mirror logic in VariableResolutionService but return null for truly missing properties if needed
            // For now, simple switch mapping
            return path.ToLower() switch
            {
                "product.sku" => string.IsNullOrEmpty(product.Sku) ? null : product.Sku,
                "product.name" => string.IsNullOrEmpty(product.Name) ? null : product.Name,
                "product.category" => product.Category?.Name,
                "product.vendor" => product.Vendor?.Name,
                _ => $"{{{{UNRESOLVED:{path}}}}}"
            };
        }
    }
}
