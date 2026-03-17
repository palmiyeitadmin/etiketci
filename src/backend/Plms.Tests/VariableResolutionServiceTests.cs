using Plms.Api.Models.Canonical;
using Plms.Api.Services;

namespace Plms.Tests;

public class VariableResolutionServiceTests
{
    [Fact]
    public void GetVariableCatalog_ReturnsEditorSupportedVariables()
    {
        var service = new VariableResolutionService();

        var catalog = service.GetVariableCatalog();

        Assert.NotNull(catalog);
        Assert.True(catalog.Items.Count >= 4);
        Assert.Contains(catalog.Items, item => item.Key == "product.sku" && item.SupportedElementTypes.Contains("barcode"));
        Assert.Contains(catalog.Items, item => item.Key == "product.name" && item.SupportedElementTypes.Contains("text"));
    }
}
