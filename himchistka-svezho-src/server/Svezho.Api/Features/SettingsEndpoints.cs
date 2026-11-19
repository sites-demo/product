using Svezho.Api.Data;

namespace Svezho.Api.Features;

public static class SettingsEndpoints
{
    public static void MapSettings(this RouteGroupBuilder group)
    {
        group.MapGet("/settings", async (string slug, AppDb db, CancellationToken ct) =>
        {
            var master = await db.FindAsync(slug, ct);
            return master is null ? Results.NotFound() : Results.Ok(new SettingsDto(master.GameEnabled, master.GameReward));
        });

        group.MapPut("/settings", async (string slug, SettingsDto body, HttpContext http, AppDb db, CancellationToken ct) =>
        {
            if (!http.Owns(slug)) return Results.Forbid();

            var reward = body.GameReward?.Trim() ?? "";
            if (reward.Length > 120)
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["gameReward"] = ["Не длиннее 120 символов"] });

            var master = await db.FindAsync(slug, ct);
            if (master is null) return Results.NotFound();

            master.GameEnabled = body.GameEnabled;
            master.GameReward = reward;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization();
    }
}
