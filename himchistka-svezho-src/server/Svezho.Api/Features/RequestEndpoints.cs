using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Svezho.Api.Data;
using Svezho.Api.Pricing;
using Svezho.Api.Services;

namespace Svezho.Api.Features;

public static class RequestEndpoints
{
    public static void MapRequests(this RouteGroupBuilder group)
    {
        group.MapPost("/requests", Create)
            .DisableAntiforgery()
            .RequireRateLimiting("requests");

        group.MapGet("/requests", List).RequireAuthorization();
        group.MapPatch("/requests/{id:guid}", SetStatus).RequireAuthorization();
        group.MapGet("/requests/{id:guid}/photos/{photoId:guid}", Photo).RequireAuthorization();

        group.MapPost("/requests/{id:guid}/game", Played)
            .DisableAntiforgery()
            .RequireRateLimiting("requests");
    }

    private static async Task<IResult> Create(
        string slug, HttpRequest http, AppDb db, PhotoStorage storage, TelegramQueue telegram,
        JsonSerializerOptions json, CancellationToken ct)
    {
        var master = await db.FindAsync(slug, ct);
        if (master is null) return Results.NotFound();
        if (!http.HasFormContentType) return Results.BadRequest();

        var form = await http.ReadFormAsync(ct);
        var body = JsonSerializer.Deserialize<NewRequestBody>(form["data"].ToString(), json);
        if (body is null) return Results.BadRequest();

        var errors = Validate(body, form.Files);
        if (errors.Count > 0) return Results.ValidationProblem(errors);

        var prices = master.Prices(json);
        var number = await db.Requests.Where(r => r.MasterId == master.Id).MaxAsync(r => (int?)r.Number, ct) ?? 1000;

        var request = new CleaningRequest
        {
            MasterId = master.Id,
            Number = number + 1,
            ClientName = body.Name.Trim(),
            Phone = body.Phone.Trim(),
            Address = body.Address.Trim(),
            When = body.When?.Trim() ?? "",
            Comment = body.Comment?.Trim() ?? "",
            ItemsJson = JsonSerializer.Serialize(body.Items, json),
            Total = PriceCalculator.Order(body.Items, prices),
            ClientTotal = body.Total,
        };

        foreach (var file in form.Files.Take(PhotoStorage.MaxCount))
        {
            var photo = new RequestPhoto { FileName = "", ContentType = file.ContentType, Size = file.Length };
            photo.FileName = await storage.SaveAsync(request.Id, photo.Id, file, ct);
            request.Photos.Add(photo);
        }

        db.Requests.Add(request);
        await db.SaveChangesAsync(ct);

        if (master.TelegramChatId is { } chat)
            telegram.Enqueue(new TelegramMessage(chat, TelegramText(request, body.Items)));

        return Results.Created($"/api/masters/{slug}/requests/{request.Id}", new { id = request.Id, num = request.Number });
    }

    private static async Task<IResult> List(string slug, HttpContext http, AppDb db, JsonSerializerOptions json, CancellationToken ct)
    {
        if (!http.Owns(slug)) return Results.Forbid();

        var rows = await db.Requests
            .Where(r => r.Master.Slug == slug)
            .OrderByDescending(r => r.CreatedAt)
            .Take(300)
            .Include(r => r.Photos)
            .AsNoTracking()
            .ToListAsync(ct);

        return Results.Ok(rows.Select(r => ToDto(slug, r, json)));
    }

    private static async Task<IResult> SetStatus(string slug, Guid id, StatusBody body, HttpContext http, AppDb db, JsonSerializerOptions json, CancellationToken ct)
    {
        if (!http.Owns(slug)) return Results.Forbid();
        if (!Enum.TryParse<RequestStatus>(body.Status, ignoreCase: true, out var status)) return Results.BadRequest();

        var request = await db.Requests.Include(r => r.Photos).FirstOrDefaultAsync(r => r.Id == id && r.Master.Slug == slug, ct);
        if (request is null) return Results.NotFound();

        request.Status = status;
        request.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.Ok(ToDto(slug, request, json));
    }

