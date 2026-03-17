using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Plms.Api.Domain.Entities;

namespace Plms.Api.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<ContentAsset> ContentAssets { get; set; }
        public DbSet<ImportSession> ImportSessions { get; set; }
        public DbSet<ImportSessionRowIssue> ImportSessionRowIssues { get; set; }
        public DbSet<Vendor> Vendors { get; set; }
        public DbSet<ProductCategory> ProductCategories { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<LabelTemplate> Templates { get; set; }
        public DbSet<LabelTemplateVersion> TemplateVersions { get; set; }
        public DbSet<TemplateRestorationRequest> TemplateRestorationRequests { get; set; }
        public DbSet<ProductTemplate> ProductTemplates { get; set; }
        public DbSet<PrintIntent> PrintIntents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Customize Identity tables if needed
            modelBuilder.Entity<ApplicationUser>(entity =>
            {
                entity.ToTable("Users");
                entity.Property(e => e.FullName).HasMaxLength(150);
                entity.Property(e => e.InvitedBy).HasMaxLength(150);
            });

            modelBuilder.Entity<ApplicationRole>(entity =>
            {
                entity.ToTable("Roles");
                entity.Property(e => e.Description).HasMaxLength(500);
            });

            modelBuilder.Entity<IdentityUserRole<Guid>>(entity =>
            {
                entity.ToTable("UserRoles");
            });

            modelBuilder.Entity<IdentityUserClaim<Guid>>(entity =>
            {
                entity.ToTable("UserClaims");
            });

            modelBuilder.Entity<IdentityUserLogin<Guid>>(entity =>
            {
                entity.ToTable("UserLogins");
            });

            modelBuilder.Entity<IdentityRoleClaim<Guid>>(entity =>
            {
                entity.ToTable("RoleClaims");
            });

            modelBuilder.Entity<RolePermission>(entity =>
            {
                entity.ToTable("RolePermissions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PermissionKey).IsRequired().HasMaxLength(150);
                entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(150);
                entity.HasIndex(e => new { e.RoleId, e.PermissionKey }).IsUnique();
                entity.HasOne(e => e.Role)
                    .WithMany()
                    .HasForeignKey(e => e.RoleId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ContentAsset>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Kind).IsRequired().HasMaxLength(50);
                entity.Property(e => e.MimeType).IsRequired().HasMaxLength(100);
                entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Sha256Hash).IsRequired().HasMaxLength(64);
                entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(150);
                entity.Property(e => e.UpdatedBy).HasMaxLength(150);
                entity.HasIndex(e => new { e.Sha256Hash, e.ByteSize }).IsUnique();
            });

            modelBuilder.Entity<IdentityUserToken<Guid>>(entity =>
            {
                entity.ToTable("UserTokens");
            });

            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Action).IsRequired().HasMaxLength(100);
            });

            modelBuilder.Entity<ImportSession>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(150);
                entity.Property(e => e.RowsJson).HasColumnType("jsonb");
                entity.HasMany(e => e.Issues)
                    .WithOne(i => i.ImportSession)
                    .HasForeignKey(i => i.ImportSessionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ImportSessionRowIssue>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Sku).HasMaxLength(100);
                entity.Property(e => e.ErrorType).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Message).IsRequired().HasMaxLength(1000);
            });

            modelBuilder.Entity<Vendor>()
                .HasIndex(v => v.Code)
                .IsUnique();

            modelBuilder.Entity<ProductCategory>()
                .HasIndex(c => c.Code)
                .IsUnique();

            modelBuilder.Entity<Product>()
                .HasIndex(p => p.Sku)
                .IsUnique();

            modelBuilder.Entity<LabelTemplate>()
                .HasIndex(t => t.Code)
                .IsUnique();

            modelBuilder.Entity<LabelTemplate>()
                .HasMany(t => t.Versions)
                .WithOne(v => v.Template)
                .HasForeignKey(v => v.TemplateId);

            modelBuilder.Entity<LabelTemplate>()
                .HasOne(t => t.CurrentActiveVersion)
                .WithMany()
                .HasForeignKey(t => t.CurrentActiveVersionId);

            modelBuilder.Entity<TemplateRestorationRequest>(entity =>
            {
                entity.HasKey(r => r.Id);
                entity.Property(r => r.BusinessJustification).IsRequired().HasMaxLength(2000);
                entity.Property(r => r.RequestedBy).IsRequired().HasMaxLength(150);
                entity.Property(r => r.TargetEnvironment).HasMaxLength(100);
                entity.Property(r => r.ReviewComments).HasMaxLength(2000);
                entity.Property(r => r.ReviewedBy).HasMaxLength(150);
                entity.HasOne(r => r.Template).WithMany().HasForeignKey(r => r.TemplateId);
                entity.HasOne(r => r.TemplateVersion).WithMany().HasForeignKey(r => r.TemplateVersionId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(r => r.RestoredVersion).WithMany().HasForeignKey(r => r.RestoredVersionId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ProductTemplate>(entity =>
            {
                entity.HasKey(pt => pt.Id);
                entity.HasOne(pt => pt.Product).WithMany().HasForeignKey(pt => pt.ProductId);
                entity.HasOne(pt => pt.Template).WithMany().HasForeignKey(pt => pt.TemplateId);
            });

            modelBuilder.Entity<PrintIntent>(entity =>
            {
                entity.HasKey(pi => pi.Id);
                entity.HasOne(pi => pi.Product).WithMany().HasForeignKey(pi => pi.ProductId);
                entity.HasOne(pi => pi.Template).WithMany().HasForeignKey(pi => pi.TemplateId);
                entity.HasOne(pi => pi.Version).WithMany().HasForeignKey(pi => pi.VersionId);
            });
        }
    }
}
