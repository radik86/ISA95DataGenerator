using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Equipment - a specific piece of equipment
/// Matches IndexedDB EquipmentRecord
/// </summary>
public class Equipment
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProductionLineId { get; set; }
    public string? ParentEquipmentId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastDataMigrationAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public EquipmentClass? EquipmentClass { get; set; }
    public Equipment? ParentEquipment { get; set; }
    public ICollection<Equipment> ChildEquipment { get; set; } = new List<Equipment>();
    public ICollection<EquipmentPropertyAssignment> PropertyAssignments { get; set; } = new List<EquipmentPropertyAssignment>();
}
