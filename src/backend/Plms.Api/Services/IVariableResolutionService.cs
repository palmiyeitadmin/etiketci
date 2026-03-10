using Plms.Api.Domain.Entities;
using Plms.Api.Models.Canonical;

namespace Plms.Api.Services
{
    public interface IVariableResolutionService
    {
        /// <summary>
        /// Identifies all {{Variable}} placeholders in the layout JSON.
        /// </summary>
        IEnumerable<string> GetRequiredVariables(string layoutJson);

        /// <summary>
        /// Resolves variables in the layout JSON using product data.
        /// </summary>
        string ResolveVariables(string layoutJson, Product product);

        /// <summary>
        /// Resolves variables in the canonical model using product data.
        /// </summary>
        CanonicalLabelModel ResolveVariables(CanonicalLabelModel model, Product product);
    }
}
