using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Plms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTemplateCategoriesAndTemplateArchive : Migration
    {
        private static readonly Guid GenCategoryId = new("11111111-1111-1111-1111-111111111111");
        private static readonly Guid EtkCategoryId = new("22222222-2222-2222-2222-222222222222");
        private static readonly Guid KoliCategoryId = new("33333333-3333-3333-3333-333333333333");

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAt",
                table: "Templates",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArchivedBy",
                table: "Templates",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "Templates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "TemplateCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    NextTemplateSequence = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateCategories", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "TemplateCategories",
                columns: new[] { "Id", "Code", "Name", "IsActive", "NextTemplateSequence", "CreatedAt", "UpdatedAt" },
                values: new object[,]
                {
                    { GenCategoryId, "GEN", "General Templates", true, 1, new DateTime(2026, 3, 19, 8, 40, 58, DateTimeKind.Utc), new DateTime(2026, 3, 19, 8, 40, 58, DateTimeKind.Utc) },
                    { EtkCategoryId, "ETK", "Etiketler", true, 1, new DateTime(2026, 3, 19, 8, 40, 58, DateTimeKind.Utc), new DateTime(2026, 3, 19, 8, 40, 58, DateTimeKind.Utc) },
                    { KoliCategoryId, "KOLI", "Koli Etiketleri", true, 1, new DateTime(2026, 3, 19, 8, 40, 58, DateTimeKind.Utc), new DateTime(2026, 3, 19, 8, 40, 58, DateTimeKind.Utc) }
                });

            migrationBuilder.AddColumn<Guid>(
                name: "TemplateCategoryId",
                table: "Templates",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql($"""
                UPDATE "Templates"
                SET "TemplateCategoryId" = '{GenCategoryId}'
                WHERE "TemplateCategoryId" IS NULL;
                """);

            migrationBuilder.Sql($"""
                UPDATE "TemplateCategories"
                SET "NextTemplateSequence" = (
                    SELECT COALESCE(COUNT(*), 0) + 1
                    FROM "Templates"
                    WHERE "TemplateCategoryId" = '{GenCategoryId}'
                )
                WHERE "Id" = '{GenCategoryId}';
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "TemplateCategoryId",
                table: "Templates",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Templates_TemplateCategoryId",
                table: "Templates",
                column: "TemplateCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateCategories_Code",
                table: "TemplateCategories",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Templates_TemplateCategories_TemplateCategoryId",
                table: "Templates",
                column: "TemplateCategoryId",
                principalTable: "TemplateCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Templates_TemplateCategories_TemplateCategoryId",
                table: "Templates");

            migrationBuilder.DropTable(
                name: "TemplateCategories");

            migrationBuilder.DropIndex(
                name: "IX_Templates_TemplateCategoryId",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "ArchivedBy",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "TemplateCategoryId",
                table: "Templates");
        }
    }
}
