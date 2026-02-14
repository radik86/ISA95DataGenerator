using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Equipment Class Property - defines property types at the class level
/// Matches IndexedDB EquipmentClassPropertyRecord
/// </summary>
public class EquipmentClassProperty
{
    public string Id { get; set; } = string.Empty;
    public string EquipmentClassId { get; set; } = string.Empty;
    public string PropertyName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ValueDataType { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string? MinValue { get; set; }
    public string? MaxValue { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public EquipmentClass? EquipmentClass { get; set; }
    public ICollection<EquipmentClassPropertyAssignment> Assignments { get; set; } = new List<EquipmentClassPropertyAssignment>();
}
