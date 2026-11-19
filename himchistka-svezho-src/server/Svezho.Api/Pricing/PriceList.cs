namespace Svezho.Api.Pricing;

public record PriceList
{
    public decimal SofaSeat { get; init; } = 800;
    public decimal SofaCorner { get; init; } = 1200;
    public decimal SofaArms { get; init; } = 200;
    public decimal Pillow { get; init; } = 150;
    public decimal LeatherK { get; init; } = 1.15m;
    public decimal Armchair { get; init; } = 1000;
    public decimal ChairSeat { get; init; } = 300;
    public decimal ChairBack { get; init; } = 150;
    public decimal Mattress90 { get; init; } = 1400;
    public decimal Mattress140 { get; init; } = 1900;
    public decimal Mattress160 { get; init; } = 2100;
    public decimal Mattress180 { get; init; } = 2400;
    public decimal MattressSecond { get; init; } = 60;
    public decimal CarpetShort { get; init; } = 250;
    public decimal CarpetLong { get; init; } = 350;
    public decimal Stains { get; init; } = 500;
    public decimal Odor { get; init; } = 900;
    public decimal Fur { get; init; } = 300;
    public decimal MinOrder { get; init; } = 1500;

    public decimal MattressPrice(string size) => size switch
    {
        "90" => Mattress90,
        "140" => Mattress140,
        "160" => Mattress160,
        "180" => Mattress180,
        _ => throw new ArgumentOutOfRangeException(nameof(size), size, "Unknown mattress size"),
    };
}
