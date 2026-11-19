using System.Text.Json;
using Svezho.Api.Data;
using Svezho.Api.Pricing;

namespace Svezho.Api.Features;

public static class PriceEndpoints
{
    public static PriceList Prices(this Master master, JsonSerializerOptions json) =>
        JsonSerializer.Deserialize<PriceList>(master.PricesJson, json) ?? new PriceList();

    public static void MapPrices(this RouteGroupBuilder group)
    {
        group.MapGet("/prices", async (string slug, AppDb db, JsonSerializerOptions json, CancellationToken ct) =>
        {
            var master = await db.FindAsync(slug, ct);
            return master is null ? Results.NotFound() : Results.Ok(master.Prices(json));
        });

        group.MapPut("/prices", async (string slug, PriceList prices, HttpContext http, AppDb db, JsonSerializerOptions json, CancellationToken ct) =>
        {
            if (!http.Owns(slug)) return Results.Forbid();

            var master = await db.FindAsync(slug, ct);
            if (master is null) return Results.NotFound();

            var props = typeof(PriceList).GetProperties().Where(p => p.PropertyType == typeof(decimal));
            if (props.Any(p => (decimal)p.GetValue(prices)! < 0))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["prices"] = ["Цены не могут быть отрицательными"] });

            master.PricesJson = JsonSerializer.Serialize(prices, json);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization();
    }
}
