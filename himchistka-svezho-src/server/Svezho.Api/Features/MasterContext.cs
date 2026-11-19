using Microsoft.EntityFrameworkCore;
using Svezho.Api.Data;
using Svezho.Api.Services;

namespace Svezho.Api.Features;

public static class MasterContext
{
    public static Task<Master?> FindAsync(this AppDb db, string slug, CancellationToken ct) =>
        db.Masters.FirstOrDefaultAsync(m => m.Slug == slug, ct);

    public static bool Owns(this HttpContext http, string slug) =>
        http.User.FindFirst(TokenService.MasterClaim)?.Value == slug;
}
