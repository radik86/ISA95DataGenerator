using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMaintenanceBomPersonnelFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EmployeeId",
                table: "MaintenanceBOMs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonClassId",
                table: "MaintenanceBOMs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PersonQuantity",
                table: "MaintenanceBOMs",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceBOMs_EmployeeId",
                table: "MaintenanceBOMs",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceBOMs_PersonClassId",
                table: "MaintenanceBOMs",
                column: "PersonClassId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MaintenanceBOMs_EmployeeId",
                table: "MaintenanceBOMs");

            migrationBuilder.DropIndex(
                name: "IX_MaintenanceBOMs_PersonClassId",
                table: "MaintenanceBOMs");

            migrationBuilder.DropColumn(
                name: "EmployeeId",
                table: "MaintenanceBOMs");

            migrationBuilder.DropColumn(
                name: "PersonClassId",
                table: "MaintenanceBOMs");

            migrationBuilder.DropColumn(
                name: "PersonQuantity",
                table: "MaintenanceBOMs");
        }
    }
}
