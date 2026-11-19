using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Svezho.Api.Cli;
using Svezho.Api.Data;
using Svezho.Api.Features;
using Svezho.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

builder.Services.AddDbContext<AppDb>(o => o.UseSqlite(config.GetConnectionString("Default")));
builder.Services.AddSingleton(new JsonSerializerOptions(JsonSerializerDefaults.Web));
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<PhotoStorage>();
builder.Services.AddSingleton<TelegramQueue>();
builder.Services.AddHostedService<TelegramNotifier>();
builder.Services.AddHttpClient("telegram", c => c.BaseAddress = new Uri("https://api.telegram.org/"));
builder.Services.AddProblemDetails();

builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = PhotoStorage.MaxSize * PhotoStorage.MaxCount + 1024 * 1024);
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = PhotoStorage.MaxSize * PhotoStorage.MaxCount + 1024 * 1024);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = "svezho",
            ValidAudience = "svezho",
            IssuerSigningKey = TokenService.Key(config),
        };
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Path.Value?.Contains("/photos/") == true)
                    ctx.Token = ctx.Request.Query["access_token"];
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(config.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("requests", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(10) }));
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(5) }));
});

builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

if (args is ["master", .. var rest])
    return await MasterCommands.RunAsync(app.Services, rest);

await using (var scope = app.Services.CreateAsyncScope())
    await scope.ServiceProvider.GetRequiredService<AppDb>().Database.MigrateAsync();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { ok = true }));

var masters = app.MapGroup("/api/masters/{slug}");
masters.MapAuth();
masters.MapPrices();
masters.MapRequests();

app.Run();
return 0;
