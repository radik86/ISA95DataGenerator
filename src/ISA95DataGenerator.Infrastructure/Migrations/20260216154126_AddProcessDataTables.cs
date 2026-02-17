using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProcessDataTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkRequests",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    WorkType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    HierarchyScope = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Priority = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RequestState = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    WorkScheduleId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JobOrders",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    WorkType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    HierarchyScope = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    WorkMasterId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    WorkMasterVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Priority = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DispatchStatus = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Command = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ProcessSegmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MaterialId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PlannedQuantity = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    QuantityUOM = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    EquipmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    WorkRequestId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobOrders_WorkRequests_WorkRequestId",
                        column: x => x.WorkRequestId,
                        principalTable: "WorkRequests",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EquipmentActuals",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HierarchyScope = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    EquipmentUse = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EquipmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    EquipmentClassId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ActualStartTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualEndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DurationMinutes = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    EquipmentState = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    JobOrderId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SegmentResponseId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentActuals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EquipmentActuals_JobOrders_JobOrderId",
                        column: x => x.JobOrderId,
                        principalTable: "JobOrders",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JobResponses",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    WorkType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    HierarchyScope = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ActualStartTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualEndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    JobState = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    JobOrderId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MaterialId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MaterialLotId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ActualQuantity = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    QuantityUOM = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    EquipmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShiftId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CrewId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobResponses_JobOrders_JobOrderId",
                        column: x => x.JobOrderId,
                        principalTable: "JobOrders",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MaterialActuals",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    HierarchyScope = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MaterialUse = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MaterialId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MaterialClassId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MaterialLotId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MaterialSublotId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    QuantityUOM = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    StorageLocation = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    StorageLocationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: true),
                    JobOrderId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SegmentResponseId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ProcessSegmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    EquipmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialActuals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialActuals_JobOrders_JobOrderId",
                        column: x => x.JobOrderId,
                        principalTable: "JobOrders",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SegmentResponses",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ProcessSegmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    HierarchyScope = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ActualStartTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualEndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SegmentState = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DurationMinutes = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    JobResponseId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    EquipmentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SequenceNumber = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SegmentResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SegmentResponses_JobResponses_JobResponseId",
                        column: x => x.JobResponseId,
                        principalTable: "JobResponses",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentActuals_EquipmentId",
                table: "EquipmentActuals",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentActuals_JobOrderId",
                table: "EquipmentActuals",
                column: "JobOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_JobOrders_DispatchStatus",
                table: "JobOrders",
                column: "DispatchStatus");

            migrationBuilder.CreateIndex(
                name: "IX_JobOrders_EquipmentId",
                table: "JobOrders",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_JobOrders_HierarchyScope",
                table: "JobOrders",
                column: "HierarchyScope");

            migrationBuilder.CreateIndex(
                name: "IX_JobOrders_MaterialId",
                table: "JobOrders",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_JobOrders_WorkRequestId",
                table: "JobOrders",
                column: "WorkRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_JobResponses_JobOrderId",
                table: "JobResponses",
                column: "JobOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_JobResponses_JobState",
                table: "JobResponses",
                column: "JobState");

            migrationBuilder.CreateIndex(
                name: "IX_JobResponses_MaterialId",
                table: "JobResponses",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialActuals_JobOrderId",
                table: "MaterialActuals",
                column: "JobOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialActuals_MaterialId",
                table: "MaterialActuals",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialActuals_MaterialLotId",
                table: "MaterialActuals",
                column: "MaterialLotId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialActuals_MaterialUse",
                table: "MaterialActuals",
                column: "MaterialUse");

            migrationBuilder.CreateIndex(
                name: "IX_SegmentResponses_JobResponseId",
                table: "SegmentResponses",
                column: "JobResponseId");

            migrationBuilder.CreateIndex(
                name: "IX_SegmentResponses_ProcessSegmentId",
                table: "SegmentResponses",
                column: "ProcessSegmentId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkRequests_HierarchyScope",
                table: "WorkRequests",
                column: "HierarchyScope");

            migrationBuilder.CreateIndex(
                name: "IX_WorkRequests_RequestState",
                table: "WorkRequests",
                column: "RequestState");

            migrationBuilder.CreateIndex(
                name: "IX_WorkRequests_StartTime",
                table: "WorkRequests",
                column: "StartTime");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EquipmentActuals");

            migrationBuilder.DropTable(
                name: "MaterialActuals");

            migrationBuilder.DropTable(
                name: "SegmentResponses");

            migrationBuilder.DropTable(
                name: "JobResponses");

            migrationBuilder.DropTable(
                name: "JobOrders");

            migrationBuilder.DropTable(
                name: "WorkRequests");
        }
    }
}
