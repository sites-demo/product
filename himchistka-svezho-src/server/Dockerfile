FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Svezho.Api/Svezho.Api.csproj Svezho.Api/
RUN dotnet restore Svezho.Api/Svezho.Api.csproj
COPY Svezho.Api/ Svezho.Api/
RUN dotnet publish Svezho.Api/Svezho.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
VOLUME /app/data
EXPOSE 8080
ENTRYPOINT ["dotnet", "Svezho.Api.dll"]
