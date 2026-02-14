using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Equipment Class Property Assignment - links class properties to equipment properties
/// Matches IndexedDB EquipmentClassPropertyAssignmentRecord
/// </summary>
public class EquipmentClassPropertyAssignment
{
    public string Id { get; set; } = string.Empty;
    public string EquipmentClassPropertyId { get; set; } = string.Empty;
    public string EquipmentPropertyId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public EquipmentClassProperty? EquipmentClassProperty { get; set; }
    public EquipmentProperty? EquipmentProperty { get; set; }
}
