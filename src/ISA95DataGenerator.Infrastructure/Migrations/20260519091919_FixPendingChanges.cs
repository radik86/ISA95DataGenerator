using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixPendingChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GenericDataStores_IsMassData",
                table: "GenericDataStores");

            migrationBuilder.AlterColumn<bool>(
                name: "IsMassData",
                table: "GenericDataStores",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "IsMassData",
                table: "GenericDataStores",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.CreateIndex(
                name: "IX_GenericDataStores_IsMassData",
                table: "GenericDataStores",
                column: "IsMassData");
        }
    }
}
