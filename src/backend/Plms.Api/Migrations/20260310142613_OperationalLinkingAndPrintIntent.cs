using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Plms.Api.Migrations
{
    /// <inheritdoc />
    public partial class OperationalLinkingAndPrintIntent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PrintIntents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    VersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RequestedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrintIntents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrintIntents_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PrintIntents_TemplateVersions_VersionId",
                        column: x => x.VersionId,
                        principalTable: "TemplateVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PrintIntents_Templates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "Templates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductTemplates_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductTemplates_Templates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "Templates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PrintIntents_ProductId",
                table: "PrintIntents",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PrintIntents_TemplateId",
                table: "PrintIntents",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_PrintIntents_VersionId",
                table: "PrintIntents",
                column: "VersionId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductTemplates_ProductId",
                table: "ProductTemplates",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductTemplates_TemplateId",
                table: "ProductTemplates",
                column: "TemplateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PrintIntents");

            migrationBuilder.DropTable(
                name: "ProductTemplates");
        }
    }
}
