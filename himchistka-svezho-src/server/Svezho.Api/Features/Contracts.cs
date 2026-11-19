using Svezho.Api.Pricing;

namespace Svezho.Api.Features;

public record LoginBody(string Pin);

public record LoginResult(string Token);

public record NewRequestBody(
    string Name,
    string Phone,
    string Address,
    string? When,
    string? Comment,
    List<OrderItem> Items,
    decimal Total);

public record StatusBody(string Status);

public record RequestDto(
    Guid Id,
    int Num,
    string Status,
    string Name,
    string Phone,
    string Address,
    string When,
    string Comment,
    object Items,
    decimal Total,
    decimal ClientTotal,
    long Created,
    List<string> Photos,
    bool Played,
    string Gift);

public record SettingsDto(bool GameEnabled, string GameReward);
