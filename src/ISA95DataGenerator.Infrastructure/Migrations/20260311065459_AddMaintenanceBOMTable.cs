using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMaintenanceBOMTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MaintenanceBOMs",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EquipmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProcessSegmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaterialId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    QtyPerUnit = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Uom = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MaterialUse = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceBOMs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenanceBOMs_ProcessSegments_ProcessSegmentId",
                        column: x => x.ProcessSegmentId,
                        principalTable: "ProcessSegments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceBOMs_EquipmentId",
                table: "MaintenanceBOMs",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceBOMs_MaterialId",
                table: "MaintenanceBOMs",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceBOMs_ProcessSegmentId",
                table: "MaintenanceBOMs",
                column: "ProcessSegmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MaintenanceBOMs");
        }
    }
}
