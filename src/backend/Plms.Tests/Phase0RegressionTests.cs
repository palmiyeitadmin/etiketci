using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Plms.Api.Controllers;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Operational;
using Plms.Api.DTOs.Template;
using Plms.Api.Models.Canonical;
using Plms.Api.Models.Operational;
using Plms.Api.Security;
using Plms.Api.Services;

namespace Plms.Tests
{
    /// <summary>Regression tests for the bugs fixed in the Phase 0 review (docs/review).</summary>
    public class Phase0RegressionTests
    {
        private static ApplicationDbContext NewContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new ApplicationDbContext(options);
        }

        private static ControllerContext ContextFor(string userName, params string[] roles)
        {
            var claims = new List<Claim> { new(ClaimTypes.Name, userName) };
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
            return new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(claims, "mock")),
                    TraceIdentifier = Guid.NewGuid().ToString(),
                }
            };
        }

        private static (LabelTemplate Template, LabelTemplateVersion Version) AddTemplate(
            ApplicationDbContext context, TemplateStatus status, string layoutJson, string createdBy = "author")
        {
            var template = new LabelTemplate { Id = Guid.NewGuid(), Name = "Raf etiketi", Code = "RAF-001", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            var version = new LabelTemplateVersion
            {
                Id = Guid.NewGuid(),
                TemplateId = template.Id,
                VersionNumber = 1,
                Status = status,
                LayoutJson = layoutJson,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy,
            };
            context.Templates.Add(template);
            context.TemplateVersions.Add(version);
            return (template, version);
        }

        [Fact]
        public async Task CreatePrintIntent_TemplateUsingCategoryAndVendor_IsNotBlocked()
        {
            using var context = NewContext();
            var category = new ProductCategory { Code = "ZYT", Name = "Zeytinyağı" };
            var vendor = new Vendor { Code = "EGE", Name = "Ege Zeytincilik" };
            var product = new Product { Sku = "ZYT-0500", Name = "Sızma 500 ml", Category = category, Vendor = vendor };
            context.Products.Add(product);
            var layout = """{"dimensions":{"widthMm":60,"heightMm":40},"elements":[{"id":"t","type":"text","content":"{{product.category}} / {{product.vendor}}","xMm":1,"yMm":1,"widthMm":50,"heightMm":8}]}""";
            var (template, version) = AddTemplate(context, TemplateStatus.Published, layout);
            context.ProductTemplates.Add(new ProductTemplate { ProductId = product.Id, TemplateId = template.Id, IsDefault = true });
            await context.SaveChangesAsync();
            context.ChangeTracker.Clear(); // A new request does not have the navigations tracked.

            var readiness = new PreviewReadinessService(new VariableResolutionService(), context);
            var safety = new Mock<IFinalSafetyCheckService>();
            var controller = new PrintIntentsController(context, readiness, safety.Object, new LabelRenderService(), new VariableResolutionService()) { ControllerContext = ContextFor("operator") };

            var result = await controller.CreatePrintIntent(new CreatePrintIntentDto
            {
                ProductId = product.Id,
                TemplateId = template.Id,
                VersionId = version.Id,
                Quantity = 10,
            });

            Assert.IsType<OkObjectResult>(result);
            Assert.Equal(1, await context.PrintIntents.CountAsync());
        }

        [Fact]
        public async Task CreateRevision_CalledTwice_ReturnsTheSameDraft()
        {
            using var context = NewContext();
            var (template, published) = AddTemplate(context, TemplateStatus.Published, "{}");
            await context.SaveChangesAsync();
            var controller = new TemplatesController(context, null!, null!, null!) { ControllerContext = ContextFor("designer") };

            await controller.CreateRevision(template.Id, published.Id);
            await controller.CreateRevision(template.Id, published.Id);

            var drafts = await context.TemplateVersions.Where(v => v.TemplateId == template.Id && v.Status == TemplateStatus.Draft).ToListAsync();
            Assert.Single(drafts);
            Assert.Contains(await context.AuditLogs.ToListAsync(), log => log.Action == "TemplateRevisionCreated");
        }

        [Fact]
        public async Task ReviewVersion_AuthorCannotApproveOwnVersion()
        {
            using var context = NewContext();
            var (template, version) = AddTemplate(context, TemplateStatus.InReview, "{}", createdBy: "ayse");
            await context.SaveChangesAsync();
            var controller = new TemplatesController(context, null!, null!, null!) { ControllerContext = ContextFor("ayse", "Editor") };

            var result = await controller.ReviewVersion(template.Id, version.Id, new ReviewTemplateVersionDto { Approve = true, Comments = "ok" });

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal(TemplateStatus.InReview, (await context.TemplateVersions.SingleAsync()).Status);
        }

        [Fact]
        public async Task ReviewVersion_AdminSelfApproval_IsAllowedAndMarkedInAudit()
        {
            using var context = NewContext();
            var (template, version) = AddTemplate(context, TemplateStatus.InReview, "{}", createdBy: "admin");
            await context.SaveChangesAsync();
            var controller = new TemplatesController(context, null!, null!, null!) { ControllerContext = ContextFor("admin", ApplicationRoles.Admin) };

            var result = await controller.ReviewVersion(template.Id, version.Id, new ReviewTemplateVersionDto { Approve = true, Comments = "ok" });

            Assert.IsType<OkObjectResult>(result);
            var log = await context.AuditLogs.SingleAsync(entry => entry.Action == "TemplateApproved");
            Assert.Contains("Self-approval", log.Details);
        }

        [Fact]
        public async Task DeleteProduct_WithPrintHistory_DeactivatesInsteadOfDeleting()
        {
            using var context = NewContext();
            var product = new Product { Sku = "BHR-0100", Name = "Pul biber" };
            context.Products.Add(product);
            var (template, version) = AddTemplate(context, TemplateStatus.Published, "{}");
            context.PrintIntents.Add(new PrintIntent
            {
                Id = Guid.NewGuid(), ProductId = product.Id, TemplateId = template.Id, VersionId = version.Id,
                Quantity = 5, Status = PrintIntentStatuses.UserPrinted, CreatedAt = DateTime.UtcNow,
            });
            await context.SaveChangesAsync();
            var controller = new ProductsController(context, null!) { ControllerContext = ContextFor("admin", ApplicationRoles.Admin) };

            var result = await controller.DeleteProduct(product.Id);

            Assert.IsType<OkObjectResult>(result);
            var stored = await context.Products.SingleAsync();
            Assert.False(stored.IsActive);
            Assert.Equal(1, await context.PrintIntents.CountAsync());
        }

        [Theory]
        [InlineData("CODE_128", "PLMS-12345")]
        [InlineData("CODE_39", "PLMS-12345")]
        [InlineData("EAN_13", "8690000000012")]
        [InlineData("UNKNOWN_TYPE", "PLMS-12345")]
        public void GeneratePdf_BarcodeTypes_RenderWithoutThrowing(string barcodeType, string content)
        {
            var model = new CanonicalLabelModel
            {
                Dimensions = new LabelDimensions { WidthMm = 60, HeightMm = 40 },
                Elements = { new LabelElement { Id = "b", Type = "barcode", BarcodeType = barcodeType, Content = content, XMm = 2, YMm = 2, WidthMm = 50, HeightMm = 20 } },
            };

            var pdf = new LabelRenderService().GeneratePdf(model);

            Assert.True(pdf.Length > 0);
        }

        [Fact]
        public void GeneratePdf_WithProofWatermark_ProducesDifferentDocument()
        {
            var model = new CanonicalLabelModel
            {
                Dimensions = new LabelDimensions { WidthMm = 60, HeightMm = 40 },
                Elements = { new LabelElement { Id = "t", Type = "text", Content = "Raf etiketi", XMm = 2, YMm = 2, WidthMm = 50, HeightMm = 8, FontSizePt = 10 } },
            };
            var service = new LabelRenderService();

            var clean = service.GeneratePdf(model);
            var proof = service.GeneratePdf(model, "PROVA");

            Assert.True(proof.Length > clean.Length);
        }
    }
}
