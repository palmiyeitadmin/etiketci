using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Plms.Api.Controllers;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.Services;

namespace Plms.Tests
{
    /// <summary>Failed responses carry a stable code (and params) next to the English message, so the UI can translate them.</summary>
    public class ApiErrorCodeTests
    {
        private static ApplicationDbContext NewContext() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        private static ControllerContext ContextFor(string userName) => new()
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, userName) }, "mock")),
                TraceIdentifier = Guid.NewGuid().ToString(),
            }
        };

        private static PrintIntentsController PrintIntents(ApplicationDbContext context) => new(
            context,
            new Mock<IPreviewReadinessService>().Object,
            new Mock<IFinalSafetyCheckService>().Object,
            new LabelRenderService(),
            new VariableResolutionService()) { ControllerContext = ContextFor("operator") };

        /// <summary>The body as the browser sees it (ASP.NET Core's web JSON defaults).</summary>
        private static JsonElement Json(object? value) =>
            JsonDocument.Parse(JsonSerializer.Serialize(value, new JsonSerializerOptions(JsonSerializerDefaults.Web))).RootElement;

        [Fact]
        public async Task NotFound_CarriesCodeAndKeepsEnglishMessage()
        {
            using var context = NewContext();
            var controller = new VendorsController(context) { ControllerContext = ContextFor("admin") };

            var result = Assert.IsType<NotFoundObjectResult>(await controller.GetVendor(Guid.NewGuid()));

            var body = Assert.IsType<ApiErrorBody>(result.Value);
            Assert.Equal("vendor_not_found", body.Code);
            Assert.Equal("Vendor not found.", body.Error);
            var json = Json(result.Value);
            Assert.False(json.GetProperty("success").GetBoolean());
            Assert.Equal("vendor_not_found", json.GetProperty("code").GetString());
            Assert.False(json.TryGetProperty("params", out _));
        }

        [Fact]
        public async Task StatusError_PassesTheRawStatusAsParam()
        {
            using var context = NewContext();
            var intent = new PrintIntent { Id = Guid.NewGuid(), Status = PrintIntentStatuses.UserPrinted, Quantity = 1, RequestedBy = "operator" };
            context.PrintIntents.Add(intent);
            await context.SaveChangesAsync();

            var result = Assert.IsType<BadRequestObjectResult>(await PrintIntents(context).CancelIntent(intent.Id));

            var json = Json(result.Value);
            Assert.Equal("intent_cannot_cancel", json.GetProperty("code").GetString());
            Assert.Equal("Intent cannot be cancelled from 'UserPrinted' state.", json.GetProperty("error").GetString());
            Assert.Equal("UserPrinted", json.GetProperty("params").GetProperty("status").GetString());
        }

        [Fact]
        public async Task MissingPrintIntent_UsesOneCodeAcrossActions()
        {
            using var context = NewContext();
            var controller = PrintIntents(context);
            var missing = Guid.NewGuid();

            foreach (var result in new[] { await controller.GetPrintIntent(missing), await controller.ConfirmHandoff(missing), await controller.CancelIntent(missing) })
            {
                var notFound = Assert.IsType<NotFoundObjectResult>(result);
                Assert.Equal("print_intent_not_found", Assert.IsType<ApiErrorBody>(notFound.Value).Code);
            }
        }

        [Fact]
        public void Params_AreCamelCaseStrings_AndListsAreJoined()
        {
            var body = ApiError.Of("unknown_permissions", "Unknown permissions: a, b", new { Permissions = new[] { "a", "b" }, max = 2000 });

            var parameters = Json(body).GetProperty("params");
            Assert.Equal("a, b", parameters.GetProperty("permissions").GetString());
            Assert.Equal("2000", parameters.GetProperty("max").GetString());
        }

        [Fact]
        public void IdentityErrors_KeepEachRuleCodeAndJoinTheDescriptions()
        {
            var describer = new IdentityErrorDescriber();
            var body = ApiError.Identity(new[] { describer.PasswordTooShort(8), describer.DuplicateEmail("a@b.c") });

            var json = Json(body);
            Assert.Equal("identity_error", json.GetProperty("code").GetString());
            Assert.Equal($"{describer.PasswordTooShort(8).Description} {describer.DuplicateEmail("a@b.c").Description}", json.GetProperty("error").GetString());
            var errors = json.GetProperty("errors").EnumerateArray().ToList();
            Assert.Equal("PasswordTooShort", errors[0].GetProperty("code").GetString());
            Assert.Equal("8", errors[0].GetProperty("params").GetProperty("n").GetString());
            Assert.Equal("DuplicateEmail", errors[1].GetProperty("code").GetString());
            Assert.Equal("a@b.c", errors[1].GetProperty("params").GetProperty("value").GetString());
        }

        [Fact]
        public void ServiceErrors_KeepTheirCode_OtherExceptionsGetTheFallback()
        {
            var coded = ApiError.From(new ApiErrorException("import_session_not_ready", "Import session is not ready to commit."), "import_commit_failed");
            Assert.Equal("import_session_not_ready", coded.Code);
            Assert.Equal("Import session is not ready to commit.", coded.Error);

            var plain = ApiError.From(new InvalidOperationException("Boom."), "import_commit_failed");
            Assert.Equal("import_commit_failed", plain.Code);
            Assert.Equal("Boom.", plain.Error);
        }

        /// <summary>Every error a controller writes goes through ApiError (the two readiness/safety bodies carry their code and details inline).</summary>
        [Fact]
        public void Controllers_DoNotWriteUncodedErrors()
        {
            var directory = new DirectoryInfo(AppContext.BaseDirectory);
            while (directory != null && !Directory.Exists(Path.Combine(directory.FullName, "src", "backend", "Plms.Api", "Controllers")))
            {
                directory = directory.Parent;
            }
            Assert.SkipWhen(directory == null, "Controller sources are not available next to the test binaries.");

            var inline = new Regex(@"new \{ success = false, (error|errors) = (?<rest>[^\r\n]*)");
            var offenders = Directory.GetFiles(Path.Combine(directory!.FullName, "src", "backend", "Plms.Api", "Controllers"), "*.cs")
                .SelectMany(file => File.ReadAllLines(file).Select((line, index) => (file: Path.GetFileName(file), number: index + 1, line)))
                .Where(entry => inline.Match(entry.line) is { Success: true } match && !match.Groups["rest"].Value.Contains("code = \""))
                .Select(entry => $"{entry.file}:{entry.number}: {entry.line.Trim()}")
                .ToList();

            Assert.Empty(offenders);
        }
    }
}
