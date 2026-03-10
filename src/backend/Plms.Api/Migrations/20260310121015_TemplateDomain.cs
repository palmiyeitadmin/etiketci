using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Plms.Api.Migrations
{
    /// <inheritdoc />
    public partial class TemplateDomain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Templates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CurrentActiveVersionId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Templates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TemplateVersions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    VersionNumber = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    LayoutJson = table.Column<string>(type: "jsonb", nullable: false),
                    ChangeNotes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TemplateVersions_Templates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "Templates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Templates_Code",
                table: "Templates",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Templates_CurrentActiveVersionId",
                table: "Templates",
                column: "CurrentActiveVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateVersions_TemplateId",
                table: "TemplateVersions",
                column: "TemplateId");

            migrationBuilder.AddForeignKey(
                name: "FK_Templates_TemplateVersions_CurrentActiveVersionId",
                table: "Templates",
                column: "CurrentActiveVersionId",
                principalTable: "TemplateVersions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Templates_TemplateVersions_CurrentActiveVersionId",
                table: "Templates");

            migrationBuilder.DropTable(
                name: "TemplateVersions");

            migrationBuilder.DropTable(
                name: "Templates");
        }
    }
}
