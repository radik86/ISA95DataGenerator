using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ISA95DataGenerator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIsMassDataToGenericDataStore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsMassData",
                table: "GenericDataStores",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_GenericDataStores_IsMassData",
                table: "GenericDataStores",
                column: "IsMassData")
                .Annotation("SqlServer:Include", new[] { "StoreName" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GenericDataStores_IsMassData",
                table: "GenericDataStores");

            migrationBuilder.DropColumn(
                name: "IsMassData",
                table: "GenericDataStores");
        }
    }
}
