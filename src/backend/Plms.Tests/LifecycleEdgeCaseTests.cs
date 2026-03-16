using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Plms.Api.Controllers;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Product;
using Plms.Api.Models.Operational;
using Plms.Api.Services;
using Xunit;

namespace Plms.Tests
{
    public class LifecycleEdgeCaseTests
    {
        private ApplicationDbContext GetInMemoryContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;
            return new ApplicationDbContext(options);
        }

        private PrintIntentsController CreateIntentsController(ApplicationDbContext context, bool isSafe = true)
        {
            var readinessMock = new Mock<IPreviewReadinessService>();
            var safetyMock = new Mock<IFinalSafetyCheckService>();
            
            safetyMock.Setup(x => x.EvaluateIntentSafetyAsync(It.IsAny<PrintIntent>()))
                .ReturnsAsync(new FinalSafetyCheckResult 
                { 
                    IsSafe = isSafe, 
                    Status = isSafe ? ReadinessStatus.Ready : ReadinessStatus.Blocked,
                    Messages = isSafe ? new() : new() { "Test failure" }
                });

            var controller = new PrintIntentsController(context, readinessMock.Object, safetyMock.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "testuser") }, "mock")) }
            };
            return controller;
        }

        [Fact]
        public async Task ApproveHandoff_SafetyFailure_LogsAudit()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);
            
            var product = new Product { Id = Guid.NewGuid(), Sku = "S1", Name = "P1" };
            var template = new LabelTemplate { Id = Guid.NewGuid(), Name = "T1", Code = "C1" };
            var version = new LabelTemplateVersion { Id = Guid.NewGuid(), TemplateId = template.Id, VersionNumber = 1, Status = TemplateStatus.Published };
            context.Products.Add(product);
            context.Templates.Add(template);
            context.TemplateVersions.Add(version);

            var intent = new PrintIntent 
            { 
                Id = Guid.NewGuid(), 
                Status = "Pending", 
                Quantity = 1,
                ProductId = product.Id,
                TemplateId = template.Id,
                VersionId = version.Id
            };
            context.PrintIntents.Add(intent);
            await context.SaveChangesAsync();

            var controller = CreateIntentsController(context, isSafe: false);
            var result = await controller.ConfirmHandoff(intent.Id);

            Assert.IsType<BadRequestObjectResult>(result);
            
            var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "PrintIntentHandoffFailed");
            Assert.NotNull(audit);
            Assert.Contains("Test failure", audit.Details);
        }

        [Fact]
        public async Task DeleteProduct_WithActiveIntent_ReturnsBadRequest()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var product = new Product { Id = Guid.NewGuid(), Sku = "SKU1", Name = "P1" };
            context.Products.Add(product);
            
            var intent = new PrintIntent { Id = Guid.NewGuid(), ProductId = product.Id, Status = "Pending", Quantity = 1 };
            context.PrintIntents.Add(intent);
            await context.SaveChangesAsync();

            var controller = new ProductsController(context, null!);
            var result = await controller.DeleteProduct(product.Id);

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.True(await context.Products.AnyAsync(p => p.Id == product.Id));
        }

        [Fact]
        public async Task DeleteTemplate_WithActiveIntent_ReturnsBadRequest()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var template = new LabelTemplate { Id = Guid.NewGuid(), Name = "T1", Code = "C1" };
            context.Templates.Add(template);
            
            var intent = new PrintIntent { Id = Guid.NewGuid(), TemplateId = template.Id, Status = "ReadyForPrint", Quantity = 1 };
            context.PrintIntents.Add(intent);
            await context.SaveChangesAsync();

            var controller = new TemplatesController(context, null!, null!, null!);
            var result = await controller.DeleteTemplate(template.Id);

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.True(await context.Templates.AnyAsync(t => t.Id == template.Id));
        }
    }
}
