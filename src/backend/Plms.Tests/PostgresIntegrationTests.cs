using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Plms.Api.Controllers;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.Security;

namespace Plms.Tests
{
    /// <summary>
    /// Runs against a real PostgreSQL server, because the in-memory provider accepts queries that Npgsql cannot translate.
    /// Set PLMS_TEST_POSTGRES to a connection string for a server where the user may create databases,
    /// e.g. "Host=localhost;Username=postgres;Password=postgres". Without it these tests are skipped.
    /// </summary>
    public class PostgresIntegrationTests : IAsyncLifetime
    {
        private static readonly string? BaseConnectionString = Environment.GetEnvironmentVariable("PLMS_TEST_POSTGRES");
        private readonly string _databaseName = "plms_test_" + Guid.NewGuid().ToString("N")[..12];
        private ApplicationDbContext? _context;

        private ApplicationDbContext Context => _context ?? throw new InvalidOperationException("Context not initialized.");

        public async ValueTask InitializeAsync()
        {
            if (string.IsNullOrWhiteSpace(BaseConnectionString))
            {
                return;
            }

            var builder = new NpgsqlConnectionStringBuilder(BaseConnectionString) { Database = _databaseName };
            var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(builder.ConnectionString).Options;
            _context = new ApplicationDbContext(options);
            await _context.Database.MigrateAsync();
        }

        public async ValueTask DisposeAsync()
        {
            if (_context != null)
            {
                await _context.Database.EnsureDeletedAsync();
                await _context.DisposeAsync();
            }
        }

        private static void RequirePostgres() =>
            Assert.SkipWhen(string.IsNullOrWhiteSpace(BaseConnectionString), "PLMS_TEST_POSTGRES is not set.");

        private async Task<(Product Product, PrintIntent Intent)> SeedPrintIntentAsync(string status)
        {
            var category = new TemplateCategory { Id = Guid.NewGuid(), Code = "RAF", Name = "Raf etiketi", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            var template = new LabelTemplate { Id = Guid.NewGuid(), Name = "Raf etiketi 60x40", Code = "RAF-001", TemplateCategoryId = category.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            var version = new LabelTemplateVersion { Id = Guid.NewGuid(), TemplateId = template.Id, VersionNumber = 1, Status = TemplateStatus.Published, LayoutJson = "{}", CreatedAt = DateTime.UtcNow };
            var product = new Product { Sku = "ZYT-0500-" + Guid.NewGuid().ToString("N")[..6], Name = "Sızma zeytinyağı 500 ml" };
            var intent = new PrintIntent
            {
                Id = Guid.NewGuid(), ProductId = product.Id, TemplateId = template.Id, VersionId = version.Id,
                Quantity = 12, Status = status, RequestedBy = "operator", CreatedAt = DateTime.UtcNow,
            };

            Context.AddRange(category, template, version, product, intent);
            await Context.SaveChangesAsync();
            Context.ChangeTracker.Clear();
            return (product, intent);
        }

        private ProductsController ProductsControllerAsAdmin() => new(Context, null!)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "admin"), new Claim(ClaimTypes.Role, ApplicationRoles.Admin) }, "test")),
                    TraceIdentifier = Guid.NewGuid().ToString(),
                }
            }
        };

        [Fact]
        public async Task DeleteProduct_WithOpenPrintIntent_IsRejectedWithoutSqlTranslationError()
        {
            RequirePostgres();
            var (product, _) = await SeedPrintIntentAsync(PrintIntentStatuses.Pending);

            var result = await ProductsControllerAsAdmin().DeleteProduct(product.Id);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task DeleteProduct_WithFinishedPrintIntent_KeepsHistory()
        {
            RequirePostgres();
            var (product, intent) = await SeedPrintIntentAsync(PrintIntentStatuses.UserPrinted);

            var result = await ProductsControllerAsAdmin().DeleteProduct(product.Id);

            Assert.IsType<OkObjectResult>(result);
            Context.ChangeTracker.Clear();
            Assert.False((await Context.Products.SingleAsync(p => p.Id == product.Id)).IsActive);
            Assert.True(await Context.PrintIntents.AnyAsync(pi => pi.Id == intent.Id));
        }

        [Fact]
        public async Task PrintIntentForeignKey_RestrictsHardDelete()
        {
            RequirePostgres();
            var (product, _) = await SeedPrintIntentAsync(PrintIntentStatuses.UserPrinted);

            Context.Products.Remove(await Context.Products.SingleAsync(p => p.Id == product.Id));

            await Assert.ThrowsAsync<DbUpdateException>(() => Context.SaveChangesAsync());
        }
    }
}
