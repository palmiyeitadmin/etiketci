using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Plms.Api.Data;
using Plms.Api.Domain.Entities;
using Plms.Api.Security;
using Plms.Api.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
var seedAdminEmail = builder.Configuration["SeedAdmin:Email"] ?? "admin@plms.local";
var seedAdminPassword = builder.Configuration["SeedAdmin:Password"] ?? "Admin123!";
var defaultForceResetPassword = builder.Environment.IsDevelopment();
var forceResetPassword = builder.Configuration.GetValue<bool?>("SeedAdmin:ForceResetPassword") ?? defaultForceResetPassword;

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<IProductImportService, ProductImportService>();
builder.Services.AddScoped<ILabelRenderService, LabelRenderService>();
builder.Services.AddScoped<IVariableResolutionService, VariableResolutionService>();
builder.Services.AddScoped<IPreviewReadinessService, PreviewReadinessService>();
builder.Services.AddScoped<IFinalSafetyCheckService, FinalSafetyCheckService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IAssetStorageService, AssetStorageService>();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

builder.Services.AddCors(options =>
{
    options.AddPolicy("StrictCorsPolicy", policy =>
    {
        var frontendUrl = builder.Configuration["FrontendUrl"] ?? "http://192.168.0.99:3000";
        policy.WithOrigins(frontendUrl)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 8;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "PLMS_SUPER_SECRET_KEY_2026_DEVELOPMENT_ONLY";
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
});

builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdmin", policy => policy.RequireRole(ApplicationRoles.Admin));
    options.AddPolicy("RequireOperator", policy => policy.RequireAssertion(context =>
        context.User.IsInRole(ApplicationRoles.Admin) ||
        HasAnyPermission(context.User,
            Permissions.ProductsCreate,
            Permissions.ProductsEdit,
            Permissions.ProductsImport,
            Permissions.VendorsManage,
            Permissions.CategoriesManage,
            Permissions.TemplatesCreate,
            Permissions.TemplatesEdit,
            Permissions.TemplatesSubmitReview,
            Permissions.TemplatesRestore,
            Permissions.PrintIntentsCreate,
            Permissions.PrintIntentsHandoff,
            Permissions.PrintIntentsDispatch,
            Permissions.PrintIntentsConfirm,
            Permissions.PrintIntentsFail,
            Permissions.PrintIntentsCancel)));
    options.AddPolicy("RequireReviewer", policy => policy.RequireAssertion(context =>
        context.User.IsInRole(ApplicationRoles.Admin) ||
        HasAnyPermission(context.User, Permissions.TemplatesReview, Permissions.TemplatesPublish, Permissions.TemplatesRestore)));
    options.AddPolicy("RequireViewer", policy => policy.RequireAuthenticatedUser());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("StrictCorsPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/health", () => new { Status = "Healthy", Version = "1.0.0" })
   .WithName("GetHealth")
   .WithOpenApi();

using (var scope = app.Services.CreateScope())
{
    var serviceProvider = scope.ServiceProvider;
    var roleManager = serviceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
    var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var dbContext = serviceProvider.GetRequiredService<ApplicationDbContext>();

    await dbContext.Database.MigrateAsync();

    Console.WriteLine($"[SEED_DEBUG] Admin seed configuration loaded. Email: {seedAdminEmail}, ForceResetPassword: {forceResetPassword}");

    await EnsureRolesAndPermissionsAsync(roleManager, dbContext);
    await MigrateLegacyRolesAsync(roleManager, userManager, dbContext);
    await EnsureSeedAdminAsync(userManager, seedAdminEmail, seedAdminPassword, forceResetPassword);
    await EnsureSeedProductCategoriesAsync(dbContext);
}

app.Run();

static bool HasAnyPermission(System.Security.Claims.ClaimsPrincipal user, params string[] permissions)
{
    var granted = user.FindAll("permission").Select(claim => claim.Value).ToHashSet(StringComparer.OrdinalIgnoreCase);
    return permissions.Any(granted.Contains);
}

static async Task EnsureRolesAndPermissionsAsync(RoleManager<ApplicationRole> roleManager, ApplicationDbContext dbContext)
{
    await EnsureRoleAsync(roleManager, dbContext, ApplicationRoles.Admin, "Full administrative access across PLMS.", isSystem: true, isImmutable: true, PermissionCatalog.AdminPermissions);
    await EnsureRoleAsync(roleManager, dbContext, ApplicationRoles.Editor, "Operational editor access for product, template and print workflows.", isSystem: true, isImmutable: false, PermissionCatalog.EditorPermissions);
    await EnsureRoleAsync(roleManager, dbContext, ApplicationRoles.User, "Read-oriented access with preview visibility.", isSystem: true, isImmutable: false, PermissionCatalog.UserPermissions);
}

static async Task EnsureRoleAsync(
    RoleManager<ApplicationRole> roleManager,
    ApplicationDbContext dbContext,
    string roleName,
    string description,
    bool isSystem,
    bool isImmutable,
    IEnumerable<string> permissions)
{
    var role = await roleManager.FindByNameAsync(roleName);
    if (role == null)
    {
        role = new ApplicationRole
        {
            Name = roleName,
            NormalizedName = roleName.ToUpperInvariant(),
            Description = description,
            IsSystem = isSystem,
            IsImmutable = isImmutable,
            CreatedAt = DateTime.UtcNow
        };

        var createResult = await roleManager.CreateAsync(role);
        if (!createResult.Succeeded)
        {
            throw new InvalidOperationException($"Failed to create role '{roleName}': {string.Join(", ", createResult.Errors.Select(e => e.Description))}");
        }

        Console.WriteLine($"[SEED_DEBUG] Role '{roleName}' created.");
    }
    else
    {
        role.Description = description;
        role.IsSystem = isSystem;
        role.IsImmutable = isImmutable;
        await roleManager.UpdateAsync(role);
    }

    var expectedPermissions = permissions.Distinct(StringComparer.OrdinalIgnoreCase).ToHashSet(StringComparer.OrdinalIgnoreCase);
    var existingPermissions = await dbContext.RolePermissions.Where(rp => rp.RoleId == role.Id).ToListAsync();

    var toRemove = existingPermissions.Where(existing => !expectedPermissions.Contains(existing.PermissionKey)).ToList();
    if (toRemove.Count > 0)
    {
        dbContext.RolePermissions.RemoveRange(toRemove);
    }

    var existingKeys = existingPermissions.Select(existing => existing.PermissionKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
    foreach (var permission in expectedPermissions.Where(permission => !existingKeys.Contains(permission)))
    {
        dbContext.RolePermissions.Add(new RolePermission
        {
            Id = Guid.NewGuid(),
            RoleId = role.Id,
            PermissionKey = permission,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "System"
        });
    }

    await dbContext.SaveChangesAsync();
}

static async Task MigrateLegacyRolesAsync(RoleManager<ApplicationRole> roleManager, UserManager<ApplicationUser> userManager, ApplicationDbContext dbContext)
{
    var operatorRole = await roleManager.FindByNameAsync("Operator");
    var viewerRole = await roleManager.FindByNameAsync("Viewer");
    var reviewerRole = await roleManager.FindByNameAsync("Reviewer");

    if (reviewerRole != null)
    {
        await EnsureRoleAsync(roleManager, dbContext, ApplicationRoles.ApprovalReviewer, "Approval and publication reviewer permissions migrated from legacy Reviewer role.", isSystem: false, isImmutable: false, PermissionCatalog.ApprovalReviewerPermissions);
    }

    var users = await userManager.Users.ToListAsync();
    foreach (var user in users)
    {
        var roles = await userManager.GetRolesAsync(user);
        if (roles.Contains("Operator") && !roles.Contains(ApplicationRoles.Editor))
        {
            await userManager.AddToRoleAsync(user, ApplicationRoles.Editor);
        }

        if (roles.Contains("Viewer") && !roles.Contains(ApplicationRoles.User))
        {
            await userManager.AddToRoleAsync(user, ApplicationRoles.User);
        }

        if (roles.Contains("Reviewer") && !roles.Contains(ApplicationRoles.ApprovalReviewer))
        {
            await userManager.AddToRoleAsync(user, ApplicationRoles.ApprovalReviewer);
        }
    }

    foreach (var legacyRoleName in new[] { "Operator", "Viewer", "Reviewer" })
    {
        var legacyRole = await roleManager.FindByNameAsync(legacyRoleName);
        if (legacyRole == null)
        {
            continue;
        }

        var hasUsers = await dbContext.UserRoles.AnyAsync(userRole => userRole.RoleId == legacyRole.Id);
        if (hasUsers)
        {
            continue;
        }

        var existingRolePermissions = await dbContext.RolePermissions.Where(rolePermission => rolePermission.RoleId == legacyRole.Id).ToListAsync();
        if (existingRolePermissions.Count > 0)
        {
            dbContext.RolePermissions.RemoveRange(existingRolePermissions);
            await dbContext.SaveChangesAsync();
        }

        await roleManager.DeleteAsync(legacyRole);
        Console.WriteLine($"[SEED_DEBUG] Legacy role '{legacyRoleName}' removed after migration.");
    }
}

static async Task EnsureSeedAdminAsync(UserManager<ApplicationUser> userManager, string seedAdminEmail, string seedAdminPassword, bool forceResetPassword)
{
    var adminUser = await userManager.FindByEmailAsync(seedAdminEmail);
    if (adminUser == null)
    {
        Console.WriteLine($"[SEED_DEBUG] Admin user {seedAdminEmail} not found. Creating...");
        adminUser = new ApplicationUser
        {
            UserName = seedAdminEmail,
            Email = seedAdminEmail,
            FullName = "Initial Administrator",
            EmailConfirmed = true,
            IsActive = true,
            MustChangePassword = false,
            CreatedAt = DateTime.UtcNow
        };

        var createAdminResult = await userManager.CreateAsync(adminUser, seedAdminPassword);
        if (!createAdminResult.Succeeded)
        {
            throw new InvalidOperationException($"Failed to create admin user: {string.Join(", ", createAdminResult.Errors.Select(e => e.Description))}");
        }
    }

    adminUser.EmailConfirmed = true;
    adminUser.IsActive = true;
    adminUser.MustChangePassword = false;
    await userManager.UpdateAsync(adminUser);

    if (!await userManager.IsInRoleAsync(adminUser, ApplicationRoles.Admin))
    {
        await userManager.AddToRoleAsync(adminUser, ApplicationRoles.Admin);
    }

    if (forceResetPassword)
    {
        IdentityResult passwordResult;
        if (await userManager.HasPasswordAsync(adminUser))
        {
            var resetToken = await userManager.GeneratePasswordResetTokenAsync(adminUser);
            passwordResult = await userManager.ResetPasswordAsync(adminUser, resetToken, seedAdminPassword);
        }
        else
        {
            passwordResult = await userManager.AddPasswordAsync(adminUser, seedAdminPassword);
        }

        if (!passwordResult.Succeeded)
        {
            throw new InvalidOperationException($"Failed to enforce seed admin password: {string.Join(", ", passwordResult.Errors.Select(e => e.Description))}");
        }

        Console.WriteLine("[SEED_DEBUG] Admin password reset completed.");
    }
    else
    {
        Console.WriteLine("[SEED_DEBUG] SeedAdmin:ForceResetPassword is false. Password reset skipped.");
    }
}

static async Task EnsureSeedProductCategoriesAsync(ApplicationDbContext dbContext)
{
    if (await dbContext.ProductCategories.AnyAsync())
    {
        return;
    }

    Console.WriteLine("[SEED_DEBUG] Seeding initial Product Categories...");
    dbContext.ProductCategories.AddRange(new List<ProductCategory>
    {
        new() { Id = Guid.NewGuid(), Code = "LABEL", Name = "Common Labels", IsActive = true },
        new() { Id = Guid.NewGuid(), Code = "PACK", Name = "Packaging Materials", IsActive = true },
        new() { Id = Guid.NewGuid(), Code = "ASSET", Name = "Machinery Assets", IsActive = true }
    });
    await dbContext.SaveChangesAsync();
    Console.WriteLine("[SEED_DEBUG] Product Categories seeded.");
}
