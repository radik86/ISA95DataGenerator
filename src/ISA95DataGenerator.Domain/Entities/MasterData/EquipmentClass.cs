using System;

namespace ISA95DataGenerator.Domain.Entities.MasterData;

/// <summary>
/// Equipment Class - categorizes equipment types (e.g., Mixer, Oven)
/// Matches IndexedDB EquipmentClassRecord
/// </summary>
public class EquipmentClass
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ParentId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int Version { get; set; }

    // Navigation properties
    public EquipmentClass? Parent { get; set; }
    public ICollection<EquipmentClass> Children { get; set; } = new List<EquipmentClass>();
    public ICollection<Equipment> Equipment { get; set; } = new List<Equipment>();
    public ICollection<EquipmentClassProperty> Properties { get; set; } = new List<EquipmentClassProperty>();
}
