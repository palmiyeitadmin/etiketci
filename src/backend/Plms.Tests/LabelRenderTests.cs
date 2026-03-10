using Plms.Api.Models.Canonical;
using Plms.Api.Services;
using Plms.Tests.Samples;
using Xunit;
using System.Collections.Generic;

namespace Plms.Tests
{
    public class LabelRenderTests
    {
        public static IEnumerable<object[]> GetGoldenSamples()
        {
            yield return new object[] { GoldenSamples.TextOnlyLabel };
            yield return new object[] { GoldenSamples.BarcodeLabel };
            yield return new object[] { GoldenSamples.QrCodeLabel };
            yield return new object[] { GoldenSamples.MixedLabel };
        }

        [Theory]
        [MemberData(nameof(GetGoldenSamples))]
        public void GeneratePdf_WithGoldenSamples_ShouldSucceed(CanonicalLabelModel model)
        {
            // Arrange
            var service = new LabelRenderService();

            // Act
            var pdf = service.GeneratePdf(model);

            // Assert
            Assert.NotNull(pdf);
            Assert.True(pdf.Length > 1024, $"PDF for {model.Name} should be at least 1KB (Current: {pdf.Length} bytes)");
        }
    }
}
