using ISA95DataGenerator.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ISA95DataGenerator.Infrastructure.Data;

public class MigrationDbContext : DbContext
{
    public MigrationDbContext(DbContextOptions<MigrationDbContext> options) : base(options)
    {
    }

    public DbSet<MigrationSession> MigrationSessions { get; set; }
    public DbSet<SourceDataTable> SourceDataTables { get; set; }
    public DbSet<EntityMapping> EntityMappings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure MigrationSession
        modelBuilder.Entity<MigrationSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
        });

        // Configure SourceDataTable
        modelBuilder.Entity<SourceDataTable>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TableName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.FilePath).IsRequired();
            entity.HasIndex(e => e.MigrationSessionId);
            
            entity.HasOne(e => e.MigrationSession)
                .WithMany(m => m.SourceTables)
                .HasForeignKey(e => e.MigrationSessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure EntityMapping
        modelBuilder.Entity<EntityMapping>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.SourceTable).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.MigrationSessionId);
            
            entity.HasOne(e => e.MigrationSession)
                .WithMany(m => m.EntityMappings)
                .HasForeignKey(e => e.MigrationSessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