    private static async Task<IResult> Played(string slug, Guid id, AppDb db, CancellationToken ct)
    {
        var request = await db.Requests.Include(r => r.Master).FirstOrDefaultAsync(r => r.Id == id && r.Master.Slug == slug, ct);
        if (request is null || !request.Master.GameEnabled) return Results.NotFound();
        if (request.PlayedAt is not null) return Results.NoContent();
        if (DateTimeOffset.UtcNow - request.CreatedAt > TimeSpan.FromHours(3)) return Results.Conflict();

        request.PlayedAt = DateTimeOffset.UtcNow;
        request.Gift = request.Master.GameReward;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Photo(string slug, Guid id, Guid photoId, HttpContext http, AppDb db, PhotoStorage storage, CancellationToken ct)
    {
        if (!http.Owns(slug)) return Results.Forbid();

        var photo = await db.Photos.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == photoId && p.RequestId == id && p.Request.Master.Slug == slug, ct);
        if (photo is null) return Results.NotFound();

        var path = storage.PathOf(id, photo.FileName);
        return File.Exists(path) ? Results.File(path, photo.ContentType, enableRangeProcessing: true) : Results.NotFound();
    }

    private static Dictionary<string, string[]> Validate(NewRequestBody body, IFormFileCollection files)
    {
        var errors = new Dictionary<string, string[]>();
        var digits = new string(body.Phone?.Where(char.IsDigit).ToArray());

        if (string.IsNullOrWhiteSpace(body.Name) || body.Name.Length > 80) errors["name"] = ["Укажите имя"];
        if (digits.Length != 11) errors["phone"] = ["Неверный телефон"];
        if (string.IsNullOrWhiteSpace(body.Address) || body.Address.Length > 300) errors["address"] = ["Укажите адрес"];
        if (body.Comment?.Length > 2000) errors["comment"] = ["Слишком длинный комментарий"];
        if (body.Items is not { Count: > 0 and <= 10 }) errors["items"] = ["Нет предметов"];
        else
        {
            var itemErrors = body.Items.Select(PriceCalculator.Validate).OfType<string>().ToArray();
            if (itemErrors.Length > 0) errors["items"] = itemErrors;
        }
        if (files.Count > PhotoStorage.MaxCount || files.Any(f => !PhotoStorage.IsAllowed(f))) errors["photos"] = ["До 6 фото, до 12 МБ каждое"];

        return errors;
    }

    private static RequestDto ToDto(string slug, CleaningRequest r, JsonSerializerOptions json) => new(
        r.Id,
        r.Number,
        r.Status.ToString().ToLowerInvariant(),
        r.ClientName,
        r.Phone,
        r.Address,
        r.When,
        r.Comment,
        JsonSerializer.Deserialize<JsonElement>(r.ItemsJson, json),
        r.Total,
        r.ClientTotal,
        r.CreatedAt.ToUnixTimeMilliseconds(),
        r.Photos.Select(p => $"/api/masters/{slug}/requests/{r.Id}/photos/{p.Id}").ToList(),
        r.PlayedAt is not null,
        r.Gift);

    private static string TelegramText(CleaningRequest r, List<OrderItem> items)
    {
        Func<string, string> e = WebUtility.HtmlEncode;
        var what = string.Join(", ", items.Select(i => i.Type switch
        {
            "sofa" => $"{(i.Corner ? "угловой диван" : "диван")} на {i.Seats}",
            "armchair" => "кресло",
            "chair" => $"стулья, {i.Count} шт.",
            "mattress" => $"матрас {i.Size}×200",
            "carpet" => $"ковёр {i.W}×{i.L} м",
            _ => i.Type,
        }));

        return $"<b>Заявка {r.Number}</b> · {r.Total:N0} ₽\n" +
               $"{e(r.ClientName)}, {e(r.Phone)}\n" +
               $"{e(r.Address)}\n" +
               $"{e(what)}\n" +
               (r.When.Length > 0 ? $"Когда: {e(r.When)}\n" : "") +
               (r.Comment.Length > 0 ? $"«{e(r.Comment)}»\n" : "") +
               (r.Photos.Count > 0 ? $"Фото: {r.Photos.Count}" : "");
    }
}
