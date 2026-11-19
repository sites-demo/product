namespace Svezho.Api.Pricing;

public static class PriceCalculator
{
    private static readonly HashSet<string> Types = ["sofa", "armchair", "chair", "mattress", "carpet"];

    public static decimal Order(IReadOnlyCollection<OrderItem> items, PriceList p)
    {
        var sum = items.Sum(i => Item(i, p));
        return sum > 0 && sum < p.MinOrder ? p.MinOrder : sum;
    }

    public static decimal Item(OrderItem it, PriceList p)
    {
        var k = it.IsLeather ? p.LeatherK : 1m;

        var sum = it.Type switch
        {
            "sofa" => it.Seats * p.SofaSeat * k
                      + (it.Corner ? p.SofaCorner * k : 0)
                      + (it.Arm is "round" or "low" ? p.SofaArms * k : 0)
                      + it.Pillows * p.Pillow,
            "armchair" => p.Armchair * k + it.Pillows * p.Pillow,
            "chair" => it.Count * (p.ChairSeat + (it.Back ? p.ChairBack : 0)),
            "mattress" => p.MattressPrice(it.Size) * (it.Sides == 2 ? 1 + p.MattressSecond / 100 : 1),
            "carpet" => it.W * it.L * (it.Pile == "long" ? p.CarpetLong : p.CarpetShort),
            _ => 0,
        };

        if (it.Stains) sum += p.Stains;
        if (it.Odor) sum += p.Odor;
        if (it.Fur) sum += p.Fur;

        return Math.Round(sum, 0, MidpointRounding.AwayFromZero);
    }

    public static string? Validate(OrderItem it) => it switch
    {
        _ when !Types.Contains(it.Type) => $"unknown type '{it.Type}'",
        { Type: "sofa", Seats: < 2 or > 4 } => "sofa seats must be 2..4",
        { Type: "chair", Count: < 1 or > 40 } => "chair count must be 1..40",
        { Type: "mattress", Size: not ("90" or "140" or "160" or "180") } => "unknown mattress size",
        { Type: "carpet" } when it.W is <= 0 or > 10 || it.L is <= 0 or > 15 => "carpet size out of range",
        { Pillows: < 0 or > 6 } => "too many pillows",
        _ => null,
    };
}
