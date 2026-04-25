using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialClassToPropertyAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MaterialClassToPropertyAssignments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    MaterialClassId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaterialClassPropertyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SourceTimeStamp = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialClassToPropertyAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialClassToPropertyAssignments_MaterialClassProperties_MaterialClassPropertyId",
                        column: x => x.MaterialClassPropertyId,
                        principalTable: "MaterialClassProperties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MaterialClassToPropertyAssignments_MaterialClasses_MaterialClassId",
                        column: x => x.MaterialClassId,
                        principalTable: "MaterialClasses",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaterialClassToPropertyAssignments_MaterialClassId",
                table: "MaterialClassToPropertyAssignments",
                column: "MaterialClassId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialClassToPropertyAssignments_MaterialClassPropertyId",
                table: "MaterialClassToPropertyAssignments",
                column: "MaterialClassPropertyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MaterialClassToPropertyAssignments");
        }
    }
}
