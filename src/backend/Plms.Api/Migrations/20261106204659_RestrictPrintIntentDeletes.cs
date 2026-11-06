using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Plms.Api.Migrations
{
    /// <inheritdoc />
    public partial class RestrictPrintIntentDeletes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PrintIntents_Products_ProductId",
                table: "PrintIntents");

            migrationBuilder.DropForeignKey(
                name: "FK_PrintIntents_TemplateVersions_VersionId",
                table: "PrintIntents");

            migrationBuilder.DropForeignKey(
                name: "FK_PrintIntents_Templates_TemplateId",
                table: "PrintIntents");

            migrationBuilder.AddForeignKey(
                name: "FK_PrintIntents_Products_ProductId",
                table: "PrintIntents",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PrintIntents_TemplateVersions_VersionId",
                table: "PrintIntents",
                column: "VersionId",
                principalTable: "TemplateVersions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PrintIntents_Templates_TemplateId",
                table: "PrintIntents",
                column: "TemplateId",
                principalTable: "Templates",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PrintIntents_Products_ProductId",
                table: "PrintIntents");

            migrationBuilder.DropForeignKey(
                name: "FK_PrintIntents_TemplateVersions_VersionId",
                table: "PrintIntents");

            migrationBuilder.DropForeignKey(
                name: "FK_PrintIntents_Templates_TemplateId",
                table: "PrintIntents");

            migrationBuilder.AddForeignKey(
                name: "FK_PrintIntents_Products_ProductId",
                table: "PrintIntents",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PrintIntents_TemplateVersions_VersionId",
                table: "PrintIntents",
                column: "VersionId",
                principalTable: "TemplateVersions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PrintIntents_Templates_TemplateId",
                table: "PrintIntents",
                column: "TemplateId",
                principalTable: "Templates",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
