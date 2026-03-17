using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Controllers;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Domain.Enums;
using Plms.Api.DTOs.Template;

namespace Plms.Tests
{
    public class TemplateVersionWorkflowTests
    {
        private static ApplicationDbContext GetInMemoryContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;
            return new ApplicationDbContext(options);
        }

        private static TemplatesController CreateController(ApplicationDbContext context, string userName = "testuser")
        {
            var controller = new TemplatesController(context, null!, null!, null!);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, userName) }, "mock")),
                    TraceIdentifier = Guid.NewGuid().ToString(),
                }
            };
            return controller;
        }

        [Fact]
        public async Task UpdateVersion_Draft_UpdatesTemplateAndWritesAuditLog()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var template = new LabelTemplate
            {
                Id = Guid.NewGuid(),
                Name = "Template",
                Code = "TPL-001",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                UpdatedAt = DateTime.UtcNow.AddDays(-1),
                IsActive = true
            };
            var version = new LabelTemplateVersion
            {
                Id = Guid.NewGuid(),
                TemplateId = template.Id,
                VersionNumber = 2,
                Status = TemplateStatus.Draft,
                LayoutJson = "{\"name\":\"old\"}",
                ChangeNotes = "old notes",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                CreatedBy = "operator"
            };

            context.Templates.Add(template);
            context.TemplateVersions.Add(version);
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            var beforeUpdate = template.UpdatedAt;

            var result = await controller.UpdateVersion(template.Id, version.Id, new UpdateTemplateVersionDto
            {
                LayoutJson = "{\"name\":\"new\"}",
                ChangeNotes = "saved from editor"
            });

            Assert.IsType<OkObjectResult>(result);

            var updatedVersion = await context.TemplateVersions.FindAsync(version.Id);
            var updatedTemplate = await context.Templates.FindAsync(template.Id);
            var auditLog = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "TemplateDraftSaved" && a.EntityId == version.Id.ToString());

            Assert.NotNull(updatedVersion);
            Assert.Equal("{\"name\":\"new\"}", updatedVersion!.LayoutJson);
            Assert.Equal("saved from editor", updatedVersion.ChangeNotes);
            Assert.NotNull(updatedTemplate);
            Assert.True(updatedTemplate!.UpdatedAt > beforeUpdate);
            Assert.NotNull(auditLog);
            Assert.Contains("Draft version 2 saved.", auditLog!.Details);
            Assert.Contains("LayoutChanged=True", auditLog.Details);
            Assert.Contains("ChangeNotesChanged=True", auditLog.Details);
        }

        [Fact]
        public async Task UpdateVersion_NonDraft_ReturnsBadRequestWithoutAuditLog()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var template = new LabelTemplate
            {
                Id = Guid.NewGuid(),
                Name = "Template",
                Code = "TPL-002",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                UpdatedAt = DateTime.UtcNow.AddDays(-1),
                IsActive = true
            };
            var version = new LabelTemplateVersion
            {
                Id = Guid.NewGuid(),
                TemplateId = template.Id,
                VersionNumber = 3,
                Status = TemplateStatus.Approved,
                LayoutJson = "{\"name\":\"approved\"}",
                CreatedAt = DateTime.UtcNow.AddHours(-3),
                CreatedBy = "reviewer"
            };

            context.Templates.Add(template);
            context.TemplateVersions.Add(version);
            await context.SaveChangesAsync();

            var controller = CreateController(context);

            var result = await controller.UpdateVersion(template.Id, version.Id, new UpdateTemplateVersionDto
            {
                LayoutJson = "{\"name\":\"ignored\"}",
                ChangeNotes = "ignored"
            });

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.False(await context.AuditLogs.AnyAsync(a => a.Action == "TemplateDraftSaved" && a.EntityId == version.Id.ToString()));
        }

        [Fact]
        public async Task PublishTemplate_ApprovedVersion_BecomesActiveAndDeprecatesOldVersion()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = GetInMemoryContext(dbName);

            var oldActive = new LabelTemplateVersion
            {
                Id = Guid.NewGuid(),
                VersionNumber = 1,
                Status = TemplateStatus.Published,
                LayoutJson = "{\"name\":\"old\"}",
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                CreatedBy = "operator"
            };
            var approved = new LabelTemplateVersion
            {
                Id = Guid.NewGuid(),
                VersionNumber = 2,
                Status = TemplateStatus.Approved,
                LayoutJson = "{\"name\":\"new\"}",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                CreatedBy = "operator"
            };
            var template = new LabelTemplate
            {
                Id = Guid.NewGuid(),
                Name = "Template",
                Code = "TPL-003",
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = DateTime.UtcNow.AddDays(-1),
                IsActive = true,
                CurrentActiveVersionId = oldActive.Id,
                Versions = new List<LabelTemplateVersion>()
            };

            oldActive.TemplateId = template.Id;
            approved.TemplateId = template.Id;
            template.Versions.Add(oldActive);
            template.Versions.Add(approved);

            context.Templates.Add(template);
            context.TemplateVersions.AddRange(oldActive, approved);
            await context.SaveChangesAsync();

            var controller = CreateController(context, "reviewer");

            var result = await controller.PublishTemplate(template.Id, approved.Id);

            Assert.IsType<OkObjectResult>(result);

            var updatedTemplate = await context.Templates.Include(t => t.Versions).FirstAsync(t => t.Id == template.Id);
            var publishedVersion = updatedTemplate.Versions.First(v => v.Id == approved.Id);
            var deprecatedVersion = updatedTemplate.Versions.First(v => v.Id == oldActive.Id);

            Assert.Equal(approved.Id, updatedTemplate.CurrentActiveVersionId);
            Assert.Equal(TemplateStatus.Published, publishedVersion.Status);
            Assert.Equal(TemplateStatus.Deprecated, deprecatedVersion.Status);
        }
    }
}
