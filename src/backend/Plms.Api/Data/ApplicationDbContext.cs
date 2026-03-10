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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Action).IsRequired().HasMaxLength(100);
            });
        }
    }
}
