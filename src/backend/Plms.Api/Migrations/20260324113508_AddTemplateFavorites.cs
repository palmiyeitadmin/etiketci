using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Plms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTemplateFavorites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TemplateFavorites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateFavorites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TemplateFavorites_Templates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "Templates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TemplateFavorites_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TemplateFavorites_TemplateId_UserId",
                table: "TemplateFavorites",
                columns: new[] { "TemplateId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TemplateFavorites_UserId",
                table: "TemplateFavorites",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TemplateFavorites");
        }
    }
}
