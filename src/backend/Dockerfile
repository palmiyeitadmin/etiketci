FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY Plms.Api/*.csproj ./Plms.Api/
RUN dotnet restore ./Plms.Api/Plms.Api.csproj

# Copy everything else and build app
COPY Plms.Api/. ./Plms.Api/
WORKDIR /app/Plms.Api
RUN dotnet publish -c Release -o out

# Final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/Plms.Api/out ./
ENTRYPOINT ["dotnet", "Plms.Api.dll"]
