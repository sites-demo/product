using System.Threading.Channels;

namespace Svezho.Api.Services;

public record TelegramMessage(long ChatId, string Text);

public class TelegramQueue
{
    private readonly Channel<TelegramMessage> _channel = Channel.CreateBounded<TelegramMessage>(500);

    public void Enqueue(TelegramMessage message) => _channel.Writer.TryWrite(message);

    public IAsyncEnumerable<TelegramMessage> ReadAllAsync(CancellationToken ct) => _channel.Reader.ReadAllAsync(ct);
}

public class TelegramNotifier(TelegramQueue queue, IHttpClientFactory http, IConfiguration config, ILogger<TelegramNotifier> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var token = config["Telegram:BotToken"];

        await foreach (var msg in queue.ReadAllAsync(ct))
        {
            if (string.IsNullOrEmpty(token)) continue;

            try
            {
                var client = http.CreateClient("telegram");
                var res = await client.PostAsJsonAsync($"bot{token}/sendMessage", new
                {
                    chat_id = msg.ChatId,
                    text = msg.Text,
                    parse_mode = "HTML",
                    disable_web_page_preview = true,
                }, ct);

                if (!res.IsSuccessStatusCode)
                    log.LogWarning("Telegram returned {Status} for chat {Chat}", res.StatusCode, msg.ChatId);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogWarning(ex, "Telegram send failed for chat {Chat}", msg.ChatId);
            }
        }
    }
}
