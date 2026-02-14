using ISA95DataGenerator.Domain.Entities;
using ISA95DataGenerator.Domain.Entities.MasterData;
using Microsoft.EntityFrameworkCore;

namespace ISA95DataGenerator.Infrastructure.Data;

public class MigrationDbContext : DbContext
{
    public MigrationDbContext(DbContextOptions<MigrationDbContext> options) : base(options)
    {
    }

    // Migration entities
    public DbSet<MigrationSession> MigrationSessions { get; set; }
    public DbSet<SourceDataTable> SourceDataTables { get; set; }
    public DbSet<EntityMapping> EntityMappings { get; set; }

    // Master Data entities
    public DbSet<MaterialClass> MaterialClasses { get; set; }
    public DbSet<Material> Materials { get; set; }
    public DbSet<MaterialLot> MaterialLots { get; set; }
    public DbSet<MaterialSublot> MaterialSublots { get; set; }
    public DbSet<MaterialDefinitionProperty> MaterialDefinitionProperties { get; set; }
    public DbSet<MaterialDefinitionPropertyAssignment> MaterialDefinitionPropertyAssignments { get; set; }
    public DbSet<EquipmentClass> EquipmentClasses { get; set; }
    public DbSet<Equipment> Equipments { get; set; }
    public DbSet<EquipmentProperty> EquipmentProperties { get; set; }
    public DbSet<EquipmentPropertyAssignment> EquipmentPropertyAssignments { get; set; }
    public DbSet<EquipmentClassProperty> EquipmentClassProperties { get; set; }
    public DbSet<EquipmentClassPropertyAssignment> EquipmentClassPropertyAssignments { get; set; }
    public DbSet<ProcessSegment> ProcessSegments { get; set; }
    public DbSet<SegmentBOM> SegmentBOMs { get; set; }
    public DbSet<EquipmentUsage> EquipmentUsages { get; set; }
    public DbSet<Plant> Plants { get; set; }
    public DbSet<ProductionLine> ProductionLines { get; set; }
    public DbSet<LineEquipment> LineEquipments { get; set; }
    public DbSet<Shift> Shifts { get; set; }
    public DbSet<Crew> Crews { get; set; }
    public DbSet<ShiftCrewAssignment> ShiftCrewAssignments { get; set; }
    public DbSet<OperationEventDefinition> OperationEventDefinitions { get; set; }
    public DbSet<OperationEventDefinitionProperty> OperationEventDefinitionProperties { get; set; }
    public DbSet<OperationEventDefinitionPropertyAssignment> OperationEventDefinitionPropertyAssignments { get; set; }
    public DbSet<OperationEventDefSegmentAssignment> OperationEventDefSegmentAssignments { get; set; }
    public DbSet<OperationsEventClass> OperationsEventClasses { get; set; }
    public DbSet<OperationsEventRecord> OperationsEventRecords { get; set; }
    public DbSet<OperationsEventEntry> OperationsEventEntries { get; set; }
    public DbSet<HierarchyScope> HierarchyScopes { get; set; }
    public DbSet<HierarchyScopeFlat> HierarchyScopesFlat { get; set; }
    public DbSet<HierarchyScopeParentChild> HierarchyScopeParentChilds { get; set; }

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

        // ============================================
        // MASTER DATA ENTITIES CONFIGURATION
        // ============================================

