using Plms.Api.Models.Canonical;
using Plms.Api.Services;
using Xunit;
using System.Collections.Generic;

namespace Plms.Tests
{
    public class LabelRenderTests
    {
        [Fact]
        public void GeneratePdf_WithGoldenSample_ShouldSucceed()
        {
            // Arrange
            var service = new LabelRenderService();
            var model = new CanonicalLabelModel
            {
                Name = "Golden Sample 1",
                Dimensions = new LabelDimensions { WidthMm = 100, HeightMm = 150 },
                Elements = new List<LabelElement>
                {
                    new LabelElement 
                    { 
                        Id = "1", 
                        Type = "text", 
                        Content = "PLMS Test Label", 
                        XMm = 10, 
                        YMm = 10, 
                        WidthMm = 80, 
                        HeightMm = 10, 
                        FontSizePt = 16 
                    },
                    new LabelElement 
                    { 
                        Id = "2", 
                        Type = "rect", 
                        XMm = 10, 
                        YMm = 25, 
                        WidthMm = 80, 
                        HeightMm = 2, 
                        Fill = "#000000" 
                    },
                    new LabelElement 
                    { 
                        Id = "3", 
                        Type = "barcode", 
                        Content = "12345678", 
                        XMm = 10, 
                        YMm = 35, 
                        WidthMm = 80, 
                        HeightMm = 30 
                    }
                }
            };

            // Act
            var pdf = service.GeneratePdf(model);

            // Assert
            Assert.NotNull(pdf);
            Assert.True(pdf.Length > 0);
        }
    }
}
