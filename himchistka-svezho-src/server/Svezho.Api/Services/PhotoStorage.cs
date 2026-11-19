namespace Svezho.Api.Services;

public class PhotoStorage(IConfiguration config, IWebHostEnvironment env)
{
    public const long MaxSize = 12 * 1024 * 1024;
    public const int MaxCount = 6;

    private static readonly Dictionary<string, string> Allowed = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/heic"] = ".heic",
        ["image/heif"] = ".heif",
    };

    private string Root => Path.GetFullPath(config["Storage:Path"] ?? Path.Combine(env.ContentRootPath, "data", "photos"));

    public static bool IsAllowed(IFormFile file) => Allowed.ContainsKey(file.ContentType) && file.Length is > 0 and <= MaxSize;

    public async Task<string> SaveAsync(Guid requestId, Guid photoId, IFormFile file, CancellationToken ct)
    {
        var dir = Path.Combine(Root, requestId.ToString("N"));
        Directory.CreateDirectory(dir);

        var name = photoId.ToString("N") + Allowed[file.ContentType];
        await using var stream = File.Create(Path.Combine(dir, name));
        await file.CopyToAsync(stream, ct);
        return name;
    }

    public string PathOf(Guid requestId, string fileName) => Path.Combine(Root, requestId.ToString("N"), Path.GetFileName(fileName));
}
