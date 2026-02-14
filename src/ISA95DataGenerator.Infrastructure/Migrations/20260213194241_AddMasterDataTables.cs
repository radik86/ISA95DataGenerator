using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMasterDataTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Crews",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CrewName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PeopleCount = table.Column<int>(type: "int", nullable: false),
                    Skills = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Crews", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EquipmentClasses",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ParentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentClasses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EquipmentClasses_EquipmentClasses_ParentId",
                        column: x => x.ParentId,
                        principalTable: "EquipmentClasses",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EquipmentProperties",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ValueDataType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MinValue = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MaxValue = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentProperties", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HierarchyScopes",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EquipmentID = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EquipmentLevel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HierarchyScopes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HierarchyScopesFlat",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Enterprise = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Site = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Area = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    WorkCenter = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    WorkUnit = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProcessCell = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProductionLine = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProductionUnit = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    WorkCell = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StorageZone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StorageUnit = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HierarchyScopesFlat", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MaterialClasses",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialClasses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MaterialDefinitionProperties",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ValueUnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialDefinitionProperties", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OperationEventDefinitionProperties",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PossibleValues = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ValueUnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationEventDefinitionProperties", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OperationEventDefinitions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EventCategory = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EventCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CausesDowntime = table.Column<bool>(type: "bit", nullable: false),
                    CausesScrap = table.Column<bool>(type: "bit", nullable: false),
                    RootCauseType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationEventDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OperationsEventClasses",
                columns: table => new
                {
                    OperationsEventClassID = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ClassName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationsEventClasses", x => x.OperationsEventClassID);
                });

            migrationBuilder.CreateTable(
                name: "OperationsEventRecords",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OperationsEventRecordID = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OperationsEventDefinitionID = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Comments = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationsEventRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Plants",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Location = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Plants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProcessSegments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProductMaterialId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Sequence = table.Column<int>(type: "int", nullable: false),
                    DurationHours = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessSegments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Shifts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ShiftNumber = table.Column<int>(type: "int", nullable: false),
                    ShiftName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StartTime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EndTime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shifts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EquipmentClassProperties",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EquipmentClassId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PropertyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ValueDataType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MinValue = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MaxValue = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentClassProperties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EquipmentClassProperties_EquipmentClasses_EquipmentClassId",
                        column: x => x.EquipmentClassId,
                        principalTable: "EquipmentClasses",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Equipments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ClassId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ClassName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ProductionLineId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ParentEquipmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Equipments_EquipmentClasses_ClassId",
                        column: x => x.ClassId,
                        principalTable: "EquipmentClasses",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Equipments_Equipments_ParentEquipmentId",
                        column: x => x.ParentEquipmentId,
                        principalTable: "Equipments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Materials",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ClassId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ClassName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DefaultUoM = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Materials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Materials_MaterialClasses_ClassId",
                        column: x => x.ClassId,
                        principalTable: "MaterialClasses",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MaterialDefinitionPropertyAssignments",
                columns: table => new
                {
                    Pk = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MaterialDefinitionPropertyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaterialDefinitionId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ValueUnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialDefinitionPropertyAssignments", x => x.Pk);
                    table.ForeignKey(
                        name: "FK_MaterialDefinitionPropertyAssignments_MaterialDefinitionProperties_MaterialDefinitionPropertyId",
                        column: x => x.MaterialDefinitionPropertyId,
                        principalTable: "MaterialDefinitionProperties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OperationEventDefinitionPropertyAssignments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    OperationsEventDefinitionId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OperationsEventDefinitionPropertyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ValueUnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    OperationEventDefinitionId = table.Column<string>(type: "nvarchar(100)", nullable: true),
                    OperationEventDefinitionPropertyId = table.Column<string>(type: "nvarchar(100)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationEventDefinitionPropertyAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OperationEventDefinitionPropertyAssignments_OperationEventDefinitionProperties_OperationEventDefinitionPropertyId",
                        column: x => x.OperationEventDefinitionPropertyId,
                        principalTable: "OperationEventDefinitionProperties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OperationEventDefinitionPropertyAssignments_OperationEventDefinitions_OperationEventDefinitionId",
                        column: x => x.OperationEventDefinitionId,
                        principalTable: "OperationEventDefinitions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OperationsEventEntries",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OperationsEventEntryID = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OperationsEventRecordID = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntryType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationsEventEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OperationsEventEntries_OperationsEventRecords_OperationsEventRecordID",
                        column: x => x.OperationsEventRecordID,
                        principalTable: "OperationsEventRecords",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProductionLines",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PlantId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductionLines_Plants_PlantId",
                        column: x => x.PlantId,
                        principalTable: "Plants",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EquipmentUsages",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProcessSegmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EquipmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CapacityPerRun = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentUsages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EquipmentUsages_ProcessSegments_ProcessSegmentId",
                        column: x => x.ProcessSegmentId,
                        principalTable: "ProcessSegments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OperationEventDefSegmentAssignments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OperationsEventDefinitionId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProcessSegmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StartOrEndEvent = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsMandatory = table.Column<bool>(type: "bit", nullable: false),
                    IsPrimarySegment = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    OperationEventDefinitionId = table.Column<string>(type: "nvarchar(100)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationEventDefSegmentAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OperationEventDefSegmentAssignments_OperationEventDefinitions_OperationEventDefinitionId",
                        column: x => x.OperationEventDefinitionId,
                        principalTable: "OperationEventDefinitions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OperationEventDefSegmentAssignments_ProcessSegments_ProcessSegmentId",
                        column: x => x.ProcessSegmentId,
                        principalTable: "ProcessSegments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SegmentBOMs",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProcessSegmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaterialId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    QtyPerUnit = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Uom = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SegmentBOMs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SegmentBOMs_ProcessSegments_ProcessSegmentId",
                        column: x => x.ProcessSegmentId,
                        principalTable: "ProcessSegments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ShiftCrewAssignments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ShiftId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CrewId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EffectiveDate = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ExpiryDate = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftCrewAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftCrewAssignments_Crews_CrewId",
                        column: x => x.CrewId,
                        principalTable: "Crews",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ShiftCrewAssignments_Shifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "Shifts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EquipmentClassPropertyAssignments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EquipmentClassPropertyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EquipmentPropertyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentClassPropertyAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EquipmentClassPropertyAssignments_EquipmentClassProperties_EquipmentClassPropertyId",
                        column: x => x.EquipmentClassPropertyId,
                        principalTable: "EquipmentClassProperties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EquipmentClassPropertyAssignments_EquipmentProperties_EquipmentPropertyId",
                        column: x => x.EquipmentPropertyId,
                        principalTable: "EquipmentProperties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EquipmentPropertyAssignments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EquipmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProcessSegmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EquipmentPropertyId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SamplingMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SamplingIntervalSeconds = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentPropertyAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EquipmentPropertyAssignments_EquipmentProperties_EquipmentPropertyId",
                        column: x => x.EquipmentPropertyId,
                        principalTable: "EquipmentProperties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EquipmentPropertyAssignments_Equipments_EquipmentId",
                        column: x => x.EquipmentId,
                        principalTable: "Equipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EquipmentPropertyAssignments_ProcessSegments_ProcessSegmentId",
                        column: x => x.ProcessSegmentId,
                        principalTable: "ProcessSegments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MaterialLots",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaterialId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LotQuantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    LotUoM = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReceivedDateTime = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ProducedDateTime = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SupplierOrProducerId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SupplierOrProducerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ProducedByProcessSegmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ParentLotId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialLots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialLots_Materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Materials",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LineEquipments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ProductionLineId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EquipmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Sequence = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    PlantId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LineEquipments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LineEquipments_ProductionLines_ProductionLineId",
                        column: x => x.ProductionLineId,
                        principalTable: "ProductionLines",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MaterialSublots",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaterialLotId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    QuantityUnitOfMeasure = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StorageLocation = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Disposition = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialSublots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialSublots_MaterialLots_MaterialLotId",
                        column: x => x.MaterialLotId,
                        principalTable: "MaterialLots",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentClasses_Name",
                table: "EquipmentClasses",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentClasses_ParentId",
                table: "EquipmentClasses",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentClassProperties_EquipmentClassId",
                table: "EquipmentClassProperties",
                column: "EquipmentClassId");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentClassPropertyAssignments_EquipmentClassPropertyId",
                table: "EquipmentClassPropertyAssignments",
                column: "EquipmentClassPropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentClassPropertyAssignments_EquipmentPropertyId",
                table: "EquipmentClassPropertyAssignments",
                column: "EquipmentPropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentPropertyAssignments_EquipmentId",
                table: "EquipmentPropertyAssignments",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentPropertyAssignments_EquipmentPropertyId",
                table: "EquipmentPropertyAssignments",
                column: "EquipmentPropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentPropertyAssignments_ProcessSegmentId",
                table: "EquipmentPropertyAssignments",
                column: "ProcessSegmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_ClassId",
                table: "Equipments",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_Name",
                table: "Equipments",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_Equipments_ParentEquipmentId",
                table: "Equipments",
                column: "ParentEquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentUsages_EquipmentId",
                table: "EquipmentUsages",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentUsages_ProcessSegmentId",
                table: "EquipmentUsages",
                column: "ProcessSegmentId");

            migrationBuilder.CreateIndex(
                name: "IX_HierarchyScopes_EquipmentID",
                table: "HierarchyScopes",
                column: "EquipmentID");

            migrationBuilder.CreateIndex(
                name: "IX_HierarchyScopes_EquipmentLevel",
                table: "HierarchyScopes",
                column: "EquipmentLevel");

            migrationBuilder.CreateIndex(
                name: "IX_HierarchyScopesFlat_Enterprise",
                table: "HierarchyScopesFlat",
                column: "Enterprise");

            migrationBuilder.CreateIndex(
                name: "IX_HierarchyScopesFlat_Site",
                table: "HierarchyScopesFlat",
                column: "Site");

            migrationBuilder.CreateIndex(
                name: "IX_LineEquipments_EquipmentId",
                table: "LineEquipments",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_LineEquipments_ProductionLineId",
                table: "LineEquipments",
                column: "ProductionLineId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialClasses_Name",
                table: "MaterialClasses",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialDefinitionPropertyAssignments_MaterialDefinitionId",
                table: "MaterialDefinitionPropertyAssignments",
                column: "MaterialDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialDefinitionPropertyAssignments_MaterialDefinitionPropertyId",
                table: "MaterialDefinitionPropertyAssignments",
                column: "MaterialDefinitionPropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialLots_MaterialId",
                table: "MaterialLots",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_ClassId",
                table: "Materials",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_Name",
                table: "Materials",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialSublots_MaterialLotId",
                table: "MaterialSublots",
                column: "MaterialLotId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationEventDefinitionPropertyAssignments_OperationEventDefinitionId",
                table: "OperationEventDefinitionPropertyAssignments",
                column: "OperationEventDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationEventDefinitionPropertyAssignments_OperationEventDefinitionPropertyId",
                table: "OperationEventDefinitionPropertyAssignments",
                column: "OperationEventDefinitionPropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationEventDefinitionPropertyAssignments_OperationsEventDefinitionId",
                table: "OperationEventDefinitionPropertyAssignments",
                column: "OperationsEventDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationEventDefinitionPropertyAssignments_OperationsEventDefinitionPropertyId",
                table: "OperationEventDefinitionPropertyAssignments",
                column: "OperationsEventDefinitionPropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationEventDefinitions_EventCategory",
                table: "OperationEventDefinitions",
                column: "EventCategory");

            migrationBuilder.CreateIndex(
                name: "IX_OperationEventDefinitions_EventCode",
                table: "OperationEventDefinitions",
                column: "EventCode");

            migrationBuilder.CreateIndex(
                name: "IX_OperationEventDefSegmentAssignments_OperationEventDefinitionId",
                table: "OperationEventDefSegmentAssignments",
                column: "OperationEventDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationEventDefSegmentAssignments_OperationsEventDefinitionId",
                table: "OperationEventDefSegmentAssignments",
                column: "OperationsEventDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationEventDefSegmentAssignments_ProcessSegmentId",
                table: "OperationEventDefSegmentAssignments",
                column: "ProcessSegmentId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationsEventEntries_OperationsEventRecordID",
                table: "OperationsEventEntries",
                column: "OperationsEventRecordID");

            migrationBuilder.CreateIndex(
                name: "IX_OperationsEventRecords_OperationsEventDefinitionID",
                table: "OperationsEventRecords",
                column: "OperationsEventDefinitionID");

            migrationBuilder.CreateIndex(
                name: "IX_Plants_Name",
                table: "Plants",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_ProcessSegments_Name",
                table: "ProcessSegments",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_ProcessSegments_ProductMaterialId",
                table: "ProcessSegments",
                column: "ProductMaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionLines_Name",
                table: "ProductionLines",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionLines_PlantId",
                table: "ProductionLines",
                column: "PlantId");

            migrationBuilder.CreateIndex(
                name: "IX_SegmentBOMs_MaterialId",
                table: "SegmentBOMs",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_SegmentBOMs_ProcessSegmentId",
                table: "SegmentBOMs",
                column: "ProcessSegmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftCrewAssignments_CrewId",
                table: "ShiftCrewAssignments",
                column: "CrewId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftCrewAssignments_ShiftId",
                table: "ShiftCrewAssignments",
                column: "ShiftId");

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_ShiftNumber",
                table: "Shifts",
                column: "ShiftNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EquipmentClassPropertyAssignments");

            migrationBuilder.DropTable(
                name: "EquipmentPropertyAssignments");

            migrationBuilder.DropTable(
                name: "EquipmentUsages");

            migrationBuilder.DropTable(
                name: "HierarchyScopes");

            migrationBuilder.DropTable(
                name: "HierarchyScopesFlat");

            migrationBuilder.DropTable(
                name: "LineEquipments");

            migrationBuilder.DropTable(
                name: "MaterialDefinitionPropertyAssignments");

            migrationBuilder.DropTable(
                name: "MaterialSublots");

            migrationBuilder.DropTable(
                name: "OperationEventDefinitionPropertyAssignments");

            migrationBuilder.DropTable(
                name: "OperationEventDefSegmentAssignments");

            migrationBuilder.DropTable(
                name: "OperationsEventClasses");

            migrationBuilder.DropTable(
                name: "OperationsEventEntries");

            migrationBuilder.DropTable(
                name: "SegmentBOMs");

            migrationBuilder.DropTable(
                name: "ShiftCrewAssignments");

            migrationBuilder.DropTable(
                name: "EquipmentClassProperties");

            migrationBuilder.DropTable(
                name: "EquipmentProperties");

            migrationBuilder.DropTable(
                name: "Equipments");

            migrationBuilder.DropTable(
                name: "ProductionLines");

            migrationBuilder.DropTable(
                name: "MaterialDefinitionProperties");

            migrationBuilder.DropTable(
                name: "MaterialLots");

            migrationBuilder.DropTable(
                name: "OperationEventDefinitionProperties");

            migrationBuilder.DropTable(
                name: "OperationEventDefinitions");

            migrationBuilder.DropTable(
                name: "OperationsEventRecords");

            migrationBuilder.DropTable(
                name: "ProcessSegments");

            migrationBuilder.DropTable(
                name: "Crews");

            migrationBuilder.DropTable(
                name: "Shifts");

            migrationBuilder.DropTable(
                name: "EquipmentClasses");

            migrationBuilder.DropTable(
                name: "Plants");

            migrationBuilder.DropTable(
                name: "Materials");

            migrationBuilder.DropTable(
                name: "MaterialClasses");
        }
    }
}
