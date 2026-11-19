using System.Text.Json.Serialization;

namespace Svezho.Api.Pricing;

public record OrderItem
{
    public required string Type { get; init; }

    public int Seats { get; init; }
    public bool Corner { get; init; }
    public string Arm { get; init; } = "none";
    public string Legs { get; init; } = "wood";
    public string Fabric { get; init; } = "velour";
    public int Color { get; init; }
    public int Pillows { get; init; }

    public int Count { get; init; }
    public bool Back { get; init; }

    public string Size { get; init; } = "160";
    public int Sides { get; init; } = 1;

    public decimal W { get; init; }
    public decimal L { get; init; }
    public string Pile { get; init; } = "short";

    public bool Stains { get; init; }
    public bool Odor { get; init; }
    public bool Fur { get; init; }

    [JsonIgnore]
    public bool IsLeather => Fabric == "leather";
}
