using Svezho.Api.Data;
using Svezho.Api.Services;

namespace Svezho.Api.Features;

public static class AuthEndpoints
{
    public static void MapAuth(this RouteGroupBuilder group)
    {
        group.MapPost("/login", async (string slug, LoginBody body, AppDb db, TokenService tokens, CancellationToken ct) =>
        {
            var master = await db.FindAsync(slug, ct);
            if (master is null || string.IsNullOrWhiteSpace(body.Pin) || !PinHasher.Verify(body.Pin, master.PinHash))
                return Results.Unauthorized();

            return Results.Ok(new LoginResult(tokens.Issue(master)));
        }).RequireRateLimiting("login");
    }
}
