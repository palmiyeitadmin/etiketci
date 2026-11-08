using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Controllers;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Operational;
using Plms.Api.Models.Canonical;
using Plms.Api.Security;
using Plms.Api.Services;

namespace Plms.Tests
{
    /// <summary>Phase 2: quantity reaches the PDF, the printed label is stored, reprints are identical, outcomes are categorized.</summary>
    public class Phase2PrintTests
    {
        private const string Layout = """{"dimensions":{"widthMm":60,"heightMm":40},"elements":[{"id":"name","type":"text","content":"{{product.name}}","xMm":2,"yMm":2,"widthMm":56,"heightMm":8,"fontSizePt":10},{"id":"bc","type":"barcode","barcodeType":"CODE_128","content":"{{product.sku}}","xMm":2,"yMm":14,"widthMm":56,"heightMm":20}]}""";

        private sealed class Fixture
        {
            public required ApplicationDbContext Context { get; init; }
            public required Product Product { get; init; }
            public required LabelTemplate Template { get; init; }
            public required LabelTemplateVersion Version { get; init; }

            public PrintIntentsController Controller(string user = "operator")
            {
                var controller = new PrintIntentsController(
                    Context,
                    new PreviewReadinessService(new VariableResolutionService(), Context),
                    new FinalSafetyCheckService(),
                    new LabelRenderService(),
                    new VariableResolutionService());
                controller.ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, user), new Claim(ClaimTypes.Role, ApplicationRoles.Admin) }, "test")),
                        TraceIdentifier = Guid.NewGuid().ToString(),
                    }
                };
                return controller;
            }
        }

        private static Fixture Setup()
        {
            var context = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            var product = new Product { Sku = "SKY-PRS-LML-4000", Name = "Skyroof Prestige lamel profili 4000 mm", IsActive = true };
            var template = new LabelTemplate { Id = Guid.NewGuid(), Name = "Koli etiketi", Code = "KOL-001", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            var version = new LabelTemplateVersion { Id = Guid.NewGuid(), TemplateId = template.Id, VersionNumber = 1, Status = TemplateStatus.Published, LayoutJson = Layout, CreatedAt = DateTime.UtcNow };
            template.CurrentActiveVersionId = version.Id;
            context.AddRange(product, template, version, new ProductTemplate { ProductId = product.Id, TemplateId = template.Id, IsDefault = true });
            context.SaveChanges();
            context.ChangeTracker.Clear();
            return new Fixture { Context = context, Product = product, Template = template, Version = version };
        }

        private static T Data<T>(IActionResult result)
        {
            var ok = Assert.IsType<OkObjectResult>(result);
            var data = ok.Value!.GetType().GetProperty("data")!.GetValue(ok.Value);
            return Assert.IsType<T>(data);
        }

        private static Guid CreatedId(IActionResult result)
        {
            var ok = Assert.IsType<OkObjectResult>(result);
            var data = ok.Value!.GetType().GetProperty("data")!.GetValue(ok.Value)!;
            return (Guid)data.GetType().GetProperty("id")!.GetValue(data)!;
        }

        private static async Task<PrintIntentDetailDto> QuickAsync(Fixture f, int quantity)
        {
            var result = await f.Controller().QuickPrint(new QuickPrintDto { ProductId = f.Product.Id, TemplateId = f.Template.Id, Quantity = quantity });
            f.Context.ChangeTracker.Clear();
            return Data<PrintIntentDetailDto>(result);
        }

        [Fact]
        public async Task QuickPrint_StoresResolvedLabel_AndAuditsEveryStep()
        {
            var f = Setup();

            var intent = await QuickAsync(f, 3);

            Assert.Equal(PrintIntentStatuses.SentToClient, intent.Status);
            Assert.True(intent.HasPrintedPayload);
            Assert.Equal("station", intent.Channel);

            var stored = await f.Context.PrintIntents.SingleAsync();
            Assert.Contains("Skyroof Prestige lamel profili 4000 mm", stored.PrintedPayload);
            Assert.DoesNotContain("{{", stored.PrintedPayload);
            Assert.Equal(64, stored.PayloadSha256!.Length);

            var actions = await f.Context.AuditLogs.Select(log => log.Action).ToListAsync();
            Assert.Equal(new[] { "PrintIntentCreated", "PrintIntentHandoffConfirmed", "PrintIntentPdfDispatched" }.OrderBy(a => a), actions.OrderBy(a => a));
            var dispatched = await f.Context.AuditLogs.SingleAsync(log => log.Action == "PrintIntentPdfDispatched");
            using var metadata = JsonDocument.Parse(dispatched.Metadata);
            Assert.Equal(3, metadata.RootElement.GetProperty("quantity").GetInt32());
            Assert.Equal("SKY-PRS-LML-4000", metadata.RootElement.GetProperty("sku").GetString());
        }

        [Fact]
        public async Task PrintPdf_HasOnePagePerLabel()
        {
            var f = Setup();
            var intent = await QuickAsync(f, 4);

            var result = await f.Controller().GetPrintPdf(intent.Id);

            var file = Assert.IsType<FileContentResult>(result);
            Assert.Equal("application/pdf", file.ContentType);
            Assert.Equal(4, GoldenImageTests.CountPdfPages(file.FileContents));
        }

        [Fact]
        public async Task PrintPdf_UsesStoredLabel_WhenProductChangesLater()
        {
            var f = Setup();
            var intent = await QuickAsync(f, 1);
            var payloadBefore = (await f.Context.PrintIntents.SingleAsync()).PrintedPayload;

            var product = await f.Context.Products.SingleAsync();
            product.Name = "Yeni ad";
            await f.Context.SaveChangesAsync();
            f.Context.ChangeTracker.Clear();

            Assert.IsType<FileContentResult>(await f.Controller().GetPrintPdf(intent.Id));
            Assert.Equal(payloadBefore, (await f.Context.PrintIntents.SingleAsync()).PrintedPayload);
        }

        [Fact]
        public async Task PrintPdf_IsNotAvailableAfterTheOutcomeIsRecorded()
        {
            var f = Setup();
            var intent = await QuickAsync(f, 1);
            await f.Controller().ConfirmPrint(intent.Id);
            f.Context.ChangeTracker.Clear();

            Assert.IsType<ConflictObjectResult>(await f.Controller().GetPrintPdf(intent.Id));
        }

        [Fact]
        public async Task QuickPrint_RejectsQuantityOutOfRange()
        {
            var f = Setup();

            Assert.IsType<BadRequestObjectResult>(await f.Controller().QuickPrint(new QuickPrintDto { ProductId = f.Product.Id, TemplateId = f.Template.Id, Quantity = 0 }));
            Assert.IsType<BadRequestObjectResult>(await f.Controller().QuickPrint(new QuickPrintDto { ProductId = f.Product.Id, TemplateId = f.Template.Id, Quantity = LabelRenderService.MaxCopies + 1 }));
            Assert.Empty(await f.Context.PrintIntents.ToListAsync());
        }

        [Fact]
        public async Task QuickPrint_RequiresAPublishedVersion()
        {
            var f = Setup();
            var template = await f.Context.Templates.SingleAsync();
            template.CurrentActiveVersionId = null;
            await f.Context.SaveChangesAsync();
            f.Context.ChangeTracker.Clear();

            var result = await f.Controller().QuickPrint(new QuickPrintDto { ProductId = f.Product.Id, TemplateId = f.Template.Id, Quantity = 1 });

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Empty(await f.Context.PrintIntents.ToListAsync());
        }

        [Fact]
        public async Task Dispatch_StoresTheLabel_ForQueueRequestsToo()
        {
            var f = Setup();
            var controller = f.Controller();
            var created = await controller.CreatePrintIntent(new CreatePrintIntentDto { ProductId = f.Product.Id, TemplateId = f.Template.Id, VersionId = f.Version.Id, Quantity = 2 });
            var id = CreatedId(created);
            f.Context.ChangeTracker.Clear();
            await f.Controller().ConfirmHandoff(id);
            f.Context.ChangeTracker.Clear();

            var dispatched = Data<PrintIntentDetailDto>(await f.Controller().DispatchPdf(id));

            Assert.True(dispatched.HasPrintedPayload);
            Assert.Equal(PrintIntentStatuses.SentToClient, dispatched.Status);
        }

        [Theory]
        [InlineData(null, null)]
        [InlineData("not_a_category", null)]
        [InlineData("other", null)]
        public async Task MarkFailed_RequiresACategory_AndANoteForOther(string? category, string? note)
        {
            var f = Setup();
            var intent = await QuickAsync(f, 1);

            var result = await f.Controller().MarkFailed(intent.Id, new MarkPrintIntentFailedDto { Category = category, Reason = note });

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task MarkFailed_RecordsCategoryAndPrintedQuantity()
        {
            var f = Setup();
            var intent = await QuickAsync(f, 10);

            var failed = Data<PrintIntentDetailDto>(await f.Controller().MarkFailed(intent.Id, new MarkPrintIntentFailedDto { Category = "paper_jam", PrintedQuantity = 4 }));

            Assert.Equal(PrintIntentStatuses.Failed, failed.Status);
            Assert.Equal("paper_jam", failed.FailureCategory);
            Assert.Equal(4, failed.PrintedQuantity);
        }

        [Fact]
        public async Task Reprint_CopiesTheStoredLabel_AndLinksToTheOriginal()
        {
            var f = Setup();
            var original = await QuickAsync(f, 5);
            await f.Controller().ConfirmPrint(original.Id);
            f.Context.ChangeTracker.Clear();

            var reprint = Data<PrintIntentDetailDto>(await f.Controller("second-operator").Reprint(original.Id, new ReprintDto { Reason = "damaged", Quantity = 2 }));
            f.Context.ChangeTracker.Clear();

            Assert.Equal(PrintIntentStatuses.ReadyForPrint, reprint.Status);
            Assert.Equal(original.Id, reprint.ReprintOfId);
            Assert.Equal("damaged", reprint.ReprintReason);
            Assert.Equal(2, reprint.Quantity);

            var stored = await f.Context.PrintIntents.ToDictionaryAsync(pi => pi.Id);
            Assert.Equal(stored[original.Id].PrintedPayload, stored[reprint.Id].PrintedPayload);
            Assert.Equal(stored[original.Id].PayloadSha256, stored[reprint.Id].PayloadSha256);

            // The original shows the reprint in its history and detail.
            Assert.Contains(await f.Context.AuditLogs.ToListAsync(), log => log.EntityId == original.Id.ToString() && log.Action == "PrintIntentReprinted");
            var originalDetail = Data<PrintIntentDetailDto>(await f.Controller().GetPrintIntent(original.Id));
            Assert.Single(originalDetail.Reprints);

            // Dispatching the reprint keeps the copied label.
            var dispatched = Data<PrintIntentDetailDto>(await f.Controller().DispatchPdf(reprint.Id));
            f.Context.ChangeTracker.Clear();
            Assert.Equal(PrintIntentStatuses.SentToClient, dispatched.Status);
            Assert.Equal(stored[original.Id].PayloadSha256, (await f.Context.PrintIntents.SingleAsync(pi => pi.Id == reprint.Id)).PayloadSha256);
        }

        [Fact]
        public async Task Reprint_RejectsOpenRequests_AndMissingReason()
        {
            var f = Setup();
            var open = await QuickAsync(f, 1);

            Assert.IsType<BadRequestObjectResult>(await f.Controller().Reprint(open.Id, new ReprintDto { Reason = "lost", Quantity = 1 }));

            await f.Controller().ConfirmPrint(open.Id);
            f.Context.ChangeTracker.Clear();
            Assert.IsType<BadRequestObjectResult>(await f.Controller().Reprint(open.Id, new ReprintDto { Reason = null, Quantity = 1 }));
            Assert.IsType<BadRequestObjectResult>(await f.Controller().Reprint(open.Id, new ReprintDto { Reason = "other", Quantity = 1 }));
        }

        [Fact]
        public async Task List_IsPagedWithStatusCounts_WhenAPageIsRequested()
        {
            var f = Setup();
            for (var i = 0; i < 3; i++) await QuickAsync(f, 1);
            var printed = await QuickAsync(f, 1);
            await f.Controller().ConfirmPrint(printed.Id);
            f.Context.ChangeTracker.Clear();

            var result = Assert.IsType<OkObjectResult>(await f.Controller().GetPrintIntents(status: PrintIntentStatuses.SentToClient, awaitingOlderThanMinutes: null, productId: null, reprintOf: null, search: "sky", page: 1, pageSize: 2));
            var data = result.Value!.GetType().GetProperty("data")!.GetValue(result.Value)!;
            var items = (IEnumerable<PrintIntentDto>)data.GetType().GetProperty("items")!.GetValue(data)!;
            var total = (int)data.GetType().GetProperty("total")!.GetValue(data)!;
            var counts = (Dictionary<string, int>)data.GetType().GetProperty("counts")!.GetValue(data)!;

            Assert.Equal(2, items.Count());
            Assert.Equal(3, total);
            Assert.Equal(3, counts[PrintIntentStatuses.SentToClient]);
            Assert.Equal(1, counts[PrintIntentStatuses.UserPrinted]);
        }
    }
}
