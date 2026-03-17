using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Plms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPrintIntentLifecycleFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "PrintIntents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompletedBy",
                table: "PrintIntents",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DispatchedAt",
                table: "PrintIntents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DispatchedBy",
                table: "PrintIntents",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FailureReason",
                table: "PrintIntents",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "CompletedBy",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "DispatchedAt",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "DispatchedBy",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "FailureReason",
                table: "PrintIntents");
        }
    }
}
