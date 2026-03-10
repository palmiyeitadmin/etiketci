using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Data;
using Plms.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Configuration variables
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

// 2. Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<IProductImportService, ProductImportService>();
builder.Services.AddScoped<ILabelRenderService, LabelRenderService>();
builder.Services.AddScoped<IVariableResolutionService, VariableResolutionService>();
builder.Services.AddScoped<IPreviewReadinessService, PreviewReadinessService>();

// EF Core
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// QuestPDF setup (License configuration is mandatory for QuestPDF 2022.12.x and above)
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("StrictCorsPolicy", policy =>
    {
        var frontendUrl = builder.Configuration["FrontendUrl"] ?? "http://localhost:3000";
        policy.WithOrigins(frontendUrl)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Authentication placeholders (Entra ID)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://login.microsoftonline.com/{builder.Configuration["AzureAd:TenantId"]}/v2.0";
        options.Audience = builder.Configuration["AzureAd:ClientId"];
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            RoleClaimType = "roles",
            NameClaimType = "preferred_username"
        };
    });

// Authorization (RBAC Policies)
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdmin", policy => policy.RequireRole("Admin"));
    options.AddPolicy("RequireOperator", policy => policy.RequireRole("Operator", "Admin"));
    options.AddPolicy("RequireReviewer", policy => policy.RequireRole("Reviewer", "Admin"));
    options.AddPolicy("RequireViewer", policy => policy.RequireRole("Viewer", "Operator", "Reviewer", "Admin"));
});

var app = builder.Build();

// 3. Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Add strict CORS
app.UseCors("StrictCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => new { Status = "Healthy", Version = "1.0.0" })
   .WithName("GetHealth")
   .WithOpenApi();

app.Run();
