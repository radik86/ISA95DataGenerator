using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLastDataMigrationAtToMasterData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MasterDataMigrationStamps");

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "Shifts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "ShiftCrewAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "SegmentBOMs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "ProductionLines",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "ProcessSegments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "Plants",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "PersonnelCapabilities",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "PersonClasses",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "OperationsEventRecords",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "OperationsEventEntries",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "OperationsEventClasses",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "OperationEventDefSegmentAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "OperationEventDefinitions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "OperationEventDefinitionPropertyAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "OperationEventDefinitionProperties",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "MaterialSublots",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "Materials",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "MaterialLots",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "MaterialDefinitionPropertyAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "MaterialDefinitionProperties",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "MaterialClassToPropertyAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "MaterialClassPropertyAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "MaterialClassProperties",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "MaterialClasses",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "MaintenanceBOMs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "LineEquipments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "HierarchyScopesFlat",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "HierarchyScopes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "HierarchyScopeParentChilds",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "EquipmentUsages",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "Equipments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "EquipmentPropertyAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "EquipmentProperties",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "EquipmentClassPropertyAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "EquipmentClassProperties",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "EquipmentClasses",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "Employees",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastDataMigrationAt",
                table: "Crews",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "Shifts");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "ShiftCrewAssignments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "SegmentBOMs");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "ProductionLines");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "ProcessSegments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "Plants");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "PersonnelCapabilities");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "PersonClasses");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "OperationsEventRecords");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "OperationsEventEntries");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "OperationsEventClasses");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "OperationEventDefSegmentAssignments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "OperationEventDefinitions");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "OperationEventDefinitionPropertyAssignments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "OperationEventDefinitionProperties");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "MaterialSublots");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "MaterialLots");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "MaterialDefinitionPropertyAssignments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "MaterialDefinitionProperties");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "MaterialClassToPropertyAssignments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "MaterialClassPropertyAssignments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "MaterialClassProperties");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "MaterialClasses");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "MaintenanceBOMs");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "LineEquipments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "HierarchyScopesFlat");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "HierarchyScopes");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "HierarchyScopeParentChilds");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "EquipmentUsages");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "Equipments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "EquipmentPropertyAssignments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "EquipmentProperties");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "EquipmentClassPropertyAssignments");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "EquipmentClassProperties");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "EquipmentClasses");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "LastDataMigrationAt",
                table: "Crews");

            migrationBuilder.CreateTable(
                name: "MasterDataMigrationStamps",
                columns: table => new
                {
                    StoreName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LastMigratedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterDataMigrationStamps", x => x.StoreName);
                });
        }
    }
}
