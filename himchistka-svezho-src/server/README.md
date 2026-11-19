# Svezho API

ASP.NET Core 8, EF Core, SQLite.

## Запуск

```bash
cd Svezho.Api
dotnet run                                   # http://localhost:5080
dotnet run -- master add svezho "Дмитрий" "+7 900 123-45-67" 1234
dotnet run -- master telegram svezho 123456789
dotnet run -- master list
```

База и фото лежат в `data/`. Миграции применяются при старте.

## Настройки

| Ключ | Что это |
|---|---|
| `ConnectionStrings:Default` | строка SQLite |
| `Jwt:Key` | секрет для токенов кабинета, от 32 символов |
| `Telegram:BotToken` | бот для уведомлений о заявках, можно пусто |
| `Storage:Path` | папка для фото |
| `Cors:Origins` | адреса фронта |

В проде задаются через переменные окружения: `Jwt__Key`, `Telegram__BotToken`, `Cors__Origins__0`.

## API

| Метод | Путь | Доступ |
|---|---|---|
| POST | `/api/masters/{slug}/login` | все |
| GET | `/api/masters/{slug}/prices` | все |
| PUT | `/api/masters/{slug}/prices` | мастер |
| POST | `/api/masters/{slug}/requests` | все, multipart: `data` + `photos` |
| GET | `/api/masters/{slug}/requests` | мастер |
| PATCH | `/api/masters/{slug}/requests/{id}` | мастер |
| GET | `/api/masters/{slug}/requests/{id}/photos/{photoId}` | мастер |
| POST | `/api/masters/{slug}/requests/{id}/game` | все, отметка «клиент прошёл игру», 3 часа после заявки |
| GET | `/api/masters/{slug}/settings` | все |
| PUT | `/api/masters/{slug}/settings` | мастер: `gameEnabled`, `gameReward` |

Игра после заявки выключена по умолчанию, мастер включает её в кабинете. Подарок копируется в заявку в момент прохождения, чтобы смена текста не меняла старые обещания.

Итог заявки пересчитывается на сервере по прайсу мастера (`Pricing/PriceCalculator.cs`), цена из браузера хранится отдельно как `ClientTotal`.

## Docker

```bash
docker build -t svezho-api .
docker run -d -p 8080:8080 -v /srv/svezho:/app/data -e Jwt__Key=... svezho-api
```

## Postgres

Поменять пакет на `Npgsql.EntityFrameworkCore.PostgreSQL`, `UseSqlite` на `UseNpgsql`, пересоздать миграции.
