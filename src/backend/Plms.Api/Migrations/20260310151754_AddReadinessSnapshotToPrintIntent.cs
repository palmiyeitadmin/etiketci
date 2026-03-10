using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Plms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReadinessSnapshotToPrintIntent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReadinessSnapshot",
                table: "PrintIntents",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReadinessSnapshot",
                table: "PrintIntents");
        }
    }
}
