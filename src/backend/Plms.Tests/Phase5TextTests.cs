using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Controllers;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Vendor;
using Plms.Api.Models.Operational;
using Plms.Api.Services;

namespace Plms.Tests
{
    /// <summary>Codes and parameters the UI translates instead of showing backend English.</summary>
    public class Phase5TextTests
    {
        private static ApplicationDbContext NewContext() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

        [Fact]
        public async Task Readiness_ReportsCodesWithParameters()
        {
            using var context = NewContext();
            var template = new LabelTemplate { Id = Guid.NewGuid(), Name = "Raf", Code = "RAF-001", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            var version = new LabelTemplateVersion
            {
                Id = Guid.NewGuid(),
                TemplateId = template.Id,
                VersionNumber = 1,
                Status = TemplateStatus.Draft,
                LayoutJson = """{"dimensions":{"widthMm":60,"heightMm":40},"elements":[{"id":"t","type":"text","content":"{{product.unknown_field}}","xMm":1,"yMm":1,"widthMm":50,"heightMm":8}]}""",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = "author",
            };
            var product = new Product { Sku = "ZYT-0500", Name = "Sızma 500 ml" };
            context.AddRange(template, version, product);
            await context.SaveChangesAsync();

            var readiness = await new PreviewReadinessService(new VariableResolutionService(), context).EvaluateReadinessAsync(version, product);

            var codes = readiness.Issues.Select(issue => issue.Code).ToList();
            Assert.Contains("version_not_printable", codes);
            Assert.Contains("product_not_linked", codes);
            Assert.Equal("Draft", readiness.Issues.First(issue => issue.Code == "version_not_printable").Params["status"]);
            Assert.Equal(CheckIssue.Warning, readiness.Issues.First(issue => issue.Code == "product_not_linked").Severity);
            Assert.Equal(readiness.Errors.Count + readiness.Warnings.Count, readiness.Issues.Count);
        }

        [Fact]
        public async Task SafetyCheck_CarriesSnapshotIssues()
        {
            var snapshot = new PreviewReadinessDto { Status = ReadinessStatus.Blocked };
            snapshot.AddError("variable_missing", "Missing required data for variable: product.name", new() { ["name"] = "product.name" });
            var intent = new PrintIntent
            {
                Template = new LabelTemplate { Code = "RAF" },
                Version = new LabelTemplateVersion { Status = TemplateStatus.Published },
                Product = new Product { Sku = "ZYT" },
                ReadinessSnapshot = JsonSerializer.Serialize(snapshot),
            };

            var result = await new FinalSafetyCheckService().EvaluateIntentSafetyAsync(intent);

            Assert.False(result.IsSafe);
            Assert.Equal(new[] { "snapshot_blocked", "variable_missing" }, result.Issues.Select(issue => issue.Code));
            Assert.True(result.Issues[1].FromSnapshot);
            Assert.Equal("product.name", result.Issues[1].Params["name"]);
        }

        [Fact]
        public async Task AuditEntries_StoreParametersAsJson()
        {
            using var context = NewContext();
            var controller = new VendorsController(context)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "admin") }, "mock")) },
                },
            };

            Assert.IsAssignableFrom<ObjectResult>(await controller.CreateVendor(new CreateVendorDto { Code = "EGE", Name = "Ege Zeytincilik" }));

            var entry = await context.AuditLogs.SingleAsync(log => log.Action == "VendorCreated");
            using var metadata = JsonDocument.Parse(entry.Metadata);
            Assert.Equal("Ege Zeytincilik", metadata.RootElement.GetProperty("name").GetString());
            Assert.Equal("EGE", metadata.RootElement.GetProperty("code").GetString());
        }
    }
}
