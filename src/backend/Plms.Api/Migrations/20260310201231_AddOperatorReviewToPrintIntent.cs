using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Plms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOperatorReviewToPrintIntent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "OperatorReviewedAt",
                table: "PrintIntents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OperatorReviewedBy",
                table: "PrintIntents",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OperatorReviewedAt",
                table: "PrintIntents");

            migrationBuilder.DropColumn(
                name: "OperatorReviewedBy",
                table: "PrintIntents");
        }
    }
}