        // MaterialClass
        modelBuilder.Entity<MaterialClass>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.Name);
        });

        // Material
        modelBuilder.Entity<Material>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ClassId).HasMaxLength(100);
            entity.Property(e => e.ClassName).HasMaxLength(200);
            entity.Property(e => e.DefaultUoM).HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.ClassId);
            entity.HasIndex(e => e.Name);
            entity.HasOne(e => e.MaterialClass)
                .WithMany(mc => mc.Materials)
                .HasForeignKey(e => e.ClassId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // MaterialLot
        modelBuilder.Entity<MaterialLot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.MaterialId).HasMaxLength(100);
            entity.Property(e => e.LotQuantity).HasPrecision(18, 4);
            entity.Property(e => e.LotUoM).HasMaxLength(50);
            entity.Property(e => e.ReceivedDateTime).HasMaxLength(50);
            entity.Property(e => e.ProducedDateTime).HasMaxLength(50);
            entity.Property(e => e.SupplierOrProducerId).HasMaxLength(100);
            entity.Property(e => e.SupplierOrProducerName).HasMaxLength(200);
            entity.Property(e => e.ProducedByProcessSegmentId).HasMaxLength(100);
            entity.Property(e => e.ParentLotId).HasMaxLength(100);
            entity.HasIndex(e => e.MaterialId);
            entity.HasOne(e => e.Material)
                .WithMany(m => m.MaterialLots)
                .HasForeignKey(e => e.MaterialId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // MaterialSublot
        modelBuilder.Entity<MaterialSublot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.MaterialLotId).HasMaxLength(100);
            entity.Property(e => e.Quantity).HasPrecision(18, 4);
            entity.Property(e => e.QuantityUnitOfMeasure).HasMaxLength(50);
            entity.Property(e => e.StorageLocation).HasMaxLength(200);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.Disposition).HasMaxLength(100);
            entity.HasIndex(e => e.MaterialLotId);
            entity.HasOne(e => e.MaterialLot)
                .WithMany(ml => ml.MaterialSublots)
                .HasForeignKey(e => e.MaterialLotId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // MaterialDefinitionProperty
        modelBuilder.Entity<MaterialDefinitionProperty>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.Value).HasMaxLength(500);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.ValueUnitOfMeasure).HasMaxLength(50);
        });

        // MaterialDefinitionPropertyAssignment
        modelBuilder.Entity<MaterialDefinitionPropertyAssignment>(entity =>
        {
            entity.HasKey(e => e.Pk);
            entity.Property(e => e.Pk).HasMaxLength(100);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.MaterialDefinitionPropertyId).HasMaxLength(100);
            entity.Property(e => e.MaterialDefinitionId).HasMaxLength(100);
            entity.Property(e => e.Value).HasMaxLength(500);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.ValueUnitOfMeasure).HasMaxLength(50);
            entity.HasIndex(e => e.MaterialDefinitionId);
            entity.HasIndex(e => e.MaterialDefinitionPropertyId);
        });

        // EquipmentClass
        modelBuilder.Entity<EquipmentClass>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.ParentId).HasMaxLength(100);
            entity.HasIndex(e => e.Name);
            entity.HasOne(e => e.Parent)
                .WithMany(p => p.Children)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // Equipment
        modelBuilder.Entity<Equipment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ClassId).HasMaxLength(100);
            entity.Property(e => e.ClassName).HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.ProductionLineId).HasMaxLength(100);
            entity.Property(e => e.ParentEquipmentId).HasMaxLength(100);
            entity.HasIndex(e => e.ClassId);
            entity.HasIndex(e => e.Name);
            entity.HasOne(e => e.EquipmentClass)
                .WithMany(ec => ec.Equipment)
                .HasForeignKey(e => e.ClassId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.ParentEquipment)
                .WithMany(p => p.ChildEquipment)
                .HasForeignKey(e => e.ParentEquipmentId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // EquipmentProperty
        modelBuilder.Entity<EquipmentProperty>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.ValueDataType).HasMaxLength(50);
            entity.Property(e => e.Unit).HasMaxLength(50);
            entity.Property(e => e.MinValue).HasMaxLength(100);
            entity.Property(e => e.MaxValue).HasMaxLength(100);
        });

        // EquipmentPropertyAssignment
        modelBuilder.Entity<EquipmentPropertyAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.EquipmentId).HasMaxLength(100);
            entity.Property(e => e.ProcessSegmentId).HasMaxLength(100);
            entity.Property(e => e.EquipmentPropertyId).HasMaxLength(100);
            entity.Property(e => e.SamplingMode).HasMaxLength(50);
            entity.HasIndex(e => e.EquipmentId);
            entity.HasIndex(e => e.ProcessSegmentId);
        });

        // EquipmentClassProperty
        modelBuilder.Entity<EquipmentClassProperty>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.EquipmentClassId).HasMaxLength(100);
            entity.Property(e => e.PropertyName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.ValueDataType).HasMaxLength(50);
            entity.Property(e => e.Unit).HasMaxLength(50);
            entity.Property(e => e.MinValue).HasMaxLength(100);
            entity.Property(e => e.MaxValue).HasMaxLength(100);
            entity.HasIndex(e => e.EquipmentClassId);
            entity.HasOne(e => e.EquipmentClass)
                .WithMany(ec => ec.Properties)
                .HasForeignKey(e => e.EquipmentClassId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // EquipmentClassPropertyAssignment
        modelBuilder.Entity<EquipmentClassPropertyAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(200);
            entity.Property(e => e.EquipmentClassPropertyId).HasMaxLength(100);
            entity.Property(e => e.EquipmentPropertyId).HasMaxLength(100);
            entity.HasIndex(e => e.EquipmentClassPropertyId);
            entity.HasIndex(e => e.EquipmentPropertyId);
        });

        // ProcessSegment
        modelBuilder.Entity<ProcessSegment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.ProductMaterialId).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.DurationHours).HasPrecision(18, 4);
            entity.HasIndex(e => e.ProductMaterialId);
            entity.HasIndex(e => e.Name);
        });

        // SegmentBOM
        modelBuilder.Entity<SegmentBOM>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.ProcessSegmentId).HasMaxLength(100);
            entity.Property(e => e.MaterialId).HasMaxLength(100);
            entity.Property(e => e.QtyPerUnit).HasPrecision(18, 4);
            entity.Property(e => e.Uom).HasMaxLength(50);
            entity.HasIndex(e => e.ProcessSegmentId);
            entity.HasIndex(e => e.MaterialId);
            entity.HasOne(e => e.ProcessSegment)
                .WithMany(ps => ps.SegmentBOMs)
                .HasForeignKey(e => e.ProcessSegmentId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // EquipmentUsage
        modelBuilder.Entity<EquipmentUsage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.ProcessSegmentId).HasMaxLength(100);
            entity.Property(e => e.EquipmentId).HasMaxLength(100);
            entity.Property(e => e.Role).HasMaxLength(100);
            entity.Property(e => e.CapacityPerRun).HasPrecision(18, 4);
            entity.HasIndex(e => e.ProcessSegmentId);
            entity.HasIndex(e => e.EquipmentId);
            entity.HasOne(e => e.ProcessSegment)
                .WithMany(ps => ps.EquipmentUsages)
                .HasForeignKey(e => e.ProcessSegmentId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // Plant
        modelBuilder.Entity<Plant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Location).HasMaxLength(500);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.Name);
        });

        // ProductionLine
        modelBuilder.Entity<ProductionLine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.PlantId).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.PlantId);
            entity.HasIndex(e => e.Name);
            entity.HasOne(e => e.Plant)
                .WithMany(p => p.ProductionLines)
                .HasForeignKey(e => e.PlantId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // LineEquipment
        modelBuilder.Entity<LineEquipment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.ProductionLineId).HasMaxLength(100);
            entity.Property(e => e.EquipmentId).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.PlantId).HasMaxLength(100);
            entity.HasIndex(e => e.ProductionLineId);
            entity.HasIndex(e => e.EquipmentId);
            entity.HasOne(e => e.ProductionLine)
                .WithMany(pl => pl.LineEquipments)
                .HasForeignKey(e => e.ProductionLineId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // Shift
        modelBuilder.Entity<Shift>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.ShiftName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.StartTime).HasMaxLength(20);
            entity.Property(e => e.EndTime).HasMaxLength(20);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.ShiftNumber);
        });

        // Crew
        modelBuilder.Entity<Crew>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.CrewName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Skills).HasMaxLength(500);
            entity.Property(e => e.Description).HasMaxLength(1000);
        });

        // ShiftCrewAssignment
        modelBuilder.Entity<ShiftCrewAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.ShiftId).HasMaxLength(100);
            entity.Property(e => e.CrewId).HasMaxLength(100);
            entity.Property(e => e.EffectiveDate).HasMaxLength(50);
            entity.Property(e => e.ExpiryDate).HasMaxLength(50);
            entity.HasIndex(e => e.ShiftId);
            entity.HasIndex(e => e.CrewId);
            entity.HasOne(e => e.Shift)
                .WithMany(s => s.ShiftCrewAssignments)
                .HasForeignKey(e => e.ShiftId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.Crew)
                .WithMany(c => c.ShiftCrewAssignments)
                .HasForeignKey(e => e.CrewId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // OperationEventDefinition
        modelBuilder.Entity<OperationEventDefinition>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.EventCategory).HasMaxLength(100);
            entity.Property(e => e.EventCode).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.RootCauseType).HasMaxLength(100);
            entity.Property(e => e.EventType).HasMaxLength(50);
            entity.HasIndex(e => e.EventCategory);
            entity.HasIndex(e => e.EventCode);
        });

        // OperationEventDefinitionProperty
        modelBuilder.Entity<OperationEventDefinitionProperty>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.PossibleValues).HasMaxLength(500);
            entity.Property(e => e.ValueUnitOfMeasure).HasMaxLength(50);
        });

        // OperationEventDefinitionPropertyAssignment
        modelBuilder.Entity<OperationEventDefinitionPropertyAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(200);
            entity.Property(e => e.OperationsEventDefinitionId).HasMaxLength(100);
            entity.Property(e => e.OperationsEventDefinitionPropertyId).HasMaxLength(100);
            entity.Property(e => e.Value).HasMaxLength(500);
            entity.Property(e => e.ValueUnitOfMeasure).HasMaxLength(50);
            entity.HasIndex(e => e.OperationsEventDefinitionId);
            entity.HasIndex(e => e.OperationsEventDefinitionPropertyId);
        });

        // OperationEventDefSegmentAssignment
        modelBuilder.Entity<OperationEventDefSegmentAssignment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.OperationsEventDefinitionId).HasMaxLength(100);
            entity.Property(e => e.ProcessSegmentId).HasMaxLength(100);
            entity.Property(e => e.StartOrEndEvent).HasMaxLength(20);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.HasIndex(e => e.OperationsEventDefinitionId);
            entity.HasIndex(e => e.ProcessSegmentId);
        });

        // OperationsEventClass
        modelBuilder.Entity<OperationsEventClass>(entity =>
        {
            entity.HasKey(e => e.OperationsEventClassID);
            entity.Property(e => e.OperationsEventClassID).HasMaxLength(100);
            entity.Property(e => e.ClassName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
        });

        // OperationsEventRecord
        modelBuilder.Entity<OperationsEventRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.OperationsEventRecordID).HasMaxLength(100);
            entity.Property(e => e.OperationsEventDefinitionID).HasMaxLength(100);
            entity.Property(e => e.Severity).HasMaxLength(50);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.Comments).HasMaxLength(1000);
            entity.HasIndex(e => e.OperationsEventDefinitionID);
        });

        // OperationsEventEntry
        modelBuilder.Entity<OperationsEventEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.OperationsEventEntryID).HasMaxLength(100);
            entity.Property(e => e.OperationsEventRecordID).HasMaxLength(100);
            entity.Property(e => e.EntryType).HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.OperationsEventRecordID);
            entity.HasOne(e => e.OperationsEventRecord)
                .WithMany(r => r.Entries)
                .HasForeignKey(e => e.OperationsEventRecordID)
                .HasPrincipalKey(r => r.Id)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // HierarchyScope
        modelBuilder.Entity<HierarchyScope>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.EquipmentID).HasMaxLength(100);
            entity.Property(e => e.EquipmentLevel).HasMaxLength(100);
            entity.HasIndex(e => e.EquipmentLevel);
            entity.HasIndex(e => e.EquipmentID);
        });

        // HierarchyScopeFlat
        modelBuilder.Entity<HierarchyScopeFlat>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.Enterprise).HasMaxLength(100);
            entity.Property(e => e.Site).HasMaxLength(100);
            entity.Property(e => e.Area).HasMaxLength(100);
            entity.Property(e => e.WorkCenter).HasMaxLength(100);
            entity.Property(e => e.WorkUnit).HasMaxLength(100);
            entity.Property(e => e.ProcessCell).HasMaxLength(100);
            entity.Property(e => e.Unit).HasMaxLength(100);
            entity.Property(e => e.ProductionLine).HasMaxLength(100);
            entity.Property(e => e.ProductionUnit).HasMaxLength(100);
            entity.Property(e => e.WorkCell).HasMaxLength(100);
            entity.Property(e => e.StorageZone).HasMaxLength(100);
            entity.Property(e => e.StorageUnit).HasMaxLength(100);
            entity.HasIndex(e => e.Enterprise);
            entity.HasIndex(e => e.Site);
        });

        // HierarchyScopeParentChild
        modelBuilder.Entity<HierarchyScopeParentChild>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(200);
            entity.Property(e => e.ParentEquipmentLevel).HasMaxLength(100);
            entity.Property(e => e.ParentEquipmentID).HasMaxLength(100);
            entity.Property(e => e.ChildEquipmentLevel).HasMaxLength(100);
            entity.Property(e => e.ChildEquipmentID).HasMaxLength(100);
            entity.HasIndex(e => e.ParentEquipmentID);
            entity.HasIndex(e => e.ChildEquipmentID);
        });
    }
}
