using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MigrationSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TotalRecords = table.Column<int>(type: "int", nullable: false),
                    ProcessedRecords = table.Column<int>(type: "int", nullable: false),
                    ProgressPercentage = table.Column<int>(type: "int", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResultFilesPaths = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MigrationSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EntityMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MigrationSessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntityName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SourceTable = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PrimaryKeyRuleJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FieldMappingsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntityMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EntityMappings_MigrationSessions_MigrationSessionId",
                        column: x => x.MigrationSessionId,
                        principalTable: "MigrationSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SourceDataTables",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MigrationSessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TableName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RecordCount = table.Column<int>(type: "int", nullable: false),
                    ColumnsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SourceDataTables", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SourceDataTables_MigrationSessions_MigrationSessionId",
                        column: x => x.MigrationSessionId,
                        principalTable: "MigrationSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EntityMappings_MigrationSessionId",
                table: "EntityMappings",
                column: "MigrationSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_MigrationSessions_CreatedAt",
                table: "MigrationSessions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_MigrationSessions_Status",
                table: "MigrationSessions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SourceDataTables_MigrationSessionId",
                table: "SourceDataTables",
                column: "MigrationSessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EntityMappings");

            migrationBuilder.DropTable(
                name: "SourceDataTables");

            migrationBuilder.DropTable(
                name: "MigrationSessions");
        }
    }
}
