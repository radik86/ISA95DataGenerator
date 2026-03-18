using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMaintenanceBomPersonUomAndSegmentSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProcessSegmentSequence",
                table: "SegmentBOMs");

            migrationBuilder.AddColumn<int>(
                name: "ProcessSegmentSequence",
                table: "MaintenanceBOMs",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProcessSegmentSequence",
                table: "MaintenanceBOMs");

            migrationBuilder.AddColumn<int>(
                name: "ProcessSegmentSequence",
                table: "SegmentBOMs",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
