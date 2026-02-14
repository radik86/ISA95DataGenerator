using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHierarchyScopeParentChild : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HierarchyScopeParentChilds",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ParentEquipmentLevel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ParentEquipmentID = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ChildEquipmentLevel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ChildEquipmentID = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HierarchyScopeParentChilds", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HierarchyScopeParentChilds_ChildEquipmentID",
                table: "HierarchyScopeParentChilds",
                column: "ChildEquipmentID");

            migrationBuilder.CreateIndex(
                name: "IX_HierarchyScopeParentChilds_ParentEquipmentID",
                table: "HierarchyScopeParentChilds",
                column: "ParentEquipmentID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HierarchyScopeParentChilds");
        }
    }
}
