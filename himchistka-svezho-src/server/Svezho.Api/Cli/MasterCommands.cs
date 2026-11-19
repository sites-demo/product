using Microsoft.EntityFrameworkCore;
using Svezho.Api.Data;
using Svezho.Api.Services;

namespace Svezho.Api.Cli;

public static class MasterCommands
{
    private const string Usage = """
        master add <slug> <name> <phone> <pin>
        master pin <slug> <pin>
        master telegram <slug> <chat-id>
        master list
        """;

    public static async Task<int> RunAsync(IServiceProvider services, string[] args)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        await db.Database.MigrateAsync();

        switch (args)
        {
            case ["add", var slug, var name, var phone, var pin]:
                db.Masters.Add(new Master { Slug = slug, Name = name, Phone = phone, PinHash = PinHasher.Hash(pin) });
                await db.SaveChangesAsync();
                Console.WriteLine($"added {slug}");
                return 0;

            case ["pin", var slug, var pin]:
                return await Update(db, slug, m => m.PinHash = PinHasher.Hash(pin));

            case ["telegram", var slug, var chat] when long.TryParse(chat, out var chatId):
                return await Update(db, slug, m => m.TelegramChatId = chatId);

            case ["list"]:
                foreach (var m in await db.Masters.AsNoTracking().OrderBy(m => m.Id).ToListAsync())
                    Console.WriteLine($"{m.Slug,-20} {m.Name,-20} {m.Phone,-18} tg:{m.TelegramChatId?.ToString() ?? "-"}");
                return 0;

            default:
                Console.WriteLine(Usage);
                return 1;
        }
    }

    private static async Task<int> Update(AppDb db, string slug, Action<Master> change)
    {
        var master = await db.Masters.FirstOrDefaultAsync(m => m.Slug == slug);
        if (master is null)
        {
            Console.WriteLine($"master '{slug}' not found");
            return 1;
        }

        change(master);
        await db.SaveChangesAsync();
        Console.WriteLine("ok");
        return 0;
    }
}
