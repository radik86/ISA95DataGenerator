using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialClassProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MaterialClassProperties",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PropertyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ValueDataType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MinValue = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaxValue = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialClassProperties", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MaterialClassPropertyAssignments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    MaterialClassPropertyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaterialDefinitionPropertyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialClassPropertyAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialClassPropertyAssignments_MaterialClassProperties_MaterialClassPropertyId",
                        column: x => x.MaterialClassPropertyId,
                        principalTable: "MaterialClassProperties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialClassPropertyAssignments_MaterialDefinitionProperties_MaterialDefinitionPropertyId",
                        column: x => x.MaterialDefinitionPropertyId,
                        principalTable: "MaterialDefinitionProperties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaterialClassPropertyAssignments_MaterialClassPropertyId",
                table: "MaterialClassPropertyAssignments",
                column: "MaterialClassPropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialClassPropertyAssignments_MaterialDefinitionPropertyId",
                table: "MaterialClassPropertyAssignments",
                column: "MaterialDefinitionPropertyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MaterialClassPropertyAssignments");

            migrationBuilder.DropTable(
                name: "MaterialClassProperties");
        }
    }
}
