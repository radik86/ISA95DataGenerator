using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Process Segment - a step in the production process
/// Matches IndexedDB ProcessSegmentRecord
/// </summary>
public class ProcessSegment
{
    public string Id { get; set; } = string.Empty;
    public string ProductMaterialId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Sequence { get; set; }
    public decimal DurationHours { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ICollection<SegmentBOM> SegmentBOMs { get; set; } = new List<SegmentBOM>();
    public ICollection<MaintenanceBOM> MaintenanceBOMs { get; set; } = new List<MaintenanceBOM>();
    public ICollection<EquipmentUsage> EquipmentUsages { get; set; } = new List<EquipmentUsage>();
    public ICollection<EquipmentPropertyAssignment> PropertyAssignments { get; set; } = new List<EquipmentPropertyAssignment>();
}
