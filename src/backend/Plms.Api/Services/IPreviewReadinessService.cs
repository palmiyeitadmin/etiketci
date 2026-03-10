using Plms.Api.Domain.Entities;
using Plms.Api.Models.Operational;

namespace Plms.Api.Services
{
    public interface IPreviewReadinessService
    {
        Task<PreviewReadinessDto> EvaluateReadinessAsync(LabelTemplateVersion version, Product? product);
        List<VariableResolutionDetail> GetVariableDetails(string layoutJson, Product? product);
    }
}
