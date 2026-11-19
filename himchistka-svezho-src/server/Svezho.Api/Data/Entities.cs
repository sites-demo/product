namespace Svezho.Api.Data;

public class Master
{
    public int Id { get; set; }
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public required string Phone { get; set; }
    public required string PinHash { get; set; }
    public string PricesJson { get; set; } = "{}";
    public long? TelegramChatId { get; set; }
    public bool GameEnabled { get; set; }
    public string GameReward { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<CleaningRequest> Requests { get; set; } = [];
}

public enum RequestStatus
{
    New,
    Work,
    Done,
    Cancel,
}

public class CleaningRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int MasterId { get; set; }
    public Master Master { get; set; } = null!;

    public int Number { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.New;

    public required string ClientName { get; set; }
    public required string Phone { get; set; }
    public required string Address { get; set; }
    public string When { get; set; } = "";
    public string Comment { get; set; } = "";

    public required string ItemsJson { get; set; }
    public decimal Total { get; set; }
    public decimal ClientTotal { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? PlayedAt { get; set; }
    public string Gift { get; set; } = "";

    public List<RequestPhoto> Photos { get; set; } = [];
}

public class RequestPhoto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RequestId { get; set; }
    public CleaningRequest Request { get; set; } = null!;
    public required string FileName { get; set; }
    public required string ContentType { get; set; }
    public long Size { get; set; }
}
