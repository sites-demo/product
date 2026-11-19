using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Svezho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Game : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Gift",
                table: "Requests",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PlayedAt",
                table: "Requests",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "GameEnabled",
                table: "Masters",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "GameReward",
                table: "Masters",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Gift",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "PlayedAt",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "GameEnabled",
                table: "Masters");

            migrationBuilder.DropColumn(
                name: "GameReward",
                table: "Masters");
        }
    }
}
