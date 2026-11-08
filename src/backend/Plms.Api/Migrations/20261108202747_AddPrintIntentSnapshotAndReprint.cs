using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Plms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPrintIntentSnapshotAndReprint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "PrintIntents",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FailureCategory",
                table: "PrintIntents",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayloadSha256",
                table: "PrintIntents",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrintedPayload",
                table: "PrintIntents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PrintedQuantity",
                table: "PrintIntents",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReprintNote",
                table: "PrintIntents",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReprintOfId",
                table: "PrintIntents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReprintReason",
                table: "PrintIntents",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PrintIntents_ReprintOfId",
                table: "PrintIntents",
                column: "ReprintOfId");

            migrationBuilder.CreateIndex(
                name: "IX_PrintIntents_Status_DispatchedAt",
                table: "PrintIntents",
                columns: new[] { "Status", "DispatchedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_PrintIntents_PrintIntents_ReprintOfId",
                table: "PrintIntents",
                column: "ReprintOfId",
                principalTable: "PrintIntents",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PrintIntents_PrintIntents_ReprintOfId",
                table: "PrintIntents");

            migrationBuilder.DropIndex(
                name: "IX_PrintIntents_ReprintOfId",
                table: "PrintIntents");

            migrationBuilder.DropIndex(
                name: "IX_PrintIntents_Status_DispatchedAt",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "Channel",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "FailureCategory",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "PayloadSha256",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "PrintedPayload",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "PrintedQuantity",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "ReprintNote",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "ReprintOfId",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "ReprintReason",
                table: "PrintIntents");
        }
    }
}
