using System;
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
using Plms.Api.DTOs.Operational;
using Plms.Api.Models.Operational;
using Plms.Api.Services;
using Xunit;

namespace Plms.Tests
{
    public class PrintIntentLifecycleTests
    {
        private ApplicationDbContext GetInMemoryContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;
            return new ApplicationDbContext(options);
        }

        private PrintIntentsController CreateController(ApplicationDbContext context)
        {
            var readinessMock = new Mock<IPreviewReadinessService>();
            readinessMock.Setup(x => x.EvaluateReadinessAsync(It.IsAny<LabelTemplateVersion>(), It.IsAny<Product>()))
                .ReturnsAsync(new PreviewReadinessDto { Status = ReadinessStatus.Ready });

            var safetyMock = new Mock<IFinalSafetyCheckService>();
            safetyMock.Setup(x => x.EvaluateIntentSafetyAsync(It.IsAny<PrintIntent>()))
                .ReturnsAsync(new FinalSafetyCheckResult { IsSafe = true, Status = ReadinessStatus.Ready });

            var controller = new PrintIntentsController(context, readinessMock.Object, safetyMock.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] {
                new Claim(ClaimTypes.Name, "testuser")
            }, "mock"));

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };

            return controller;
        }

        [Fact]
        public async Task CreatePrintIntent_ShouldStartAsPending()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var product = new Product { Id = Guid.NewGuid(), Sku = "SKU1", Name = "Prod1" };
            var template = new LabelTemplate { Id = Guid.NewGuid(), Name = "Tpl1", Code = "T1" };
            var version = new LabelTemplateVersion { Id = Guid.NewGuid(), TemplateId = template.Id, Status = TemplateStatus.Published };

            context.Products.Add(product);
            context.Templates.Add(template);
            context.TemplateVersions.Add(version);
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            var dto = new CreatePrintIntentDto
            {
                ProductId = product.Id,
                TemplateId = template.Id,
                VersionId = version.Id,
                Quantity = 10
            };

            var result = await controller.CreatePrintIntent(dto);

            Assert.IsType<OkObjectResult>(result);

            var intent = await context.PrintIntents.FirstOrDefaultAsync();
            Assert.NotNull(intent);
            Assert.Equal("Pending", intent.Status);
        }

        [Fact]
        public async Task ApproveHandoff_ValidPending_TransitionsToReadyForPrint()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var product = new Product { Id = Guid.NewGuid(), Sku = "SKU1", Name = "Prod1" };
            var template = new LabelTemplate { Id = Guid.NewGuid(), Name = "Tpl1", Code = "T1" };
            var version = new LabelTemplateVersion { Id = Guid.NewGuid(), TemplateId = template.Id, Status = TemplateStatus.Published };
            context.Products.Add(product);
            context.Templates.Add(template);
            context.TemplateVersions.Add(version);

            var intent = new PrintIntent { Id = Guid.NewGuid(), ProductId = product.Id, TemplateId = template.Id, VersionId = version.Id, Status = "Pending", Quantity = 1 };
            context.PrintIntents.Add(intent);
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            
            var result = await controller.ApproveHandoff(intent.Id);
            
            Assert.IsType<OkObjectResult>(result);
            var updatedIntent = await context.PrintIntents.FindAsync(intent.Id);
            Assert.Equal("ReadyForPrint", updatedIntent?.Status);
            Assert.NotNull(updatedIntent?.OperatorReviewedBy);
            Assert.NotNull(updatedIntent?.OperatorReviewedAt);
        }

        [Fact]
        public async Task ApproveHandoff_InvalidStatus_Fails()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var product = new Product { Id = Guid.NewGuid(), Sku = "SKU1", Name = "Prod1" };
            var template = new LabelTemplate { Id = Guid.NewGuid(), Name = "Tpl1", Code = "T1" };
            var version = new LabelTemplateVersion { Id = Guid.NewGuid(), TemplateId = template.Id, Status = TemplateStatus.Published };
            context.Products.Add(product);
            context.Templates.Add(template);
            context.TemplateVersions.Add(version);

            var intent = new PrintIntent { Id = Guid.NewGuid(), ProductId = product.Id, TemplateId = template.Id, VersionId = version.Id, Status = "ReadyForPrint", Quantity = 1 };
            context.PrintIntents.Add(intent);
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            
            var result = await controller.ApproveHandoff(intent.Id);
            
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("cannot be approved", badRequest.Value?.ToString() ?? "");
        }

        [Fact]
        public async Task CancelIntent_FromPending_TransitionsToCancelled()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var intent = new PrintIntent { Id = Guid.NewGuid(), Status = "Pending", Quantity = 1 };
            context.PrintIntents.Add(intent);
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            
            var result = await controller.CancelIntent(intent.Id);
            
            Assert.IsType<OkObjectResult>(result);
            var updatedIntent = await context.PrintIntents.FindAsync(intent.Id);
            Assert.Equal("Cancelled", updatedIntent?.Status);
        }

        [Fact]
        public async Task CancelIntent_FromReadyForPrint_TransitionsToCancelled()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var intent = new PrintIntent { Id = Guid.NewGuid(), Status = "ReadyForPrint", Quantity = 1 };
            context.PrintIntents.Add(intent);
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            
            var result = await controller.CancelIntent(intent.Id);
            
            Assert.IsType<OkObjectResult>(result);
            var updatedIntent = await context.PrintIntents.FindAsync(intent.Id);
            Assert.Equal("Cancelled", updatedIntent?.Status);
        }
        
        [Fact]
        public async Task CancelIntent_InvalidStatus_Fails()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var intent = new PrintIntent { Id = Guid.NewGuid(), Status = "Cancelled", Quantity = 1 };
            context.PrintIntents.Add(intent);
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            
            var result = await controller.CancelIntent(intent.Id);
            
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("cannot be cancelled", badRequest.Value?.ToString() ?? "");
        }
    }
}
