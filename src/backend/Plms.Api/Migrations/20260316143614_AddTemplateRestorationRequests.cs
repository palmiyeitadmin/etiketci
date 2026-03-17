using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Plms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTemplateRestorationRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TemplateRestorationRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    BusinessJustification = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    TargetEnvironment = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    RequestedUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RequestedBy = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ReviewComments = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ReviewedBy = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RestoredVersionId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateRestorationRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TemplateRestorationRequests_TemplateVersions_RestoredVersio~",
                        column: x => x.RestoredVersionId,
                        principalTable: "TemplateVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TemplateRestorationRequests_TemplateVersions_TemplateVersio~",
                        column: x => x.TemplateVersionId,
                        principalTable: "TemplateVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TemplateRestorationRequests_Templates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "Templates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TemplateRestorationRequests_RestoredVersionId",
                table: "TemplateRestorationRequests",
                column: "RestoredVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateRestorationRequests_TemplateId",
                table: "TemplateRestorationRequests",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateRestorationRequests_TemplateVersionId",
                table: "TemplateRestorationRequests",
                column: "TemplateVersionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TemplateRestorationRequests");
        }
    }
}
