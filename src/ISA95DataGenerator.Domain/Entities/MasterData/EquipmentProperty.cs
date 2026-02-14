using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Equipment Property - defines property types for equipment
/// Matches IndexedDB EquipmentPropertyRecord
/// </summary>
public class EquipmentProperty
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ValueDataType { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string? MinValue { get; set; }
    public string? MaxValue { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public ICollection<EquipmentPropertyAssignment> Assignments { get; set; } = new List<EquipmentPropertyAssignment>();
}
