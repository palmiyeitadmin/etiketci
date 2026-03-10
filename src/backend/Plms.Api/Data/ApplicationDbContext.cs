using Microsoft.EntityFrameworkCore;
using Plms.Api.Domain.Entities;

namespace Plms.Api.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Vendor> Vendors { get; set; }
        public DbSet<ProductCategory> ProductCategories { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<LabelTemplate> Templates { get; set; }
        public DbSet<LabelTemplateVersion> TemplateVersions { get; set; }
        public DbSet<ProductTemplate> ProductTemplates { get; set; }
        public DbSet<PrintIntent> PrintIntents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Action).IsRequired().HasMaxLength(100);
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
